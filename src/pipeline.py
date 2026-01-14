"""
BoundaryAI Main Pipeline

Orchestrates the complete parcel detection and analysis workflow:
1. Load TIFF drone imagery (ORI)
2. Segment imagery using SAM (Segment Anything Model)
3. Convert masks to polygons
4. Match to ROR records
5. Calculate confidence scores
6. Output GeoDataFrame with parcels
"""

from pathlib import Path
from typing import Dict, List, Optional, Tuple, Union
from dataclasses import dataclass
from datetime import datetime
import json

import numpy as np
import geopandas as gpd
import pandas as pd
import cv2

from .image_loader import ORILoader, ImageTile
from .sam_segmenter import (
    SAMSegmenter,
    DetectedParcel,
    merge_overlapping_parcels,
    parcels_to_geodataframe,
    SAM_AVAILABLE
)
from .data_loader import RORLoader, ShapefileLoader
from .ror_engine import RORConstraintEngine, create_constraint_engine
from .confidence import ConfidenceScorer, ConflictDetector


@dataclass
class PipelineConfig:
    """Configuration for pipeline execution."""

    # Image loading
    tile_size: int = 1024
    tile_overlap: int = 128

    # SAM parameters
    sam_model: str = 'vit_b'  # 'vit_b', 'vit_l', 'vit_h'
    min_parcel_area_pixels: int = 500
    max_parcel_area_pixels: int = 1000000
    stability_threshold: float = 0.85
    iou_threshold: float = 0.80

    # Post-processing
    merge_overlap_threshold: float = 0.5
    simplify_tolerance: float = 2.0

    # Matching settings
    area_tolerance: float = 0.20


@dataclass
class PipelineResult:
    """Results from pipeline execution."""

    village_name: str
    parcels: gpd.GeoDataFrame
    statistics: Dict
    processing_time: float
    config: PipelineConfig


class BoundaryAIPipeline:
    """
    Main pipeline for parcel boundary detection from drone imagery.

    INPUT: TIFF drone image (ORI)
    PROCESS: SAM segmentation -> Polygon extraction -> ROR matching
    OUTPUT: GeoDataFrame with detected parcels
    """

    def __init__(self, config: Optional[PipelineConfig] = None):
        """
        Initialize pipeline.

        Args:
            config: Pipeline configuration
        """
        self.config = config or PipelineConfig()
        self.segmenter = None
        self._initialized = False

    def initialize(self):
        """Initialize SAM model (lazy loading to save memory)."""
        if self._initialized:
            return

        if not SAM_AVAILABLE:
            raise ImportError(
                "SAM not installed. Run: pip install segment-anything\n"
                "Also download checkpoint from: https://github.com/facebookresearch/segment-anything"
            )

        print("Initializing BoundaryAI Pipeline...")
        print(f"  SAM Model: {self.config.sam_model}")
        print(f"  Tile Size: {self.config.tile_size}")

        self.segmenter = SAMSegmenter(
            model_type=self.config.sam_model,
            min_area=self.config.min_parcel_area_pixels,
            max_area=self.config.max_parcel_area_pixels,
            stability_score_thresh=self.config.stability_threshold,
            pred_iou_thresh=self.config.iou_threshold,
        )

        self._initialized = True
        print("Pipeline initialized successfully")

    def process_image(
        self,
        image_path: str,
        ror_path: Optional[str] = None,
        village_name: str = "Village",
        max_tiles: Optional[int] = None,
        progress_callback=None
    ) -> PipelineResult:
        """
        Process a drone image to extract land parcels.

        Args:
            image_path: Path to TIFF image (ORI)
            ror_path: Optional path to ROR Excel file for matching
            village_name: Name of the village
            max_tiles: Maximum tiles to process (for testing)
            progress_callback: Optional callback(current, total, message)

        Returns:
            PipelineResult with detected parcels and statistics
        """
        start_time = datetime.now()

        # Initialize SAM if needed
        self.initialize()

        # Load image
        print(f"\n{'='*60}")
        print(f"Processing: {village_name}")
        print(f"{'='*60}")
        print(f"Loading image: {image_path}")

        loader = ORILoader(
            image_path,
            tile_size=self.config.tile_size,
            overlap=self.config.tile_overlap
        )

        metadata = loader.get_metadata()
        print(f"  Image size: {metadata['width']} x {metadata['height']} pixels")
        print(f"  Total tiles: {metadata['total_tiles']}")

        # Process tiles
        all_parcels = []
        tiles_processed = 0
        total_tiles = min(max_tiles, metadata['total_tiles']) if max_tiles else metadata['total_tiles']

        print(f"\nSegmenting with SAM...")
        for tile in loader.iter_tiles():
            if max_tiles and tiles_processed >= max_tiles:
                break

            tiles_processed += 1

            if progress_callback:
                progress_callback(tiles_processed, total_tiles, f"Tile {tile.tile_id}")

            print(f"\r  Processing tile {tiles_processed}/{total_tiles}...", end='', flush=True)

            # Run SAM segmentation on this tile
            masks = self.segmenter.segment_image(tile.data)

            # Convert masks to polygons with geo coordinates
            tile_parcels = self.segmenter.masks_to_polygons(
                masks,
                transform=tile.transform,
                simplify_tolerance=self.config.simplify_tolerance
            )

            all_parcels.extend(tile_parcels)

        print(f"\n  Raw parcels detected: {len(all_parcels)}")

        # Merge overlapping parcels from adjacent tiles
        print("Merging overlapping parcels...")
        merged_parcels = merge_overlapping_parcels(
            all_parcels,
            overlap_threshold=self.config.merge_overlap_threshold
        )
        print(f"  After merging: {len(merged_parcels)} parcels")

        # Convert to GeoDataFrame
        parcels_gdf = parcels_to_geodataframe(merged_parcels, crs=metadata['crs'])

        # Calculate areas
        parcels_gdf['area_sqm'] = parcels_gdf.geometry.area
        parcels_gdf['area_acres'] = parcels_gdf['area_sqm'] / 4046.86

        # Match to ROR if provided
        if ror_path and Path(ror_path).exists():
            print(f"\nMatching to ROR: {ror_path}")
            parcels_gdf = self._match_to_ror(parcels_gdf, ror_path)

        # Calculate processing time
        processing_time = (datetime.now() - start_time).total_seconds()

        # Calculate statistics
        stats = self._calculate_statistics(parcels_gdf, metadata, processing_time)

        print(f"\nProcessing complete in {processing_time:.1f} seconds")
        print(f"  Total parcels: {len(parcels_gdf)}")
        print(f"  Avg confidence: {parcels_gdf['confidence'].mean():.1%}")

        return PipelineResult(
            village_name=village_name,
            parcels=parcels_gdf,
            statistics=stats,
            processing_time=processing_time,
            config=self.config
        )

    def _match_to_ror(self, parcels_gdf: gpd.GeoDataFrame, ror_path: str) -> gpd.GeoDataFrame:
        """Match detected parcels to ROR records."""
        ror_loader = RORLoader(ror_path)
        ror_df = ror_loader.load()
        print(f"  Loaded {len(ror_df)} ROR records")

        # Create constraint engine and match
        engine = create_constraint_engine(ror_df)
        matched_gdf, match_results = engine.match_segments_to_ror(parcels_gdf)

        matched_count = matched_gdf['is_matched'].sum() if 'is_matched' in matched_gdf.columns else 0
        print(f"  Matched {matched_count} parcels to ROR")

        return matched_gdf

    def _calculate_statistics(
        self,
        parcels_gdf: gpd.GeoDataFrame,
        metadata: Dict,
        processing_time: float
    ) -> Dict:
        """Calculate summary statistics."""
        stats = {
            'image_path': metadata['path'],
            'image_width': metadata['width'],
            'image_height': metadata['height'],
            'tiles_processed': metadata['total_tiles'],
            'total_parcels': len(parcels_gdf),
            'total_area_sqm': float(parcels_gdf['area_sqm'].sum()),
            'avg_area_sqm': float(parcels_gdf['area_sqm'].mean()) if len(parcels_gdf) > 0 else 0,
            'avg_confidence': float(parcels_gdf['confidence'].mean()) if 'confidence' in parcels_gdf.columns else 0,
            'processing_time_seconds': processing_time,
        }

        # ROR matching stats
        if 'is_matched' in parcels_gdf.columns:
            stats['matched_to_ror'] = int(parcels_gdf['is_matched'].sum())
            stats['match_rate'] = float(parcels_gdf['is_matched'].mean())

        # Area mismatch stats
        if 'area_mismatch' in parcels_gdf.columns:
            matched = parcels_gdf[parcels_gdf['area_mismatch'].notna()]
            if len(matched) > 0:
                stats['avg_area_mismatch'] = float(matched['area_mismatch'].mean())
                stats['within_5pct'] = float((matched['area_mismatch'] <= 0.05).mean())
                stats['within_10pct'] = float((matched['area_mismatch'] <= 0.10).mean())

        # Confidence distribution
        if 'confidence' in parcels_gdf.columns:
            stats['high_confidence_count'] = int((parcels_gdf['confidence'] >= 0.85).sum())
            stats['medium_confidence_count'] = int(
                ((parcels_gdf['confidence'] >= 0.60) & (parcels_gdf['confidence'] < 0.85)).sum()
            )
            stats['low_confidence_count'] = int((parcels_gdf['confidence'] < 0.60).sum())

        return stats


def run_pipeline(
    image_path: str,
    ror_path: Optional[str] = None,
    village_name: str = "Village",
    output_dir: str = "output",
    sam_model: str = "vit_b",
    max_tiles: Optional[int] = None
) -> PipelineResult:
    """
    Convenience function to run the full pipeline.

    Args:
        image_path: Path to TIFF drone image
        ror_path: Optional path to ROR Excel
        village_name: Name of village
        output_dir: Output directory
        sam_model: SAM model variant
        max_tiles: Max tiles to process (for testing)

    Returns:
        PipelineResult
    """
    config = PipelineConfig(sam_model=sam_model)
    pipeline = BoundaryAIPipeline(config)

    result = pipeline.process_image(
        image_path=image_path,
        ror_path=ror_path,
        village_name=village_name,
        max_tiles=max_tiles
    )

    # Save results
    export_results(result, output_dir)

    return result


def export_results(
    result: PipelineResult,
    output_dir: str
) -> Dict[str, str]:
    """
    Export pipeline results to files.

    Args:
        result: Pipeline result
        output_dir: Output directory

    Returns:
        Dict mapping output type to file path
    """
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    outputs = {}
    name = result.village_name.replace(' ', '_')

    # Export parcels as GeoPackage
    gpkg_path = output_dir / f"{name}_parcels.gpkg"
    result.parcels.to_file(gpkg_path, driver='GPKG')
    outputs['geopackage'] = str(gpkg_path)
    print(f"Saved: {gpkg_path}")

    # Export parcels as GeoJSON
    geojson_path = output_dir / f"{name}_parcels.geojson"
    result.parcels.to_file(geojson_path, driver='GeoJSON')
    outputs['geojson'] = str(geojson_path)

    # Export statistics as JSON
    stats_path = output_dir / f"{name}_stats.json"
    with open(stats_path, 'w') as f:
        json.dump(result.statistics, f, indent=2)
    outputs['statistics'] = str(stats_path)

    return outputs


# CLI entry point
if __name__ == '__main__':
    import argparse

    parser = argparse.ArgumentParser(
        description='BoundaryAI - Land Parcel Extraction from Drone Imagery'
    )
    parser.add_argument('image', help='Path to TIFF drone image (ORI)')
    parser.add_argument('--ror', help='Path to ROR Excel file')
    parser.add_argument('--name', default='Village', help='Village name')
    parser.add_argument('--output', default='output', help='Output directory')
    parser.add_argument('--model', default='vit_b', choices=['vit_b', 'vit_l', 'vit_h'],
                        help='SAM model variant (vit_b=fastest, vit_h=best quality)')
    parser.add_argument('--max-tiles', type=int, help='Max tiles to process (for testing)')

    args = parser.parse_args()

    print("="*70)
    print("BoundaryAI - Land Parcel Extraction Pipeline")
    print("="*70)

    result = run_pipeline(
        image_path=args.image,
        ror_path=args.ror,
        village_name=args.name,
        output_dir=args.output,
        sam_model=args.model,
        max_tiles=args.max_tiles
    )

    print(f"\nResults saved to: {args.output}")

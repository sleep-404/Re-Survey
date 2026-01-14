"""
BoundaryAI Main Pipeline

Orchestrates the complete parcel detection and analysis workflow:
1. Load data (ORI, ROR, existing boundaries)
2. Segment imagery using SAM
3. Apply ROR constraints and match
4. Enforce topology
5. Calculate confidence scores
6. Route for review
"""

from pathlib import Path
from typing import Dict, List, Optional, Tuple, Union
from dataclasses import dataclass
import json

import numpy as np
import geopandas as gpd
import pandas as pd

from .data_loader import ORILoader, RORLoader, ShapefileLoader, VillageDataset
from .segmentation import ParcelSegmenter, TiledSegmenter, create_mock_segments
from .vectorization import TopologyEnforcer, BoundaryRefiner, merge_adjacent_segments
from .ror_engine import RORConstraintEngine, MatchResult
from .confidence import ConfidenceScorer, ConflictDetector
from .utils import get_routing_label, get_confidence_color


@dataclass
class PipelineConfig:
    """Configuration for pipeline execution."""

    # Segmentation settings
    use_mock_segments: bool = True  # Use mock segments for demo
    tile_size: int = 2048
    tile_overlap: int = 256
    min_segment_area: float = 50.0
    max_segment_area: float = 50000.0

    # Topology settings
    snap_tolerance: float = 0.1
    simplify_tolerance: float = 0.5

    # Matching settings
    area_tolerance: float = 0.20
    merge_similar: bool = True

    # Confidence settings
    high_confidence_threshold: float = 0.85
    medium_confidence_threshold: float = 0.60


@dataclass
class PipelineResult:
    """Results from pipeline execution."""

    village_name: str
    parcels: gpd.GeoDataFrame
    matches: List[MatchResult]
    conflicts: List[Dict]
    statistics: Dict
    routing_summary: Dict


class BoundaryAIPipeline:
    """
    Main pipeline for parcel boundary detection and analysis.
    """

    def __init__(self, config: Optional[PipelineConfig] = None):
        """
        Initialize pipeline.

        Args:
            config: Pipeline configuration
        """
        self.config = config or PipelineConfig()

        # Initialize components
        self.segmenter = ParcelSegmenter()
        self.tiled_segmenter = TiledSegmenter(
            tile_size=self.config.tile_size,
            overlap=self.config.tile_overlap,
            segmenter=self.segmenter
        )
        self.topology_enforcer = TopologyEnforcer(
            snap_tolerance=self.config.snap_tolerance,
            min_area=self.config.min_segment_area
        )
        self.boundary_refiner = BoundaryRefiner()
        self.confidence_scorer = ConfidenceScorer()
        self.conflict_detector = ConflictDetector()

    def process_village(
        self,
        village_name: str,
        ori_path: Optional[str] = None,
        ror_path: Optional[str] = None,
        shapefile_path: Optional[str] = None,
        progress_callback: Optional[callable] = None
    ) -> PipelineResult:
        """
        Process a complete village through the pipeline.

        Args:
            village_name: Name of the village
            ori_path: Path to ORI GeoTIFF
            ror_path: Path to ROR Excel file
            shapefile_path: Path to ground truth shapefile
            progress_callback: Optional callback(stage, progress)

        Returns:
            PipelineResult with all outputs
        """
        # Stage 1: Load data
        if progress_callback:
            progress_callback("loading", 0.0)

        ror_records = []
        if ror_path:
            ror_loader = RORLoader(ror_path)
            ror_records = ror_loader.get_parcel_constraints()

        ground_truth = None
        if shapefile_path:
            shp_loader = ShapefileLoader(shapefile_path)
            ground_truth = shp_loader.gdf

        # Stage 2: Segment imagery
        if progress_callback:
            progress_callback("segmenting", 0.2)

        if self.config.use_mock_segments and ground_truth is not None:
            # Use ground truth with slight perturbations for demo
            segments = self._create_demo_segments(ground_truth)
        elif ori_path:
            # Run actual segmentation
            segments = self._run_segmentation(ori_path, ror_records, progress_callback)
        elif ground_truth is not None:
            # Fall back to ground truth
            segments = ground_truth.copy()
        else:
            raise ValueError("Need either ORI path or shapefile path")

        # Stage 3: Apply ROR constraints
        if progress_callback:
            progress_callback("matching", 0.5)

        ror_engine = RORConstraintEngine(ror_records, area_tolerance=self.config.area_tolerance)
        matched_segments, matches = ror_engine.match_segments_to_ror(segments)

        # Stage 4: Enforce topology
        if progress_callback:
            progress_callback("topology", 0.7)

        clean_parcels = self.topology_enforcer.enforce_topology(matched_segments)

        # Stage 5: Calculate confidence scores
        if progress_callback:
            progress_callback("scoring", 0.8)

        scored_parcels = self.confidence_scorer.score_parcels(
            clean_parcels,
            ror_records=ror_records,
            expected_count=len(ror_records) if ror_records else len(clean_parcels)
        )

        # Stage 6: Detect conflicts
        conflicts = self.conflict_detector.detect_all_conflicts(scored_parcels, ror_records)

        # Stage 7: Calculate statistics
        if progress_callback:
            progress_callback("finalizing", 0.95)

        statistics = self._calculate_statistics(scored_parcels, matches, conflicts)
        routing_summary = self._calculate_routing_summary(scored_parcels)

        if progress_callback:
            progress_callback("complete", 1.0)

        return PipelineResult(
            village_name=village_name,
            parcels=scored_parcels,
            matches=matches,
            conflicts=conflicts,
            statistics=statistics,
            routing_summary=routing_summary
        )

    def _run_segmentation(
        self,
        ori_path: str,
        ror_records: List[Dict],
        progress_callback: Optional[callable] = None
    ) -> gpd.GeoDataFrame:
        """Run actual SAM segmentation."""
        def seg_progress(current, total):
            if progress_callback:
                progress_callback("segmenting", 0.2 + 0.3 * (current / total))

        # Use ROR-guided segmentation if records available
        if ror_records:
            segments = self.segmenter.segment_with_ror_hints(
                ori_path,
                ror_records,
                min_area_sqm=self.config.min_segment_area
            )
        else:
            segments = self.tiled_segmenter.segment_large_image(
                ori_path,
                min_area_sqm=self.config.min_segment_area,
                max_area_sqm=self.config.max_segment_area,
                progress_callback=seg_progress
            )

        return segments

    def _create_demo_segments(
        self,
        ground_truth: gpd.GeoDataFrame
    ) -> gpd.GeoDataFrame:
        """Create demo segments from ground truth with perturbations."""
        segments = ground_truth.copy()

        # Add slight noise to geometries to simulate AI detection
        def perturb_geometry(geom):
            if geom is None:
                return geom

            # Scale slightly (95-105%)
            scale = np.random.uniform(0.97, 1.03)
            centroid = geom.centroid

            try:
                # Translate to origin, scale, translate back
                from shapely.affinity import scale as shapely_scale
                perturbed = shapely_scale(geom, scale, scale, origin=centroid)
                return perturbed
            except:
                return geom

        segments['geometry'] = segments.geometry.apply(perturb_geometry)

        # Recalculate areas
        segments['area_sqm'] = segments.geometry.area

        # Add segment IDs if not present
        if 'segment_id' not in segments.columns:
            segments['segment_id'] = range(len(segments))

        return segments

    def _calculate_statistics(
        self,
        parcels: gpd.GeoDataFrame,
        matches: List[MatchResult],
        conflicts: List[Dict]
    ) -> Dict:
        """Calculate summary statistics."""
        stats = {
            'total_parcels': len(parcels),
            'total_area_sqm': float(parcels.geometry.area.sum()),
            'mean_area_sqm': float(parcels.geometry.area.mean()) if len(parcels) > 0 else 0,
            'median_area_sqm': float(parcels.geometry.area.median()) if len(parcels) > 0 else 0,
            'matched_parcels': sum(1 for m in matches if m.ror_record is not None),
            'unmatched_parcels': sum(1 for m in matches if m.ror_record is None),
            'total_conflicts': len(conflicts),
            'conflict_types': {}
        }

        # Count conflict types
        for conflict in conflicts:
            ctype = conflict.get('type', 'unknown')
            stats['conflict_types'][ctype] = stats['conflict_types'].get(ctype, 0) + 1

        # Confidence distribution
        if 'confidence' in parcels.columns:
            stats['mean_confidence'] = float(parcels['confidence'].mean())
            stats['high_confidence_count'] = int((parcels['confidence'] >= 0.85).sum())
            stats['medium_confidence_count'] = int(
                ((parcels['confidence'] >= 0.60) & (parcels['confidence'] < 0.85)).sum()
            )
            stats['low_confidence_count'] = int((parcels['confidence'] < 0.60).sum())

        return stats

    def _calculate_routing_summary(
        self,
        parcels: gpd.GeoDataFrame
    ) -> Dict:
        """Calculate routing summary."""
        if 'routing' not in parcels.columns:
            return {'AUTO_APPROVE': 0, 'DESKTOP_REVIEW': 0, 'FIELD_VERIFICATION': 0}

        return {
            'AUTO_APPROVE': int((parcels['routing'] == 'AUTO_APPROVE').sum()),
            'DESKTOP_REVIEW': int((parcels['routing'] == 'DESKTOP_REVIEW').sum()),
            'FIELD_VERIFICATION': int((parcels['routing'] == 'FIELD_VERIFICATION').sum())
        }


def run_demo_pipeline(
    shapefile_path: str,
    ror_path: Optional[str] = None,
    village_name: str = "Demo Village"
) -> PipelineResult:
    """
    Run demo pipeline with sample data.

    Args:
        shapefile_path: Path to ground truth shapefile
        ror_path: Optional path to ROR Excel
        village_name: Name of village

    Returns:
        PipelineResult
    """
    config = PipelineConfig(
        use_mock_segments=True,
        merge_similar=True
    )

    pipeline = BoundaryAIPipeline(config)

    result = pipeline.process_village(
        village_name=village_name,
        shapefile_path=shapefile_path,
        ror_path=ror_path
    )

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

    # Export parcels as shapefile
    parcel_path = output_dir / f"{result.village_name}_parcels.shp"
    result.parcels.to_file(parcel_path)
    outputs['parcels'] = str(parcel_path)

    # Export parcels as GeoJSON
    geojson_path = output_dir / f"{result.village_name}_parcels.geojson"
    result.parcels.to_file(geojson_path, driver='GeoJSON')
    outputs['geojson'] = str(geojson_path)

    # Export statistics as JSON
    stats_path = output_dir / f"{result.village_name}_stats.json"
    with open(stats_path, 'w') as f:
        json.dump(result.statistics, f, indent=2)
    outputs['statistics'] = str(stats_path)

    # Export conflicts as JSON
    conflicts_path = output_dir / f"{result.village_name}_conflicts.json"
    with open(conflicts_path, 'w') as f:
        json.dump(result.conflicts, f, indent=2, default=str)
    outputs['conflicts'] = str(conflicts_path)

    # Export routing summary
    routing_path = output_dir / f"{result.village_name}_routing.json"
    with open(routing_path, 'w') as f:
        json.dump(result.routing_summary, f, indent=2)
    outputs['routing'] = str(routing_path)

    return outputs

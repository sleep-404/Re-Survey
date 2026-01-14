"""
Segmentation Module for BoundaryAI

Uses Segment Anything Model (SAM) via segment-geospatial for parcel boundary detection.
"""

from pathlib import Path
from typing import Dict, List, Optional, Tuple, Union
import tempfile

import numpy as np
import geopandas as gpd
import rasterio
from rasterio.windows import Window
from shapely.geometry import Polygon, MultiPolygon, box
from shapely.ops import unary_union


class ParcelSegmenter:
    """
    Wrapper around SAM for land parcel segmentation.

    Uses segment-geospatial (SamGeo) for zero-shot segmentation
    of drone orthoimagery.
    """

    def __init__(
        self,
        model_type: str = "vit_h",
        checkpoint: Optional[str] = None,
        device: str = "auto"
    ):
        """
        Initialize the segmenter.

        Args:
            model_type: SAM model type ('vit_h', 'vit_l', 'vit_b')
            checkpoint: Path to model checkpoint (downloads if None)
            device: Device to use ('auto', 'cuda', 'cpu')
        """
        self.model_type = model_type
        self.checkpoint = checkpoint
        self.device = device
        self.sam = None
        self._initialized = False

    def _ensure_initialized(self):
        """Lazy initialization of SAM model."""
        if self._initialized:
            return

        try:
            from samgeo import SamGeo

            self.sam = SamGeo(
                model_type=self.model_type,
                checkpoint=self.checkpoint,
                automatic=True
            )
            self._initialized = True
        except ImportError:
            raise ImportError(
                "segment-geospatial not installed. "
                "Install with: pip install segment-geospatial"
            )
        except Exception as e:
            raise RuntimeError(f"Failed to initialize SAM: {e}")

    def segment_image(
        self,
        image_path: str,
        output_path: Optional[str] = None,
        batch_size: int = 4,
        min_area_sqm: float = 50.0,
        max_area_sqm: float = 50000.0,
        simplify_tolerance: float = 0.5
    ) -> gpd.GeoDataFrame:
        """
        Segment an orthoimagery file to detect parcel boundaries.

        Args:
            image_path: Path to GeoTIFF image
            output_path: Optional path to save output shapefile
            batch_size: Batch size for processing
            min_area_sqm: Minimum segment area to keep
            max_area_sqm: Maximum segment area to keep
            simplify_tolerance: Geometry simplification tolerance

        Returns:
            GeoDataFrame with detected segments
        """
        self._ensure_initialized()

        image_path = Path(image_path)
        if not image_path.exists():
            raise FileNotFoundError(f"Image not found: {image_path}")

        # Create temp output if not specified
        if output_path is None:
            output_path = tempfile.mktemp(suffix='.shp')

        # Run SAM segmentation
        self.sam.generate(
            str(image_path),
            output_path,
            batch=True,
            foreground=True,
            erosion_kernel=(3, 3),
            mask_multiplier=255
        )

        # Load and filter results
        if Path(output_path).exists():
            segments = gpd.read_file(output_path)
            segments = self._filter_segments(
                segments,
                min_area_sqm,
                max_area_sqm,
                simplify_tolerance
            )
            return segments
        else:
            # Return empty GeoDataFrame if no segments found
            return gpd.GeoDataFrame(
                columns=['geometry', 'area_sqm', 'segment_id'],
                geometry='geometry'
            )

    def segment_window(
        self,
        image_path: str,
        window: Window,
        min_area_sqm: float = 50.0,
        max_area_sqm: float = 50000.0
    ) -> gpd.GeoDataFrame:
        """
        Segment a specific window/tile of an image.

        Args:
            image_path: Path to GeoTIFF
            window: Rasterio Window defining the region
            min_area_sqm: Minimum segment area
            max_area_sqm: Maximum segment area

        Returns:
            GeoDataFrame with segments
        """
        self._ensure_initialized()

        # Read window and save as temp file
        with rasterio.open(image_path) as src:
            data = src.read(window=window)
            transform = src.window_transform(window)

            # Create temp file for window
            with tempfile.NamedTemporaryFile(suffix='.tif', delete=False) as tmp:
                tmp_path = tmp.name

            profile = src.profile.copy()
            profile.update(
                width=window.width,
                height=window.height,
                transform=transform
            )

            with rasterio.open(tmp_path, 'w', **profile) as dst:
                dst.write(data)

        # Segment the window
        segments = self.segment_image(
            tmp_path,
            min_area_sqm=min_area_sqm,
            max_area_sqm=max_area_sqm
        )

        # Clean up temp file
        Path(tmp_path).unlink(missing_ok=True)

        return segments

    def segment_with_ror_hints(
        self,
        image_path: str,
        ror_records: List[Dict],
        buffer_factor: float = 1.5,
        min_area_sqm: float = 50.0
    ) -> gpd.GeoDataFrame:
        """
        Segment image using ROR data as hints for expected parcel sizes.

        This is the key innovation: using ROR data to guide segmentation.

        Args:
            image_path: Path to GeoTIFF
            ror_records: List of ROR records with expected areas
            buffer_factor: Factor to expand expected area range
            min_area_sqm: Minimum area threshold

        Returns:
            GeoDataFrame with segments
        """
        self._ensure_initialized()

        # Calculate expected area range from ROR
        areas = [r.get('expected_area_sqm', 0) for r in ror_records if r.get('expected_area_sqm', 0) > 0]

        if areas:
            min_expected = min(areas) / buffer_factor
            max_expected = max(areas) * buffer_factor
        else:
            min_expected = min_area_sqm
            max_expected = 50000.0

        # Segment with ROR-informed thresholds
        segments = self.segment_image(
            image_path,
            min_area_sqm=max(min_area_sqm, min_expected),
            max_area_sqm=max_expected
        )

        return segments

    def _filter_segments(
        self,
        segments: gpd.GeoDataFrame,
        min_area: float,
        max_area: float,
        simplify_tolerance: float
    ) -> gpd.GeoDataFrame:
        """Filter and clean segments."""
        if len(segments) == 0:
            return segments

        # Calculate areas
        segments['area_sqm'] = segments.geometry.area

        # Filter by area
        segments = segments[
            (segments['area_sqm'] >= min_area) &
            (segments['area_sqm'] <= max_area)
        ].copy()

        # Simplify geometries
        if simplify_tolerance > 0:
            segments['geometry'] = segments.geometry.simplify(
                simplify_tolerance,
                preserve_topology=True
            )

        # Add segment IDs
        segments['segment_id'] = range(len(segments))

        # Reset index
        segments = segments.reset_index(drop=True)

        return segments


class TiledSegmenter:
    """
    Handles segmentation of large images by processing tiles.

    Necessary for large ORI files (2-3GB) that can't fit in memory.
    """

    def __init__(
        self,
        tile_size: int = 2048,
        overlap: int = 256,
        segmenter: Optional[ParcelSegmenter] = None
    ):
        """
        Initialize tiled segmenter.

        Args:
            tile_size: Size of each tile in pixels
            overlap: Overlap between adjacent tiles
            segmenter: ParcelSegmenter instance (creates new if None)
        """
        self.tile_size = tile_size
        self.overlap = overlap
        self.segmenter = segmenter or ParcelSegmenter()

    def segment_large_image(
        self,
        image_path: str,
        output_path: Optional[str] = None,
        min_area_sqm: float = 50.0,
        max_area_sqm: float = 50000.0,
        progress_callback: Optional[callable] = None
    ) -> gpd.GeoDataFrame:
        """
        Segment a large image using tiled processing.

        Args:
            image_path: Path to large GeoTIFF
            output_path: Optional path to save results
            min_area_sqm: Minimum segment area
            max_area_sqm: Maximum segment area
            progress_callback: Optional callback(current, total)

        Returns:
            Merged GeoDataFrame with all segments
        """
        with rasterio.open(image_path) as src:
            width = src.width
            height = src.height
            crs = src.crs

        # Calculate tiles
        tiles = self._generate_tiles(width, height)
        total_tiles = len(tiles)

        all_segments = []

        for i, (col_off, row_off, tile_w, tile_h) in enumerate(tiles):
            window = Window(col_off, row_off, tile_w, tile_h)

            # Segment this tile
            try:
                tile_segments = self.segmenter.segment_window(
                    image_path,
                    window,
                    min_area_sqm=min_area_sqm,
                    max_area_sqm=max_area_sqm
                )

                if len(tile_segments) > 0:
                    all_segments.append(tile_segments)

            except Exception as e:
                print(f"Warning: Failed to segment tile {i}: {e}")

            if progress_callback:
                progress_callback(i + 1, total_tiles)

        # Merge all segments
        if all_segments:
            merged = gpd.GeoDataFrame(
                pd.concat(all_segments, ignore_index=True),
                crs=crs
            )

            # Remove duplicates from overlapping regions
            merged = self._remove_duplicates(merged)

            # Save if output path provided
            if output_path:
                merged.to_file(output_path)

            return merged
        else:
            return gpd.GeoDataFrame(
                columns=['geometry', 'area_sqm', 'segment_id'],
                geometry='geometry',
                crs=crs
            )

    def _generate_tiles(
        self,
        width: int,
        height: int
    ) -> List[Tuple[int, int, int, int]]:
        """Generate tile coordinates with overlap."""
        tiles = []
        step = self.tile_size - self.overlap

        for row_off in range(0, height, step):
            for col_off in range(0, width, step):
                tile_w = min(self.tile_size, width - col_off)
                tile_h = min(self.tile_size, height - row_off)

                if tile_w > self.overlap and tile_h > self.overlap:
                    tiles.append((col_off, row_off, tile_w, tile_h))

        return tiles

    def _remove_duplicates(
        self,
        segments: gpd.GeoDataFrame,
        iou_threshold: float = 0.5
    ) -> gpd.GeoDataFrame:
        """Remove duplicate segments from tile overlaps."""
        if len(segments) <= 1:
            return segments

        # Use spatial index for efficiency
        sindex = segments.sindex

        keep_mask = np.ones(len(segments), dtype=bool)

        for i, row in segments.iterrows():
            if not keep_mask[i]:
                continue

            # Find potential overlaps
            possible_matches = list(sindex.intersection(row.geometry.bounds))

            for j in possible_matches:
                if j <= i or not keep_mask[j]:
                    continue

                # Calculate IoU
                intersection = row.geometry.intersection(segments.iloc[j].geometry).area
                union = row.geometry.union(segments.iloc[j].geometry).area

                if union > 0:
                    iou = intersection / union
                    if iou > iou_threshold:
                        # Keep the larger segment
                        if segments.iloc[j].geometry.area > row.geometry.area:
                            keep_mask[i] = False
                            break
                        else:
                            keep_mask[j] = False

        return segments[keep_mask].reset_index(drop=True)


# Add pandas import for concat
import pandas as pd


def create_mock_segments(
    bounds: Tuple[float, float, float, float],
    num_segments: int = 10,
    crs: str = "EPSG:32644"
) -> gpd.GeoDataFrame:
    """
    Create mock segments for testing without running actual SAM.

    Args:
        bounds: (minx, miny, maxx, maxy) in projected coordinates
        num_segments: Number of segments to create
        crs: Coordinate reference system

    Returns:
        GeoDataFrame with mock segments
    """
    minx, miny, maxx, maxy = bounds

    # Create grid of segments
    nx = int(np.sqrt(num_segments))
    ny = num_segments // nx

    dx = (maxx - minx) / nx
    dy = (maxy - miny) / ny

    segments = []
    segment_id = 0

    for i in range(nx):
        for j in range(ny):
            # Add some randomness to make it realistic
            x0 = minx + i * dx + np.random.uniform(0, dx * 0.1)
            y0 = miny + j * dy + np.random.uniform(0, dy * 0.1)
            x1 = x0 + dx * np.random.uniform(0.7, 0.95)
            y1 = y0 + dy * np.random.uniform(0.7, 0.95)

            poly = box(x0, y0, x1, y1)
            area = poly.area

            segments.append({
                'geometry': poly,
                'area_sqm': area,
                'segment_id': segment_id
            })
            segment_id += 1

    gdf = gpd.GeoDataFrame(segments, crs=crs)
    return gdf

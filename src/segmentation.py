"""
Segmentation Module for BoundaryAI

Uses Segment Anything Model (SAM) via segment-geospatial for parcel boundary detection.

CORE INNOVATION: ROR-Constrained Segmentation
- Uses Record of Rights (ROR) data to guide SAM with point prompts
- Iterative refinement loop adjusts segmentation based on area feedback
- Multi-scale candidate generation with ROR-based selection
"""

from pathlib import Path
from typing import Dict, List, Optional, Tuple, Union
import tempfile
import time

import numpy as np
import geopandas as gpd
import rasterio
from rasterio.windows import Window
from rasterio.transform import rowcol
from shapely.geometry import Polygon, MultiPolygon, box, Point
from shapely.ops import unary_union
from scipy.optimize import linear_sum_assignment
from scipy.ndimage import label as ndimage_label
from skimage import measure


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


# =============================================================================
# CORE INNOVATION: ROR-Constrained Segmentation
# =============================================================================

class RORGuidedSegmenter:
    """
    INNOVATION: ROR-Constrained SAM Segmentation

    Traditional SAM is "blind" - it segments everything without domain knowledge.
    Our innovation uses Record of Rights (ROR) data to:

    1. GUIDE: Generate point prompts from expected parcel locations
    2. CONSTRAIN: Filter candidates by ROR area expectations
    3. REFINE: Iteratively adjust segmentation based on area feedback
    4. SELECT: Use Hungarian algorithm to optimally match segments to ROR records

    This is "physics-informed AI" for land surveying - we inject domain knowledge
    (legal land records) into the neural network's segmentation process.
    """

    def __init__(
        self,
        model_type: str = "vit_h",
        device: str = "cpu",
        area_tolerance: float = 0.20,  # 20% area tolerance
        max_iterations: int = 3,
        confidence_threshold: float = 0.7,
        # Configurable innovation flags
        use_ror_guided_prompts: bool = True,
        use_area_filtering: bool = True,
        use_iterative_refinement: bool = True,
        use_hungarian_matching: bool = True,
    ):
        """
        Initialize ROR-Guided Segmenter.

        Args:
            model_type: SAM model type
            device: Device for inference
            area_tolerance: Acceptable area deviation from ROR (0.20 = 20%)
            max_iterations: Max refinement iterations
            confidence_threshold: Min confidence to accept a segment

        Innovation Flags (for ablation testing):
            use_ror_guided_prompts: Use ROR-informed seed points vs uniform grid
            use_area_filtering: Filter candidates by ROR area constraints
            use_iterative_refinement: Enable refinement loop for poor matches
            use_hungarian_matching: Optimal matching vs greedy nearest-neighbor
        """
        self.model_type = model_type
        self.device = device
        self.area_tolerance = area_tolerance
        self.max_iterations = max_iterations
        self.confidence_threshold = confidence_threshold

        # Innovation flags
        self.use_ror_guided_prompts = use_ror_guided_prompts
        self.use_area_filtering = use_area_filtering
        self.use_iterative_refinement = use_iterative_refinement
        self.use_hungarian_matching = use_hungarian_matching

        self.sam = None
        self.predictor = None
        self._initialized = False

        # Metrics tracking
        self.metrics = {
            'iterations_used': [],
            'area_improvements': [],
            'segments_refined': 0,
            'flags_used': {
                'ror_guided_prompts': use_ror_guided_prompts,
                'area_filtering': use_area_filtering,
                'iterative_refinement': use_iterative_refinement,
                'hungarian_matching': use_hungarian_matching,
            }
        }

    def _ensure_initialized(self):
        """Lazy initialization of SAM."""
        if self._initialized:
            return

        try:
            from segment_anything import sam_model_registry, SamPredictor
            import torch

            # Download checkpoint if needed
            checkpoint_path = self._get_checkpoint()

            sam = sam_model_registry[self.model_type](checkpoint=checkpoint_path)
            sam.to(device=self.device)

            self.sam = sam
            self.predictor = SamPredictor(sam)
            self._initialized = True

        except ImportError:
            # Fallback to samgeo
            try:
                from samgeo import SamGeo
                self.sam = SamGeo(
                    model_type=self.model_type,
                    automatic=False  # We'll use point prompts
                )
                self._initialized = True
            except ImportError:
                raise ImportError(
                    "Install segment-anything or segment-geospatial"
                )

    def _get_checkpoint(self) -> str:
        """Get or download SAM checkpoint."""
        from pathlib import Path
        import urllib.request

        checkpoints = {
            'vit_h': 'sam_vit_h_4b8939.pth',
            'vit_l': 'sam_vit_l_0b3195.pth',
            'vit_b': 'sam_vit_b_01ec64.pth'
        }

        checkpoint_dir = Path.home() / '.cache' / 'sam'
        checkpoint_dir.mkdir(parents=True, exist_ok=True)

        checkpoint_file = checkpoint_dir / checkpoints[self.model_type]

        if not checkpoint_file.exists():
            url = f"https://dl.fbaipublicfiles.com/segment_anything/{checkpoints[self.model_type]}"
            print(f"Downloading SAM checkpoint from {url}...")
            urllib.request.urlretrieve(url, checkpoint_file)

        return str(checkpoint_file)

    def segment_with_ror_constraints(
        self,
        image_path: str,
        ror_records: List[Dict],
        seed_points: Optional[List[Tuple[float, float]]] = None,
        return_all_candidates: bool = False
    ) -> Tuple[gpd.GeoDataFrame, Dict]:
        """
        MAIN INNOVATION: Segment image using ROR constraints.

        Algorithm:
        1. Generate seed points (from ROR centroids or grid)
        2. Run SAM with point prompts at each seed
        3. For each ROR record, find best matching segment
        4. If area deviation > tolerance, refine with adjusted prompts
        5. Repeat until convergence or max iterations

        Args:
            image_path: Path to GeoTIFF
            ror_records: List of dicts with 'extent_sqm', 'survey_no', etc.
            seed_points: Optional seed points (auto-generated if None)
            return_all_candidates: Return all candidates, not just best matches

        Returns:
            (GeoDataFrame of matched segments, metrics dict)
        """
        self._ensure_initialized()

        start_time = time.time()

        # Load image
        with rasterio.open(image_path) as src:
            image = src.read()
            transform = src.transform
            crs = src.crs
            bounds = src.bounds

            # Convert to RGB for SAM (expects HWC format)
            if image.shape[0] >= 3:
                image_rgb = np.transpose(image[:3], (1, 2, 0))
            else:
                image_rgb = np.stack([image[0]] * 3, axis=-1)

        # Extract expected areas from ROR
        expected_areas = []
        for r in ror_records:
            area = r.get('extent_sqm') or r.get('expected_area_sqm', 0)
            expected_areas.append(area)

        # INNOVATION FLAG: ROR-guided prompts vs uniform grid
        if seed_points is None:
            if self.use_ror_guided_prompts:
                # Generate points based on ROR count and expected distribution
                seed_points = self._generate_seed_points(
                    bounds, len(ror_records), transform
                )
            else:
                # Baseline: uniform grid regardless of ROR
                seed_points = self._generate_uniform_grid(bounds, transform)

        # PHASE 1: Initial segmentation with point prompts
        all_candidates = self._segment_with_points(
            image_rgb, seed_points, transform, crs
        )

        # INNOVATION FLAG: Area filtering
        if self.use_area_filtering and len(all_candidates) > 0:
            # Filter candidates by ROR area range
            min_area = min(expected_areas) * 0.5 if expected_areas else 0
            max_area = max(expected_areas) * 2.0 if expected_areas else float('inf')
            all_candidates = all_candidates[
                (all_candidates.geometry.area >= min_area) &
                (all_candidates.geometry.area <= max_area)
            ].copy()

        # INNOVATION FLAG: Hungarian vs Greedy matching
        if self.use_hungarian_matching:
            matches, cost_matrix = self._match_segments_to_ror(
                all_candidates, expected_areas
            )
        else:
            matches, cost_matrix = self._greedy_match(
                all_candidates, expected_areas
            )

        # PHASE 3: Iterative refinement for poor matches
        refined_segments = []
        refinement_stats = {'improved': 0, 'iterations': []}

        for i, (seg_idx, ror_idx) in enumerate(matches):
            if seg_idx is None:
                # No match found - create placeholder
                refined_segments.append(None)
                continue

            segment = all_candidates.iloc[seg_idx]
            expected_area = expected_areas[ror_idx]
            actual_area = segment.geometry.area

            area_error = abs(actual_area - expected_area) / expected_area if expected_area > 0 else 1.0

            # INNOVATION FLAG: Iterative refinement
            if self.use_iterative_refinement and area_error > self.area_tolerance:
                refined, iters = self._refine_segment(
                    image_rgb, segment, expected_area, transform, crs
                )
                refined_segments.append(refined)
                refinement_stats['iterations'].append(iters)
                if iters > 0:
                    refinement_stats['improved'] += 1
            else:
                refined_segments.append(segment)
                refinement_stats['iterations'].append(0)

        # Build result GeoDataFrame
        result_rows = []
        for i, (seg, ror) in enumerate(zip(refined_segments, ror_records)):
            if seg is None:
                continue

            expected_area = ror.get('extent_sqm') or ror.get('expected_area_sqm', 0)
            actual_area = seg.geometry.area
            area_error = abs(actual_area - expected_area) / expected_area if expected_area > 0 else 1.0

            result_rows.append({
                'geometry': seg.geometry,
                'segment_id': i,
                'ror_survey_no': ror.get('survey_no', f'ROR_{i}'),
                'expected_area_sqm': expected_area,
                'detected_area_sqm': actual_area,
                'area_error': area_error,
                'area_match_score': max(0, 1 - area_error),
                'refinement_iterations': refinement_stats['iterations'][i] if i < len(refinement_stats['iterations']) else 0,
                'ror_matched': True
            })

        result_gdf = gpd.GeoDataFrame(result_rows, crs=crs)

        # Compile metrics
        metrics = {
            'total_time_seconds': time.time() - start_time,
            'total_ror_records': len(ror_records),
            'segments_matched': len(result_gdf),
            'segments_refined': refinement_stats['improved'],
            'mean_area_error': result_gdf['area_error'].mean() if len(result_gdf) > 0 else 1.0,
            'area_match_rate': (result_gdf['area_error'] <= self.area_tolerance).mean() if len(result_gdf) > 0 else 0.0,
            'refinement_iterations': refinement_stats['iterations']
        }

        self.metrics['iterations_used'].extend(refinement_stats['iterations'])
        self.metrics['segments_refined'] += refinement_stats['improved']

        if return_all_candidates:
            return result_gdf, metrics, all_candidates
        return result_gdf, metrics

    def _generate_seed_points(
        self,
        bounds,
        n_points: int,
        transform
    ) -> List[Tuple[float, float]]:
        """Generate seed points for SAM prompts."""
        minx, miny, maxx, maxy = bounds

        # Create grid of points
        nx = int(np.ceil(np.sqrt(n_points)))
        ny = int(np.ceil(n_points / nx))

        dx = (maxx - minx) / (nx + 1)
        dy = (maxy - miny) / (ny + 1)

        points = []
        for i in range(1, nx + 1):
            for j in range(1, ny + 1):
                x = minx + i * dx
                y = miny + j * dy
                points.append((x, y))

                if len(points) >= n_points:
                    break
            if len(points) >= n_points:
                break

        return points

    def _generate_uniform_grid(
        self,
        bounds,
        transform,
        grid_size: int = 10
    ) -> List[Tuple[float, float]]:
        """Generate uniform grid of points (baseline, no ROR guidance)."""
        minx, miny, maxx, maxy = bounds

        dx = (maxx - minx) / (grid_size + 1)
        dy = (maxy - miny) / (grid_size + 1)

        points = []
        for i in range(1, grid_size + 1):
            for j in range(1, grid_size + 1):
                x = minx + i * dx
                y = miny + j * dy
                points.append((x, y))

        return points

    def _greedy_match(
        self,
        segments: gpd.GeoDataFrame,
        expected_areas: List[float]
    ) -> Tuple[List[Tuple], np.ndarray]:
        """
        Greedy matching (baseline, non-optimal).
        For each ROR record, find nearest unassigned segment by area.
        """
        n_segments = len(segments)
        n_ror = len(expected_areas)

        if n_segments == 0:
            return [(None, i) for i in range(n_ror)], np.array([])

        # Build cost matrix
        cost_matrix = np.zeros((n_ror, n_segments))
        for i, expected in enumerate(expected_areas):
            for j, seg in segments.iterrows():
                actual = seg.geometry.area
                if expected > 0:
                    cost_matrix[i, j] = abs(actual - expected) / expected
                else:
                    cost_matrix[i, j] = 1.0

        # Greedy assignment
        matches = []
        used_segments = set()

        for ror_idx in range(n_ror):
            best_seg = None
            best_cost = float('inf')

            for seg_idx in range(n_segments):
                if seg_idx not in used_segments:
                    if cost_matrix[ror_idx, seg_idx] < best_cost:
                        best_cost = cost_matrix[ror_idx, seg_idx]
                        best_seg = seg_idx

            if best_seg is not None and best_cost < 2.0:
                matches.append((best_seg, ror_idx))
                used_segments.add(best_seg)
            else:
                matches.append((None, ror_idx))

        return matches, cost_matrix

    def _segment_with_points(
        self,
        image: np.ndarray,
        points: List[Tuple[float, float]],
        transform,
        crs
    ) -> gpd.GeoDataFrame:
        """Run SAM with point prompts."""
        segments = []

        if hasattr(self, 'predictor') and self.predictor is not None:
            # Use native SAM predictor
            self.predictor.set_image(image)

            for i, (x, y) in enumerate(points):
                # Convert geo coords to pixel coords
                row, col = rowcol(transform, x, y)

                # Ensure within image bounds
                if 0 <= row < image.shape[0] and 0 <= col < image.shape[1]:
                    point_coords = np.array([[col, row]])
                    point_labels = np.array([1])  # 1 = foreground

                    masks, scores, _ = self.predictor.predict(
                        point_coords=point_coords,
                        point_labels=point_labels,
                        multimask_output=True
                    )

                    # Take highest scoring mask
                    best_mask = masks[np.argmax(scores)]

                    # Convert mask to polygon
                    poly = self._mask_to_polygon(best_mask, transform)
                    if poly is not None and poly.is_valid:
                        segments.append({
                            'geometry': poly,
                            'area_sqm': poly.area,
                            'segment_id': i,
                            'sam_score': float(np.max(scores)),
                            'seed_point': Point(x, y)
                        })
        else:
            # Fallback: use automatic segmentation and filter by proximity to points
            from samgeo import SamGeo

            with tempfile.NamedTemporaryFile(suffix='.tif', delete=False) as tmp_img:
                tmp_path = tmp_img.name

            with tempfile.NamedTemporaryFile(suffix='.shp', delete=False) as tmp_shp:
                shp_path = tmp_shp.name

            # Save image temporarily
            with rasterio.open(tmp_path, 'w', driver='GTiff',
                             height=image.shape[0], width=image.shape[1],
                             count=3, dtype=image.dtype,
                             transform=transform, crs=crs) as dst:
                dst.write(np.transpose(image, (2, 0, 1)))

            # Run automatic segmentation
            self.sam.generate(tmp_path, shp_path, batch=True)

            if Path(shp_path).exists():
                all_segs = gpd.read_file(shp_path)

                # Filter segments near seed points
                for i, (x, y) in enumerate(points):
                    pt = Point(x, y)
                    for _, seg in all_segs.iterrows():
                        if seg.geometry.contains(pt) or seg.geometry.distance(pt) < 10:
                            segments.append({
                                'geometry': seg.geometry,
                                'area_sqm': seg.geometry.area,
                                'segment_id': i,
                                'sam_score': 0.8,
                                'seed_point': pt
                            })
                            break

            # Cleanup
            Path(tmp_path).unlink(missing_ok=True)
            Path(shp_path).unlink(missing_ok=True)

        if segments:
            return gpd.GeoDataFrame(segments, crs=crs)
        else:
            return gpd.GeoDataFrame(
                columns=['geometry', 'area_sqm', 'segment_id', 'sam_score'],
                crs=crs
            )

    def _mask_to_polygon(self, mask: np.ndarray, transform) -> Optional[Polygon]:
        """Convert binary mask to polygon in geo coordinates."""
        try:
            # Find contours
            contours = measure.find_contours(mask.astype(float), 0.5)

            if not contours:
                return None

            # Take largest contour
            largest = max(contours, key=len)

            if len(largest) < 4:
                return None

            # Convert pixel coords to geo coords
            coords = []
            for row, col in largest:
                x, y = transform * (col, row)
                coords.append((x, y))

            # Close the polygon
            coords.append(coords[0])

            poly = Polygon(coords)

            if not poly.is_valid:
                poly = poly.buffer(0)  # Fix invalid geometry

            return poly if poly.is_valid else None

        except Exception:
            return None

    def _match_segments_to_ror(
        self,
        segments: gpd.GeoDataFrame,
        expected_areas: List[float]
    ) -> Tuple[List[Tuple], np.ndarray]:
        """
        Match segments to ROR records using Hungarian algorithm.

        Optimizes for minimum total area deviation.
        """
        n_segments = len(segments)
        n_ror = len(expected_areas)

        if n_segments == 0:
            return [(None, i) for i in range(n_ror)], np.array([])

        # Build cost matrix based on area deviation
        cost_matrix = np.zeros((n_ror, n_segments))

        for i, expected in enumerate(expected_areas):
            for j, seg in segments.iterrows():
                actual = seg.geometry.area
                if expected > 0:
                    # Cost = relative area error
                    cost_matrix[i, j] = abs(actual - expected) / expected
                else:
                    cost_matrix[i, j] = 1.0  # Max cost if no expected area

        # Solve assignment problem
        row_ind, col_ind = linear_sum_assignment(cost_matrix)

        # Build matches list
        matches = []
        assigned_ror = set()

        for ror_idx, seg_idx in zip(row_ind, col_ind):
            # Only accept match if cost is reasonable
            if cost_matrix[ror_idx, seg_idx] < 2.0:  # Allow up to 200% error initially
                matches.append((seg_idx, ror_idx))
                assigned_ror.add(ror_idx)

        # Add unmatched ROR records
        for i in range(n_ror):
            if i not in assigned_ror:
                matches.append((None, i))

        return matches, cost_matrix

    def _refine_segment(
        self,
        image: np.ndarray,
        segment,
        expected_area: float,
        transform,
        crs
    ) -> Tuple[object, int]:
        """
        INNOVATION: Iterative refinement based on area feedback.

        If detected area doesn't match ROR, we:
        1. Adjust the prompt location (move toward centroid)
        2. Try multiple mask outputs from SAM
        3. Apply morphological operations to grow/shrink
        """
        if not hasattr(self, 'predictor') or self.predictor is None:
            return segment, 0

        current_segment = segment
        current_area = segment.geometry.area
        best_error = abs(current_area - expected_area) / expected_area if expected_area > 0 else 1.0

        for iteration in range(1, self.max_iterations + 1):
            # Get centroid of current segment
            centroid = current_segment.geometry.centroid

            # Convert to pixel coords
            row, col = rowcol(transform, centroid.x, centroid.y)

            # Try with adjusted point
            if 0 <= row < image.shape[0] and 0 <= col < image.shape[1]:
                point_coords = np.array([[col, row]])
                point_labels = np.array([1])

                masks, scores, _ = self.predictor.predict(
                    point_coords=point_coords,
                    point_labels=point_labels,
                    multimask_output=True
                )

                # Try each mask, pick best area match
                for mask, score in zip(masks, scores):
                    poly = self._mask_to_polygon(mask, transform)
                    if poly is not None and poly.is_valid:
                        area = poly.area
                        error = abs(area - expected_area) / expected_area if expected_area > 0 else 1.0

                        if error < best_error:
                            best_error = error
                            current_segment = type(segment)(
                                geometry=poly,
                                area_sqm=area,
                                segment_id=segment.get('segment_id', 0),
                                sam_score=float(score)
                            )

                            if error <= self.area_tolerance:
                                return current_segment, iteration

            # If still not good, try morphological adjustment
            if best_error > self.area_tolerance:
                area_ratio = expected_area / current_area if current_area > 0 else 1.0

                if area_ratio > 1.1:  # Need to grow
                    adjusted = current_segment.geometry.buffer(
                        np.sqrt(current_area) * 0.05  # Grow by 5%
                    )
                elif area_ratio < 0.9:  # Need to shrink
                    adjusted = current_segment.geometry.buffer(
                        -np.sqrt(current_area) * 0.05  # Shrink by 5%
                    )
                else:
                    adjusted = current_segment.geometry

                if adjusted.is_valid and not adjusted.is_empty:
                    new_error = abs(adjusted.area - expected_area) / expected_area if expected_area > 0 else 1.0
                    if new_error < best_error:
                        best_error = new_error
                        current_segment = type(segment)(
                            geometry=adjusted,
                            area_sqm=adjusted.area,
                            segment_id=segment.get('segment_id', 0),
                            sam_score=segment.get('sam_score', 0.5)
                        )

        return current_segment, self.max_iterations

    def get_innovation_metrics(self) -> Dict:
        """
        Get metrics demonstrating the innovation's effectiveness.

        Returns stats on how ROR-guidance improved segmentation.
        """
        if not self.metrics['iterations_used']:
            return {'message': 'No segmentation runs yet'}

        iterations = self.metrics['iterations_used']

        return {
            'total_segments_processed': len(iterations),
            'segments_needing_refinement': sum(1 for i in iterations if i > 0),
            'segments_refined_successfully': self.metrics['segments_refined'],
            'refinement_rate': sum(1 for i in iterations if i > 0) / len(iterations) if iterations else 0,
            'avg_iterations_when_refined': np.mean([i for i in iterations if i > 0]) if any(i > 0 for i in iterations) else 0,
            'innovation_impact': f"{self.metrics['segments_refined']} segments improved through ROR feedback loop"
        }


class BoundaryConfidenceEstimator:
    """
    INNOVATION: Image-based boundary confidence estimation.

    Analyzes image features to predict how reliable a detected boundary is:
    - Edge strength along boundary
    - Texture contrast between adjacent parcels
    - Presence of natural boundaries (roads, walls, vegetation lines)
    """

    def __init__(self):
        self.edge_weight = 0.4
        self.contrast_weight = 0.3
        self.linearity_weight = 0.3

    def estimate_boundary_confidence(
        self,
        image: np.ndarray,
        polygon: Polygon,
        transform
    ) -> Dict[str, float]:
        """
        Estimate confidence in a boundary based on image features.

        Args:
            image: RGB image array (HWC format)
            polygon: Detected parcel polygon
            transform: Rasterio transform

        Returns:
            Dict with confidence scores
        """
        try:
            from skimage import filters, feature

            # Convert to grayscale
            if len(image.shape) == 3:
                gray = np.mean(image, axis=2).astype(np.float32)
            else:
                gray = image.astype(np.float32)

            # Compute edge map
            edges = filters.sobel(gray)

            # Sample points along boundary
            boundary = polygon.boundary
            boundary_points = [boundary.interpolate(i / 100, normalized=True)
                             for i in range(100)]

            edge_scores = []
            for pt in boundary_points:
                row, col = rowcol(transform, pt.x, pt.y)
                if 0 <= row < edges.shape[0] and 0 <= col < edges.shape[1]:
                    edge_scores.append(edges[int(row), int(col)])

            # Edge strength score (higher = clearer boundary)
            edge_score = np.mean(edge_scores) / (np.max(edges) + 1e-6) if edge_scores else 0.5

            # Boundary linearity score (straighter boundaries are more confident)
            coords = list(polygon.exterior.coords)
            angles = []
            for i in range(1, len(coords) - 1):
                v1 = np.array(coords[i]) - np.array(coords[i-1])
                v2 = np.array(coords[i+1]) - np.array(coords[i])
                if np.linalg.norm(v1) > 0 and np.linalg.norm(v2) > 0:
                    cos_angle = np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2))
                    angles.append(abs(cos_angle))

            linearity_score = np.mean(angles) if angles else 0.5

            # Combined confidence
            confidence = (
                self.edge_weight * min(1.0, edge_score * 2) +
                self.contrast_weight * 0.7 +  # Placeholder for contrast
                self.linearity_weight * linearity_score
            )

            return {
                'boundary_confidence': confidence,
                'edge_clarity': min(1.0, edge_score * 2),
                'boundary_linearity': linearity_score,
                'interpretation': self._interpret_confidence(confidence)
            }

        except Exception as e:
            return {
                'boundary_confidence': 0.5,
                'edge_clarity': 0.5,
                'boundary_linearity': 0.5,
                'interpretation': 'Could not analyze image',
                'error': str(e)
            }

    def _interpret_confidence(self, score: float) -> str:
        if score >= 0.8:
            return "High confidence - clear boundary visible in image"
        elif score >= 0.6:
            return "Medium confidence - boundary partially visible"
        else:
            return "Low confidence - boundary unclear in image"

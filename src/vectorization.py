"""
Vectorization and Topology Module for BoundaryAI

Handles conversion of raster segmentation masks to clean vector polygons
with proper topology (no gaps, no overlaps).
"""

from typing import Dict, List, Optional, Tuple, Union
import numpy as np
import geopandas as gpd
from shapely.geometry import (
    Polygon, MultiPolygon, LineString, MultiLineString,
    GeometryCollection, box, mapping
)
from shapely.ops import unary_union, polygonize, linemerge
from shapely.validation import make_valid
import rasterio
from rasterio.features import shapes


class MaskVectorizer:
    """
    Converts raster segmentation masks to vector polygons.
    """

    def __init__(
        self,
        simplify_tolerance: float = 1.0,
        min_area: float = 50.0
    ):
        """
        Initialize vectorizer.

        Args:
            simplify_tolerance: Douglas-Peucker simplification tolerance
            min_area: Minimum polygon area to keep
        """
        self.simplify_tolerance = simplify_tolerance
        self.min_area = min_area

    def vectorize_mask(
        self,
        mask: np.ndarray,
        transform: rasterio.Affine,
        crs: str = "EPSG:32644"
    ) -> gpd.GeoDataFrame:
        """
        Convert binary mask to polygons.

        Args:
            mask: Binary mask array (H, W)
            transform: Rasterio affine transform
            crs: Coordinate reference system

        Returns:
            GeoDataFrame with polygons
        """
        # Ensure mask is correct dtype
        mask = mask.astype(np.uint8)

        # Extract shapes from mask
        polygons = []
        for geom, value in shapes(mask, transform=transform):
            if value > 0:  # Foreground
                poly = Polygon(geom['coordinates'][0])
                if poly.is_valid and poly.area >= self.min_area:
                    polygons.append(poly)

        # Create GeoDataFrame
        if polygons:
            gdf = gpd.GeoDataFrame(
                {'geometry': polygons},
                crs=crs
            )

            # Simplify geometries
            if self.simplify_tolerance > 0:
                gdf['geometry'] = gdf.geometry.simplify(
                    self.simplify_tolerance,
                    preserve_topology=True
                )

            # Calculate areas
            gdf['area_sqm'] = gdf.geometry.area
            gdf['segment_id'] = range(len(gdf))

            return gdf

        return gpd.GeoDataFrame(
            columns=['geometry', 'area_sqm', 'segment_id'],
            geometry='geometry',
            crs=crs
        )

    def vectorize_file(
        self,
        mask_path: str,
        output_path: Optional[str] = None
    ) -> gpd.GeoDataFrame:
        """
        Vectorize a mask file.

        Args:
            mask_path: Path to mask raster
            output_path: Optional path to save shapefile

        Returns:
            GeoDataFrame with polygons
        """
        with rasterio.open(mask_path) as src:
            mask = src.read(1)
            transform = src.transform
            crs = str(src.crs)

        gdf = self.vectorize_mask(mask, transform, crs)

        if output_path and len(gdf) > 0:
            gdf.to_file(output_path)

        return gdf


class TopologyEnforcer:
    """
    Enforces topological constraints on parcel polygons.

    Ensures:
    - No overlaps between parcels
    - No gaps (optional - can leave roads/paths)
    - Valid geometries
    - Shared boundaries match exactly
    """

    def __init__(
        self,
        snap_tolerance: float = 0.1,
        min_area: float = 50.0
    ):
        """
        Initialize topology enforcer.

        Args:
            snap_tolerance: Distance to snap nearby vertices
            min_area: Minimum area to keep after operations
        """
        self.snap_tolerance = snap_tolerance
        self.min_area = min_area

    def enforce_topology(
        self,
        parcels: gpd.GeoDataFrame,
        boundary: Optional[Polygon] = None
    ) -> gpd.GeoDataFrame:
        """
        Enforce topological constraints on parcels.

        Args:
            parcels: Input GeoDataFrame
            boundary: Optional village boundary to clip to

        Returns:
            Topologically clean GeoDataFrame
        """
        if len(parcels) == 0:
            return parcels

        # Step 1: Make all geometries valid
        parcels = self._make_valid(parcels)

        # Step 2: Remove overlaps
        parcels = self._remove_overlaps(parcels)

        # Step 3: Snap nearby vertices
        if self.snap_tolerance > 0:
            parcels = self._snap_vertices(parcels)

        # Step 4: Clip to boundary if provided
        if boundary is not None:
            parcels = self._clip_to_boundary(parcels, boundary)

        # Step 5: Remove slivers
        parcels = self._remove_slivers(parcels)

        return parcels.reset_index(drop=True)

    def _make_valid(self, parcels: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
        """Make all geometries valid."""
        parcels = parcels.copy()
        parcels['geometry'] = parcels.geometry.apply(
            lambda g: make_valid(g) if not g.is_valid else g
        )
        return parcels

    def _remove_overlaps(
        self,
        parcels: gpd.GeoDataFrame
    ) -> gpd.GeoDataFrame:
        """Remove overlapping areas between parcels."""
        if len(parcels) <= 1:
            return parcels

        parcels = parcels.copy()
        geometries = list(parcels.geometry)

        # Process parcels in order of size (larger first)
        size_order = np.argsort([-g.area for g in geometries])

        cleaned = []
        used_area = None

        for idx in size_order:
            geom = geometries[idx]

            if used_area is None:
                used_area = geom
                cleaned.append((idx, geom))
            else:
                # Subtract already used area
                if geom.intersects(used_area):
                    geom = geom.difference(used_area)

                if not geom.is_empty and geom.area >= self.min_area:
                    # Handle MultiPolygon - keep largest
                    if isinstance(geom, MultiPolygon):
                        geom = max(geom.geoms, key=lambda g: g.area)

                    if isinstance(geom, Polygon) and geom.area >= self.min_area:
                        used_area = used_area.union(geom)
                        cleaned.append((idx, geom))

        # Reconstruct GeoDataFrame
        if cleaned:
            indices, geoms = zip(*cleaned)
            result = parcels.iloc[list(indices)].copy()
            result['geometry'] = list(geoms)
            result['area_sqm'] = result.geometry.area
            return result

        return gpd.GeoDataFrame(
            columns=parcels.columns,
            geometry='geometry',
            crs=parcels.crs
        )

    def _snap_vertices(
        self,
        parcels: gpd.GeoDataFrame
    ) -> gpd.GeoDataFrame:
        """Snap nearby vertices to ensure clean topology."""
        # This is a simplified version - full implementation would use
        # a proper vertex snapping algorithm
        parcels = parcels.copy()

        # Buffer and unbuffer to snap nearby vertices
        parcels['geometry'] = parcels.geometry.buffer(
            self.snap_tolerance
        ).buffer(-self.snap_tolerance)

        return parcels

    def _clip_to_boundary(
        self,
        parcels: gpd.GeoDataFrame,
        boundary: Polygon
    ) -> gpd.GeoDataFrame:
        """Clip parcels to village boundary."""
        parcels = parcels.copy()
        parcels['geometry'] = parcels.geometry.intersection(boundary)

        # Remove empty geometries
        parcels = parcels[~parcels.geometry.is_empty]

        return parcels

    def _remove_slivers(
        self,
        parcels: gpd.GeoDataFrame
    ) -> gpd.GeoDataFrame:
        """Remove sliver polygons (thin strips)."""
        parcels = parcels.copy()

        # Calculate compactness ratio (4π * area / perimeter²)
        # Slivers have very low compactness
        parcels['compactness'] = (
            4 * np.pi * parcels.geometry.area /
            (parcels.geometry.length ** 2 + 1e-10)
        )

        # Keep parcels with reasonable compactness or large enough area
        mask = (parcels['compactness'] > 0.1) | (parcels['area_sqm'] > self.min_area * 2)
        parcels = parcels[mask].drop(columns=['compactness'])

        return parcels


class BoundaryRefiner:
    """
    Refines parcel boundaries using edge detection and optimization.
    """

    def __init__(
        self,
        edge_weight: float = 0.5,
        smoothness_weight: float = 0.3
    ):
        """
        Initialize boundary refiner.

        Args:
            edge_weight: Weight for edge alignment
            smoothness_weight: Weight for boundary smoothness
        """
        self.edge_weight = edge_weight
        self.smoothness_weight = smoothness_weight

    def refine_boundaries(
        self,
        parcels: gpd.GeoDataFrame,
        edge_image: Optional[np.ndarray] = None,
        transform: Optional[rasterio.Affine] = None
    ) -> gpd.GeoDataFrame:
        """
        Refine parcel boundaries.

        Args:
            parcels: Input parcels
            edge_image: Optional edge detection image
            transform: Affine transform for edge image

        Returns:
            GeoDataFrame with refined boundaries
        """
        if len(parcels) == 0:
            return parcels

        parcels = parcels.copy()

        # For now, apply Douglas-Peucker simplification
        # with area-preserving constraints
        parcels['geometry'] = parcels.geometry.apply(
            self._refine_polygon
        )

        return parcels

    def _refine_polygon(
        self,
        polygon: Polygon,
        target_vertices: int = 20
    ) -> Polygon:
        """Refine a single polygon."""
        if not isinstance(polygon, Polygon):
            return polygon

        # Simplify while preserving area
        original_area = polygon.area

        # Iteratively simplify
        tolerance = 0.5
        simplified = polygon.simplify(tolerance, preserve_topology=True)

        while len(simplified.exterior.coords) > target_vertices and tolerance < 10:
            tolerance *= 1.5
            simplified = polygon.simplify(tolerance, preserve_topology=True)

        # Ensure we didn't lose too much area
        if simplified.area < original_area * 0.95:
            # Use less aggressive simplification
            simplified = polygon.simplify(tolerance / 2, preserve_topology=True)

        return simplified

    def detect_shared_boundaries(
        self,
        parcels: gpd.GeoDataFrame
    ) -> gpd.GeoDataFrame:
        """
        Detect and mark shared boundaries between parcels.

        Args:
            parcels: Input parcels

        Returns:
            GeoDataFrame of boundary lines with neighbor info
        """
        if len(parcels) < 2:
            return gpd.GeoDataFrame(
                columns=['geometry', 'parcel_1', 'parcel_2'],
                geometry='geometry',
                crs=parcels.crs
            )

        boundaries = []

        for i, row1 in parcels.iterrows():
            for j, row2 in parcels.iterrows():
                if j <= i:
                    continue

                if row1.geometry.touches(row2.geometry) or row1.geometry.intersects(row2.geometry):
                    # Get shared boundary
                    shared = row1.geometry.intersection(row2.geometry)

                    if isinstance(shared, (LineString, MultiLineString)):
                        boundaries.append({
                            'geometry': shared,
                            'parcel_1': i,
                            'parcel_2': j,
                            'length': shared.length
                        })

        if boundaries:
            return gpd.GeoDataFrame(boundaries, crs=parcels.crs)

        return gpd.GeoDataFrame(
            columns=['geometry', 'parcel_1', 'parcel_2', 'length'],
            geometry='geometry',
            crs=parcels.crs
        )


def merge_adjacent_segments(
    segments: gpd.GeoDataFrame,
    area_threshold: float = 0.1
) -> gpd.GeoDataFrame:
    """
    Merge adjacent segments that likely belong to the same parcel.

    Uses area similarity to decide which segments to merge.

    Args:
        segments: Input segments
        area_threshold: Max relative area difference for merging

    Returns:
        GeoDataFrame with merged segments
    """
    if len(segments) <= 1:
        return segments

    segments = segments.copy()

    # Build adjacency graph
    sindex = segments.sindex
    merged_indices = set()
    merge_groups = []

    for i, row in segments.iterrows():
        if i in merged_indices:
            continue

        group = [i]
        candidates = list(sindex.intersection(row.geometry.bounds))

        for j in candidates:
            if j == i or j in merged_indices:
                continue

            other = segments.iloc[j]

            # Check if adjacent (touching)
            if row.geometry.touches(other.geometry):
                # Check area similarity
                area_ratio = min(row.geometry.area, other.geometry.area) / max(row.geometry.area, other.geometry.area)

                # Only merge if very similar in size
                if area_ratio > 0.7:
                    group.append(j)
                    merged_indices.add(j)

        merged_indices.add(i)
        merge_groups.append(group)

    # Create merged polygons
    merged = []
    for group in merge_groups:
        geoms = [segments.iloc[idx].geometry for idx in group]
        merged_geom = unary_union(geoms)

        # Keep as single polygon if possible
        if isinstance(merged_geom, MultiPolygon):
            merged_geom = max(merged_geom.geoms, key=lambda g: g.area)

        merged.append({
            'geometry': merged_geom,
            'area_sqm': merged_geom.area,
            'segment_id': group[0]
        })

    return gpd.GeoDataFrame(merged, crs=segments.crs)

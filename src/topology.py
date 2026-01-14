"""
Topology Module for BoundaryAI

Fixes topological issues in parcel polygon layers:
- Gaps between adjacent parcels
- Overlaps between parcels
- Invalid geometries
- Slivers (thin polygon fragments)
"""

from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass

import numpy as np
import geopandas as gpd
from shapely.geometry import Polygon, MultiPolygon, LineString, Point
from shapely.ops import unary_union, polygonize
from shapely.validation import make_valid
from scipy.spatial import Voronoi


@dataclass
class TopologyIssue:
    """Represents a detected topology issue."""
    type: str  # GAP, OVERLAP, INVALID, SLIVER
    severity: str  # HIGH, MEDIUM, LOW
    location: Tuple[float, float]  # Centroid of issue
    area: float  # Area affected
    parcels_involved: List[int]  # Parcel IDs involved
    message: str


class TopologyFixer:
    """
    Fix topological issues in parcel polygon layers.

    Ensures parcels form a valid cadastral fabric:
    - No gaps between adjacent parcels
    - No overlaps (each point belongs to exactly one parcel)
    - All geometries are valid
    - No sliver polygons
    """

    def __init__(
        self,
        gap_threshold: float = 10.0,
        overlap_threshold: float = 1.0,
        sliver_threshold: float = 0.1,
        min_area: float = 10.0
    ):
        """
        Initialize topology fixer.

        Args:
            gap_threshold: Maximum gap area to fill (sqm)
            overlap_threshold: Maximum overlap area to resolve (sqm)
            sliver_threshold: Ratio threshold for sliver detection (area/perimeter^2)
            min_area: Minimum valid parcel area (sqm)
        """
        self.gap_threshold = gap_threshold
        self.overlap_threshold = overlap_threshold
        self.sliver_threshold = sliver_threshold
        self.min_area = min_area

    def fix_topology(
        self,
        gdf: gpd.GeoDataFrame,
        fix_invalid: bool = True,
        fix_gaps: bool = True,
        fix_overlaps: bool = True,
        remove_slivers: bool = True
    ) -> gpd.GeoDataFrame:
        """
        Fix all topology issues in the GeoDataFrame.

        Args:
            gdf: Input GeoDataFrame with parcel geometries
            fix_invalid: Fix invalid geometries
            fix_gaps: Fill gaps between parcels
            fix_overlaps: Resolve overlapping parcels
            remove_slivers: Remove sliver polygons

        Returns:
            Fixed GeoDataFrame
        """
        gdf = gdf.copy()

        # Step 1: Fix invalid geometries
        if fix_invalid:
            gdf = self._fix_invalid_geometries(gdf)

        # Step 2: Remove slivers (do this early)
        if remove_slivers:
            gdf = self._remove_slivers(gdf)

        # Step 3: Fix overlaps
        if fix_overlaps:
            gdf = self._fix_overlaps(gdf)

        # Step 4: Fill gaps
        if fix_gaps:
            gdf = self._fill_gaps(gdf)

        # Step 5: Clean up - remove tiny polygons
        gdf = gdf[gdf.geometry.area >= self.min_area].copy()

        # Reset index and IDs
        gdf = gdf.reset_index(drop=True)
        if 'parcel_id' in gdf.columns:
            gdf['parcel_id'] = range(len(gdf))

        return gdf

    def _fix_invalid_geometries(self, gdf: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
        """Fix invalid geometries using make_valid."""
        gdf = gdf.copy()

        invalid_mask = ~gdf.geometry.is_valid
        if invalid_mask.any():
            gdf.loc[invalid_mask, 'geometry'] = gdf.loc[invalid_mask, 'geometry'].apply(
                lambda g: make_valid(g) if g is not None else None
            )

        # Remove any that became empty
        gdf = gdf[~gdf.geometry.is_empty & gdf.geometry.notna()]

        # Handle MultiPolygons - keep only the largest part
        multi_mask = gdf.geometry.type == 'MultiPolygon'
        if multi_mask.any():
            gdf.loc[multi_mask, 'geometry'] = gdf.loc[multi_mask, 'geometry'].apply(
                lambda mp: max(mp.geoms, key=lambda g: g.area) if mp else None
            )

        return gdf

    def _remove_slivers(self, gdf: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
        """Remove sliver polygons (thin fragments)."""
        gdf = gdf.copy()

        def is_sliver(geom):
            if geom is None or geom.is_empty:
                return True
            area = geom.area
            perimeter = geom.length
            if perimeter == 0:
                return True
            # Isoperimetric quotient - slivers have low values
            ipq = (4 * np.pi * area) / (perimeter ** 2)
            return ipq < self.sliver_threshold

        sliver_mask = gdf.geometry.apply(is_sliver)

        # Get non-sliver parcels
        non_slivers = gdf[~sliver_mask].copy()
        slivers = gdf[sliver_mask]

        # Merge slivers into adjacent parcels
        if len(slivers) > 0 and len(non_slivers) > 0:
            for idx, sliver in slivers.iterrows():
                if sliver.geometry is None:
                    continue

                # Find touching parcels
                touches = non_slivers[non_slivers.geometry.touches(sliver.geometry)]

                if len(touches) > 0:
                    # Merge into largest touching parcel
                    largest_idx = touches.geometry.area.idxmax()
                    merged = unary_union([non_slivers.loc[largest_idx, 'geometry'], sliver.geometry])
                    if merged.is_valid:
                        non_slivers.loc[largest_idx, 'geometry'] = merged

        return non_slivers

    def _fix_overlaps(self, gdf: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
        """Fix overlapping parcels by assigning overlap to one parcel."""
        gdf = gdf.copy()

        # Build spatial index
        sindex = gdf.sindex

        processed = set()

        for idx, parcel in gdf.iterrows():
            if idx in processed:
                continue

            # Find potential overlaps
            possible_matches = list(sindex.intersection(parcel.geometry.bounds))

            for other_idx in possible_matches:
                if other_idx <= idx or other_idx in processed:
                    continue

                other = gdf.loc[other_idx]

                # Check for actual overlap
                if parcel.geometry.intersects(other.geometry):
                    intersection = parcel.geometry.intersection(other.geometry)

                    if intersection.area > self.overlap_threshold:
                        # Assign overlap to larger parcel
                        if parcel.geometry.area >= other.geometry.area:
                            # Remove overlap from other
                            new_other = other.geometry.difference(intersection)
                            if new_other.is_valid and not new_other.is_empty:
                                gdf.loc[other_idx, 'geometry'] = new_other
                        else:
                            # Remove overlap from current
                            new_parcel = parcel.geometry.difference(intersection)
                            if new_parcel.is_valid and not new_parcel.is_empty:
                                gdf.loc[idx, 'geometry'] = new_parcel
                                parcel = gdf.loc[idx]  # Update reference

            processed.add(idx)

        return gdf

    def _fill_gaps(self, gdf: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
        """Fill gaps between parcels."""
        if len(gdf) < 2:
            return gdf

        gdf = gdf.copy()

        # Get bounding box of all parcels
        total_bounds = gdf.total_bounds
        bbox = Polygon([
            (total_bounds[0], total_bounds[1]),
            (total_bounds[2], total_bounds[1]),
            (total_bounds[2], total_bounds[3]),
            (total_bounds[0], total_bounds[3])
        ])

        # Union of all parcels
        all_parcels = unary_union(gdf.geometry)

        # Find gaps (difference between bbox and parcels)
        gaps = bbox.difference(all_parcels)

        if gaps.is_empty:
            return gdf

        # Handle MultiPolygon gaps
        if gaps.type == 'MultiPolygon':
            gap_polygons = list(gaps.geoms)
        elif gaps.type == 'Polygon':
            gap_polygons = [gaps]
        else:
            return gdf

        # Assign each gap to nearest parcel
        for gap in gap_polygons:
            if gap.area > self.gap_threshold:
                # Gap too large - might be intentional (road, etc.)
                continue

            if gap.area < 0.01:  # Negligible
                continue

            # Find parcel that shares longest boundary with gap
            gap_boundary = gap.boundary
            best_parcel_idx = None
            best_shared_length = 0

            for idx, parcel in gdf.iterrows():
                shared = parcel.geometry.boundary.intersection(gap_boundary)
                shared_length = shared.length if hasattr(shared, 'length') else 0

                if shared_length > best_shared_length:
                    best_shared_length = shared_length
                    best_parcel_idx = idx

            # Merge gap into best parcel
            if best_parcel_idx is not None and best_shared_length > 0:
                merged = unary_union([gdf.loc[best_parcel_idx, 'geometry'], gap])
                if merged.is_valid:
                    gdf.loc[best_parcel_idx, 'geometry'] = merged

        return gdf

    def validate(self, gdf: gpd.GeoDataFrame) -> Tuple[bool, List[TopologyIssue]]:
        """
        Validate topology and return list of issues.

        Args:
            gdf: GeoDataFrame to validate

        Returns:
            Tuple of (is_valid, list of issues)
        """
        issues = []

        # Check for invalid geometries
        invalid_mask = ~gdf.geometry.is_valid
        for idx in gdf[invalid_mask].index:
            geom = gdf.loc[idx, 'geometry']
            issues.append(TopologyIssue(
                type='INVALID',
                severity='HIGH',
                location=(geom.centroid.x, geom.centroid.y) if geom else (0, 0),
                area=geom.area if geom else 0,
                parcels_involved=[idx],
                message=f'Invalid geometry at parcel {idx}'
            ))

        # Check for overlaps
        overlaps = self._detect_overlaps(gdf)
        issues.extend(overlaps)

        # Check for gaps
        gaps = self._detect_gaps(gdf)
        issues.extend(gaps)

        # Check for slivers
        slivers = self._detect_slivers(gdf)
        issues.extend(slivers)

        is_valid = len(issues) == 0
        return is_valid, issues

    def _detect_overlaps(self, gdf: gpd.GeoDataFrame) -> List[TopologyIssue]:
        """Detect overlapping parcels."""
        issues = []
        sindex = gdf.sindex

        checked = set()
        for idx, parcel in gdf.iterrows():
            possible_matches = list(sindex.intersection(parcel.geometry.bounds))

            for other_idx in possible_matches:
                if other_idx <= idx:
                    continue

                pair = (min(idx, other_idx), max(idx, other_idx))
                if pair in checked:
                    continue
                checked.add(pair)

                other = gdf.loc[other_idx]
                if parcel.geometry.intersects(other.geometry):
                    intersection = parcel.geometry.intersection(other.geometry)
                    if intersection.area > self.overlap_threshold:
                        centroid = intersection.centroid
                        issues.append(TopologyIssue(
                            type='OVERLAP',
                            severity='HIGH' if intersection.area > 10 else 'MEDIUM',
                            location=(centroid.x, centroid.y),
                            area=intersection.area,
                            parcels_involved=[idx, other_idx],
                            message=f'Overlap of {intersection.area:.1f} sqm between parcels {idx} and {other_idx}'
                        ))

        return issues

    def _detect_gaps(self, gdf: gpd.GeoDataFrame) -> List[TopologyIssue]:
        """Detect gaps between parcels."""
        issues = []

        if len(gdf) < 2:
            return issues

        # Get convex hull of all parcels
        all_parcels = unary_union(gdf.geometry)
        hull = all_parcels.convex_hull

        # Find gaps
        gaps = hull.difference(all_parcels)

        if gaps.is_empty:
            return issues

        if gaps.type == 'MultiPolygon':
            gap_polygons = list(gaps.geoms)
        elif gaps.type == 'Polygon':
            gap_polygons = [gaps]
        else:
            return issues

        for gap in gap_polygons:
            if gap.area > 1.0:  # Minimum gap size to report
                centroid = gap.centroid

                # Find adjacent parcels
                adjacent = []
                for idx, parcel in gdf.iterrows():
                    if parcel.geometry.touches(gap) or parcel.geometry.distance(gap) < 0.1:
                        adjacent.append(idx)

                issues.append(TopologyIssue(
                    type='GAP',
                    severity='HIGH' if gap.area > self.gap_threshold else 'LOW',
                    location=(centroid.x, centroid.y),
                    area=gap.area,
                    parcels_involved=adjacent[:5],  # Limit to 5
                    message=f'Gap of {gap.area:.1f} sqm detected'
                ))

        return issues

    def _detect_slivers(self, gdf: gpd.GeoDataFrame) -> List[TopologyIssue]:
        """Detect sliver polygons."""
        issues = []

        for idx, parcel in gdf.iterrows():
            geom = parcel.geometry
            if geom is None or geom.is_empty:
                continue

            area = geom.area
            perimeter = geom.length

            if perimeter > 0:
                ipq = (4 * np.pi * area) / (perimeter ** 2)

                if ipq < self.sliver_threshold:
                    centroid = geom.centroid
                    issues.append(TopologyIssue(
                        type='SLIVER',
                        severity='MEDIUM',
                        location=(centroid.x, centroid.y),
                        area=area,
                        parcels_involved=[idx],
                        message=f'Sliver polygon at parcel {idx} (IPQ={ipq:.3f})'
                    ))

        return issues

    def get_statistics(self, gdf: gpd.GeoDataFrame) -> Dict:
        """
        Get topology statistics for the layer.

        Args:
            gdf: GeoDataFrame to analyze

        Returns:
            Dictionary of statistics
        """
        is_valid, issues = self.validate(gdf)

        stats = {
            'total_parcels': len(gdf),
            'is_valid': is_valid,
            'total_issues': len(issues),
            'invalid_geometries': sum(1 for i in issues if i.type == 'INVALID'),
            'overlaps': sum(1 for i in issues if i.type == 'OVERLAP'),
            'gaps': sum(1 for i in issues if i.type == 'GAP'),
            'slivers': sum(1 for i in issues if i.type == 'SLIVER'),
            'total_area': gdf.geometry.area.sum(),
            'avg_parcel_area': gdf.geometry.area.mean(),
        }

        if issues:
            stats['issues_by_severity'] = {
                'HIGH': sum(1 for i in issues if i.severity == 'HIGH'),
                'MEDIUM': sum(1 for i in issues if i.severity == 'MEDIUM'),
                'LOW': sum(1 for i in issues if i.severity == 'LOW'),
            }

        return stats


def snap_to_grid(gdf: gpd.GeoDataFrame, precision: float = 0.01) -> gpd.GeoDataFrame:
    """
    Snap all coordinates to a grid to reduce floating point issues.

    Args:
        gdf: Input GeoDataFrame
        precision: Grid size for snapping

    Returns:
        GeoDataFrame with snapped coordinates
    """
    from shapely import set_precision

    gdf = gdf.copy()
    gdf['geometry'] = gdf.geometry.apply(
        lambda g: set_precision(g, precision) if g is not None else None
    )
    return gdf

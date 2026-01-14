"""
ROR Constraint Engine for BoundaryAI

Applies Record of Rights constraints to segmentation:
- Count constraints: Expected number of parcels
- Area constraints: Expected areas per parcel
- Matching: Link segments to ROR records
"""

from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass

import numpy as np
import pandas as pd
import geopandas as gpd
from scipy.optimize import linear_sum_assignment
from shapely.geometry import Polygon
from shapely.ops import unary_union


@dataclass
class MatchResult:
    """Result of segment-to-ROR matching"""
    segment_id: int
    ror_survey_no: Optional[str]
    ror_area_sqm: Optional[float]
    generated_area_sqm: float
    area_mismatch: float  # Fractional difference
    match_confidence: float


@dataclass
class ConstraintViolation:
    """A constraint violation detected during processing"""
    type: str  # COUNT_HIGH, COUNT_LOW, AREA_MISMATCH, UNMATCHED_ROR, EXTRA_SEGMENT
    severity: str  # HIGH, MEDIUM, LOW
    message: str
    details: Dict


class RORConstraintEngine:
    """
    Apply ROR constraints to guide and validate segmentation.

    Key innovations:
    1. Use ROR parcel count as constraint DURING segmentation (not just after)
    2. Match segments to ROR records using optimal assignment
    3. Flag violations for review
    """

    def __init__(
        self,
        ror_records: List[Dict],
        count_tolerance: float = 0.3,
        area_tolerance: float = 0.05
    ):
        """
        Initialize constraint engine.

        Args:
            ror_records: List of ROR record dictionaries
            count_tolerance: Allowable deviation from expected count (default 30%)
            area_tolerance: Allowable area mismatch (default 5%)
        """
        self.ror_records = ror_records
        self.count_tolerance = count_tolerance
        self.area_tolerance = area_tolerance

        # Pre-compute statistics
        self.expected_count = len(ror_records)
        self.expected_areas = [r.get('expected_area_sqm', 0) for r in ror_records]
        self.total_expected_area = sum(self.expected_areas)
        self.min_expected_area = min(self.expected_areas) if self.expected_areas else 0
        self.max_expected_area = max(self.expected_areas) if self.expected_areas else 0

    def check_count_constraint(self, segment_count: int) -> Tuple[bool, Optional[ConstraintViolation]]:
        """
        Check if segment count is within acceptable range.

        Args:
            segment_count: Number of segments detected

        Returns:
            Tuple of (is_valid, violation if any)
        """
        lower_bound = self.expected_count * (1 - self.count_tolerance)
        upper_bound = self.expected_count * (1 + self.count_tolerance)

        if segment_count > upper_bound:
            return False, ConstraintViolation(
                type='COUNT_HIGH',
                severity='MEDIUM',
                message=f'Too many segments: {segment_count} (expected ~{self.expected_count})',
                details={
                    'actual': segment_count,
                    'expected': self.expected_count,
                    'upper_bound': int(upper_bound)
                }
            )
        elif segment_count < lower_bound:
            return False, ConstraintViolation(
                type='COUNT_LOW',
                severity='MEDIUM',
                message=f'Too few segments: {segment_count} (expected ~{self.expected_count})',
                details={
                    'actual': segment_count,
                    'expected': self.expected_count,
                    'lower_bound': int(lower_bound)
                }
            )

        return True, None

    def apply_count_constraint(
        self,
        segments: gpd.GeoDataFrame,
        merge_threshold: Optional[float] = None
    ) -> gpd.GeoDataFrame:
        """
        Merge or flag segments to better match expected count.

        Args:
            segments: GeoDataFrame of detected segments
            merge_threshold: Area threshold below which to merge (default: min_expected * 0.5)

        Returns:
            Adjusted GeoDataFrame
        """
        if merge_threshold is None:
            merge_threshold = self.min_expected_area * 0.5

        current_count = len(segments)

        # If too many segments, merge small ones
        if current_count > self.expected_count * (1 + self.count_tolerance):
            segments = self._merge_small_segments(segments, merge_threshold)

        # If too few, flag large segments for potential splitting
        if current_count < self.expected_count * (1 - self.count_tolerance):
            segments = self._flag_for_splitting(segments)

        return segments

    def _merge_small_segments(
        self,
        segments: gpd.GeoDataFrame,
        min_area: float
    ) -> gpd.GeoDataFrame:
        """
        Merge segments smaller than minimum area into adjacent larger segments.

        Args:
            segments: GeoDataFrame of segments
            min_area: Minimum area threshold in sqm

        Returns:
            GeoDataFrame with small segments merged
        """
        segments = segments.copy()
        segments['area_sqm'] = segments.geometry.area

        small_mask = segments['area_sqm'] < min_area
        small_segments = segments[small_mask]
        large_segments = segments[~small_mask].copy()

        if len(small_segments) == 0:
            return segments

        # For each small segment, find the adjacent large segment to merge into
        for idx, small in small_segments.iterrows():
            # Find touching large segments
            touches = large_segments[large_segments.geometry.touches(small.geometry)]

            if len(touches) > 0:
                # Merge into the largest touching segment
                largest_idx = touches['area_sqm'].idxmax()
                merged_geom = unary_union([
                    large_segments.loc[largest_idx, 'geometry'],
                    small.geometry
                ])
                large_segments.loc[largest_idx, 'geometry'] = merged_geom
                large_segments.loc[largest_idx, 'area_sqm'] = merged_geom.area

        # Reset index
        large_segments = large_segments.reset_index(drop=True)
        large_segments['parcel_id'] = range(len(large_segments))

        return large_segments

    def _flag_for_splitting(self, segments: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
        """
        Flag segments that might need splitting based on area analysis.

        Args:
            segments: GeoDataFrame of segments

        Returns:
            GeoDataFrame with 'needs_split' flag
        """
        segments = segments.copy()
        segments['area_sqm'] = segments.geometry.area

        # Flag segments much larger than max expected area
        segments['needs_split'] = segments['area_sqm'] > self.max_expected_area * 1.5

        return segments

    def match_segments_to_ror(
        self,
        segments: gpd.GeoDataFrame
    ) -> Tuple[gpd.GeoDataFrame, List[MatchResult]]:
        """
        Match generated segments to ROR records using optimal assignment.

        Uses Hungarian algorithm to find optimal matching that minimizes
        total area mismatch.

        Args:
            segments: GeoDataFrame of generated segments

        Returns:
            Tuple of (segments with ROR info, list of match results)
        """
        segments = segments.copy()
        n_segments = len(segments)
        n_ror = len(self.ror_records)

        # Ensure area column exists
        if 'area_sqm' not in segments.columns:
            segments['area_sqm'] = segments.geometry.area

        # Build cost matrix based on area difference
        cost_matrix = np.zeros((n_segments, n_ror))

        for i, (_, seg) in enumerate(segments.iterrows()):
            seg_area = seg.geometry.area
            for j, ror in enumerate(self.ror_records):
                ror_area = ror.get('expected_area_sqm', 0)
                if ror_area > 0:
                    # Normalized area difference
                    cost_matrix[i, j] = abs(seg_area - ror_area) / ror_area
                else:
                    cost_matrix[i, j] = 1.0  # Max cost if no area info

        # Solve assignment problem
        # Handle case where n_segments != n_ror
        if n_segments >= n_ror:
            row_ind, col_ind = linear_sum_assignment(cost_matrix)
        else:
            # Transpose and solve, then swap indices
            col_ind, row_ind = linear_sum_assignment(cost_matrix.T)

        # Initialize new columns
        segments['ror_survey_no'] = None
        segments['ror_area_sqm'] = None
        segments['ror_owner'] = None
        segments['ror_land_type'] = None
        segments['area_mismatch'] = None
        segments['is_matched'] = False

        match_results = []

        # Apply matches
        for i, j in zip(row_ind, col_ind):
            if i < n_segments and j < n_ror:
                ror = self.ror_records[j]
                seg_area = segments.iloc[i].geometry.area
                ror_area = ror.get('expected_area_sqm', 0)
                mismatch = cost_matrix[i, j]

                segments.iloc[i, segments.columns.get_loc('ror_survey_no')] = ror.get('survey_no')
                segments.iloc[i, segments.columns.get_loc('ror_area_sqm')] = ror_area
                segments.iloc[i, segments.columns.get_loc('ror_owner')] = ror.get('owner')
                segments.iloc[i, segments.columns.get_loc('ror_land_type')] = ror.get('land_type')
                segments.iloc[i, segments.columns.get_loc('area_mismatch')] = mismatch
                segments.iloc[i, segments.columns.get_loc('is_matched')] = True

                match_results.append(MatchResult(
                    segment_id=i,
                    ror_survey_no=ror.get('survey_no'),
                    ror_area_sqm=ror_area,
                    generated_area_sqm=seg_area,
                    area_mismatch=mismatch,
                    match_confidence=1.0 - min(mismatch, 1.0)
                ))

        # Handle unmatched segments
        for i in range(n_segments):
            if not segments.iloc[i]['is_matched']:
                match_results.append(MatchResult(
                    segment_id=i,
                    ror_survey_no=None,
                    ror_area_sqm=None,
                    generated_area_sqm=segments.iloc[i].geometry.area,
                    area_mismatch=1.0,
                    match_confidence=0.0
                ))

        return segments, match_results

    def detect_violations(
        self,
        segments: gpd.GeoDataFrame
    ) -> List[ConstraintViolation]:
        """
        Detect all constraint violations.

        Args:
            segments: GeoDataFrame with ROR matching info

        Returns:
            List of ConstraintViolation objects
        """
        violations = []

        # Check count constraint
        is_valid, violation = self.check_count_constraint(len(segments))
        if not is_valid and violation:
            violations.append(violation)

        # Check for unmatched ROR records
        if 'ror_survey_no' in segments.columns:
            matched_ror = set(segments['ror_survey_no'].dropna())
            all_ror = set(r.get('survey_no') for r in self.ror_records)
            unmatched = all_ror - matched_ror

            for survey_no in unmatched:
                violations.append(ConstraintViolation(
                    type='UNMATCHED_ROR',
                    severity='HIGH',
                    message=f'ROR record {survey_no} has no matching segment',
                    details={'survey_no': survey_no}
                ))

            # Check for extra segments (no ROR match)
            extra_segments = segments[segments['ror_survey_no'].isna()]
            for idx, seg in extra_segments.iterrows():
                violations.append(ConstraintViolation(
                    type='EXTRA_SEGMENT',
                    severity='HIGH',
                    message=f'Segment {idx} has no ROR match',
                    details={
                        'segment_id': idx,
                        'area_sqm': seg.geometry.area
                    }
                ))

            # Check for area mismatches
            matched = segments[segments['area_mismatch'].notna()]
            for idx, seg in matched.iterrows():
                mismatch = seg['area_mismatch']
                if mismatch > 0.20:
                    violations.append(ConstraintViolation(
                        type='AREA_MISMATCH',
                        severity='HIGH',
                        message=f'Large area mismatch for {seg["ror_survey_no"]}: {mismatch:.1%}',
                        details={
                            'segment_id': idx,
                            'survey_no': seg['ror_survey_no'],
                            'generated_area': seg.geometry.area,
                            'ror_area': seg['ror_area_sqm'],
                            'mismatch_pct': mismatch * 100
                        }
                    ))
                elif mismatch > self.area_tolerance:
                    violations.append(ConstraintViolation(
                        type='AREA_MISMATCH',
                        severity='MEDIUM',
                        message=f'Area mismatch for {seg["ror_survey_no"]}: {mismatch:.1%}',
                        details={
                            'segment_id': idx,
                            'survey_no': seg['ror_survey_no'],
                            'mismatch_pct': mismatch * 100
                        }
                    ))

        return violations

    def get_statistics(self, segments: gpd.GeoDataFrame) -> Dict:
        """
        Get statistics about constraint compliance.

        Args:
            segments: GeoDataFrame with matching info

        Returns:
            Dictionary of statistics
        """
        stats = {
            'expected_count': self.expected_count,
            'actual_count': len(segments),
            'count_ratio': len(segments) / self.expected_count if self.expected_count > 0 else 0,
            'expected_total_area': self.total_expected_area,
        }

        if 'area_sqm' in segments.columns or not segments.empty:
            segments_area = segments.geometry.area.sum()
            stats['actual_total_area'] = segments_area
            stats['total_area_ratio'] = segments_area / self.total_expected_area if self.total_expected_area > 0 else 0

        if 'is_matched' in segments.columns:
            stats['matched_count'] = segments['is_matched'].sum()
            stats['match_rate'] = stats['matched_count'] / len(segments) if len(segments) > 0 else 0

        if 'area_mismatch' in segments.columns:
            mismatches = segments['area_mismatch'].dropna()
            if len(mismatches) > 0:
                stats['avg_area_mismatch'] = mismatches.mean()
                stats['max_area_mismatch'] = mismatches.max()
                stats['within_tolerance'] = (mismatches <= self.area_tolerance).sum()
                stats['tolerance_rate'] = stats['within_tolerance'] / len(mismatches)

        return stats


def create_constraint_engine(ror_data: pd.DataFrame) -> RORConstraintEngine:
    """
    Create constraint engine from ROR DataFrame.

    Args:
        ror_data: DataFrame from RORLoader

    Returns:
        RORConstraintEngine instance
    """
    records = []
    for _, row in ror_data.iterrows():
        records.append({
            'survey_no': str(row.get('survey_no', '')),
            'expected_area_sqm': row.get('extent_sqm', 0),
            'land_type': row.get('land_type', 'Unknown'),
            'owner': row.get('owner_name', 'Unknown')
        })

    return RORConstraintEngine(records)

"""
Confidence Scoring Module for BoundaryAI

Calculates confidence scores for parcels and routes them for review:
- AUTO_APPROVE: High confidence (>0.85) - no human review needed
- DESKTOP_REVIEW: Medium confidence (0.60-0.85) - quick desktop check
- FIELD_VERIFICATION: Low confidence (<0.60) - needs ground truthing

This is a key innovation - prioritizing human effort where it matters most.
"""

from enum import Enum
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, field

import numpy as np
import pandas as pd
import geopandas as gpd
from shapely.geometry import Polygon


class ReviewStatus(Enum):
    """Review routing status"""
    AUTO_APPROVE = "AUTO_APPROVE"
    DESKTOP_REVIEW = "DESKTOP_REVIEW"
    FIELD_VERIFICATION = "FIELD_VERIFICATION"


@dataclass
class ConfidenceFactors:
    """Individual factors contributing to confidence score"""
    area_match: float = 0.5  # Match with ROR area
    has_ror_link: float = 0.0  # Whether linked to ROR record
    boundary_clarity: float = 0.5  # Edge clarity score
    shape_regularity: float = 0.5  # How regular/compact the shape is
    count_consistency: float = 0.5  # Village-level count consistency
    size_reasonable: float = 0.5  # Whether size is in expected range

    def to_dict(self) -> Dict[str, float]:
        return {
            'area_match': self.area_match,
            'has_ror_link': self.has_ror_link,
            'boundary_clarity': self.boundary_clarity,
            'shape_regularity': self.shape_regularity,
            'count_consistency': self.count_consistency,
            'size_reasonable': self.size_reasonable
        }


@dataclass
class ParcelConfidence:
    """Confidence assessment for a single parcel"""
    parcel_id: int
    confidence_score: float
    routing: ReviewStatus
    factors: ConfidenceFactors
    explanation: List[str] = field(default_factory=list)


class ConfidenceScorer:
    """
    Calculate confidence scores for parcels using multiple factors.

    The confidence score determines how likely the parcel boundary is correct,
    which in turn determines the review routing.
    """

    # Default weights for confidence factors
    DEFAULT_WEIGHTS = {
        'area_match': 0.30,       # High weight - ROR area is authoritative
        'has_ror_link': 0.15,     # Important - unmatched parcels are suspicious
        'boundary_clarity': 0.15, # Edge detection confidence
        'shape_regularity': 0.10, # Regular shapes more likely correct
        'count_consistency': 0.15, # Village-level sanity check
        'size_reasonable': 0.15   # Size within expected range
    }

    # Thresholds for routing
    AUTO_APPROVE_THRESHOLD = 0.85
    DESKTOP_REVIEW_THRESHOLD = 0.60

    def __init__(
        self,
        weights: Optional[Dict[str, float]] = None,
        auto_threshold: float = 0.85,
        desktop_threshold: float = 0.60
    ):
        """
        Initialize confidence scorer.

        Args:
            weights: Custom weights for factors (default: DEFAULT_WEIGHTS)
            auto_threshold: Threshold for auto-approve (default: 0.85)
            desktop_threshold: Threshold for desktop review (default: 0.60)
        """
        self.weights = weights or self.DEFAULT_WEIGHTS.copy()
        self.auto_threshold = auto_threshold
        self.desktop_threshold = desktop_threshold

        # Validate weights sum to 1
        total_weight = sum(self.weights.values())
        if abs(total_weight - 1.0) > 0.01:
            # Normalize weights
            self.weights = {k: v / total_weight for k, v in self.weights.items()}

    def calculate_shape_regularity(self, geometry: Polygon) -> float:
        """
        Calculate shape regularity using isoperimetric quotient.

        A perfect circle has IPQ = 1, irregular shapes have lower values.
        Agricultural parcels are usually somewhat regular.

        Args:
            geometry: Shapely Polygon

        Returns:
            Regularity score between 0 and 1
        """
        if not geometry.is_valid or geometry.is_empty:
            return 0.0

        area = geometry.area
        perimeter = geometry.length

        if perimeter == 0:
            return 0.0

        # Isoperimetric quotient: 4 * pi * area / perimeter^2
        # Normalized to 0-1 range (circle = 1)
        ipq = (4 * np.pi * area) / (perimeter ** 2)

        # Clip to valid range
        return min(max(ipq, 0.0), 1.0)

    def calculate_size_reasonability(
        self,
        area_sqm: float,
        min_expected: float,
        max_expected: float
    ) -> float:
        """
        Calculate how reasonable the parcel size is.

        Args:
            area_sqm: Parcel area in square meters
            min_expected: Minimum expected area
            max_expected: Maximum expected area

        Returns:
            Reasonability score between 0 and 1
        """
        # Allow some tolerance around expected range
        lower_bound = min_expected * 0.5
        upper_bound = max_expected * 1.5

        if lower_bound <= area_sqm <= upper_bound:
            return 1.0
        elif area_sqm < lower_bound:
            # Penalize based on how far below minimum
            ratio = area_sqm / lower_bound
            return max(0.0, ratio)
        else:
            # Penalize based on how far above maximum
            ratio = upper_bound / area_sqm
            return max(0.0, ratio)

    def score_parcel(
        self,
        parcel: gpd.GeoSeries,
        village_stats: Dict
    ) -> ParcelConfidence:
        """
        Calculate confidence score for a single parcel.

        Args:
            parcel: GeoSeries representing a parcel
            village_stats: Village-level statistics for context

        Returns:
            ParcelConfidence with score, routing, and explanation
        """
        factors = ConfidenceFactors()
        explanations = []

        # Factor 1: Area match with ROR
        area_mismatch = parcel.get('area_mismatch')
        if area_mismatch is not None and not pd.isna(area_mismatch):
            factors.area_match = max(0.0, 1.0 - area_mismatch)
            if factors.area_match >= 0.95:
                explanations.append(f"Area matches ROR within 5%")
            elif factors.area_match < 0.80:
                explanations.append(f"Area mismatch: {area_mismatch:.1%}")
        else:
            factors.area_match = 0.5
            explanations.append("No ROR area for comparison")

        # Factor 2: Has ROR link
        ror_survey_no = parcel.get('ror_survey_no')
        if ror_survey_no is not None and not pd.isna(ror_survey_no):
            factors.has_ror_link = 1.0
            explanations.append(f"Linked to ROR: {ror_survey_no}")
        else:
            factors.has_ror_link = 0.0
            explanations.append("No ROR match found")

        # Factor 3: Boundary clarity (use edge_score if available)
        edge_score = parcel.get('edge_score', parcel.get('boundary_clarity'))
        if edge_score is not None and not pd.isna(edge_score):
            factors.boundary_clarity = float(edge_score)
        else:
            factors.boundary_clarity = 0.5  # Default/unknown

        # Factor 4: Shape regularity
        geometry = parcel.geometry
        factors.shape_regularity = self.calculate_shape_regularity(geometry)
        if factors.shape_regularity >= 0.7:
            explanations.append("Regular parcel shape")
        elif factors.shape_regularity < 0.3:
            explanations.append("Irregular shape - verify boundary")

        # Factor 5: Count consistency
        expected_count = village_stats.get('expected_count', 0)
        actual_count = village_stats.get('actual_count', 0)
        if expected_count > 0 and actual_count > 0:
            count_ratio = min(expected_count, actual_count) / max(expected_count, actual_count)
            factors.count_consistency = count_ratio
            if count_ratio < 0.8:
                explanations.append(f"Village parcel count mismatch")
        else:
            factors.count_consistency = 0.5

        # Factor 6: Size reasonability
        area_sqm = geometry.area
        min_area = village_stats.get('min_area_sqm', 0)
        max_area = village_stats.get('max_area_sqm', float('inf'))
        factors.size_reasonable = self.calculate_size_reasonability(area_sqm, min_area, max_area)
        if factors.size_reasonable < 0.5:
            explanations.append("Unusual parcel size")

        # Calculate weighted score
        factor_dict = factors.to_dict()
        score = sum(factor_dict[k] * self.weights[k] for k in factor_dict)
        score = round(score, 3)

        # Determine routing
        if score >= self.auto_threshold:
            routing = ReviewStatus.AUTO_APPROVE
            explanations.insert(0, "High confidence - auto-approved")
        elif score >= self.desktop_threshold:
            routing = ReviewStatus.DESKTOP_REVIEW
            explanations.insert(0, "Medium confidence - desktop review")
        else:
            routing = ReviewStatus.FIELD_VERIFICATION
            explanations.insert(0, "Low confidence - field verification needed")

        return ParcelConfidence(
            parcel_id=parcel.get('parcel_id', parcel.name),
            confidence_score=score,
            routing=routing,
            factors=factors,
            explanation=explanations
        )

    def score_all_parcels(
        self,
        parcels: gpd.GeoDataFrame,
        expected_count: int,
        min_area_sqm: float,
        max_area_sqm: float
    ) -> gpd.GeoDataFrame:
        """
        Calculate confidence scores for all parcels.

        Args:
            parcels: GeoDataFrame of parcels
            expected_count: Expected parcel count from ROR
            min_area_sqm: Minimum expected area
            max_area_sqm: Maximum expected area

        Returns:
            GeoDataFrame with confidence scores and routing
        """
        parcels = parcels.copy()

        # Build village stats
        village_stats = {
            'expected_count': expected_count,
            'actual_count': len(parcels),
            'min_area_sqm': min_area_sqm,
            'max_area_sqm': max_area_sqm
        }

        # Initialize new columns
        parcels['confidence'] = 0.0
        parcels['routing'] = ''
        parcels['confidence_factors'] = None
        parcels['explanation'] = None

        # Score each parcel
        for idx in parcels.index:
            parcel = parcels.loc[idx]
            result = self.score_parcel(parcel, village_stats)

            parcels.at[idx, 'confidence'] = result.confidence_score
            parcels.at[idx, 'routing'] = result.routing.value
            parcels.at[idx, 'confidence_factors'] = result.factors.to_dict()
            parcels.at[idx, 'explanation'] = result.explanation

        return parcels

    def get_routing_summary(self, parcels: gpd.GeoDataFrame) -> Dict:
        """
        Get summary of routing distribution.

        Args:
            parcels: GeoDataFrame with routing column

        Returns:
            Dictionary with routing counts and percentages
        """
        if 'routing' not in parcels.columns:
            return {}

        total = len(parcels)
        counts = parcels['routing'].value_counts().to_dict()

        summary = {
            'total': total,
            'auto_approve': {
                'count': counts.get('AUTO_APPROVE', 0),
                'percentage': counts.get('AUTO_APPROVE', 0) / total * 100 if total > 0 else 0
            },
            'desktop_review': {
                'count': counts.get('DESKTOP_REVIEW', 0),
                'percentage': counts.get('DESKTOP_REVIEW', 0) / total * 100 if total > 0 else 0
            },
            'field_verification': {
                'count': counts.get('FIELD_VERIFICATION', 0),
                'percentage': counts.get('FIELD_VERIFICATION', 0) / total * 100 if total > 0 else 0
            }
        }

        # Add average confidence
        if 'confidence' in parcels.columns:
            summary['avg_confidence'] = parcels['confidence'].mean()

        return summary

    def get_priority_list(
        self,
        parcels: gpd.GeoDataFrame,
        status: ReviewStatus = ReviewStatus.FIELD_VERIFICATION
    ) -> gpd.GeoDataFrame:
        """
        Get parcels for a specific review status, sorted by priority.

        Args:
            parcels: GeoDataFrame with routing column
            status: Review status to filter by

        Returns:
            Filtered and sorted GeoDataFrame
        """
        if 'routing' not in parcels.columns:
            return gpd.GeoDataFrame()

        filtered = parcels[parcels['routing'] == status.value].copy()

        # Sort by confidence (lowest first = highest priority)
        filtered = filtered.sort_values('confidence', ascending=True)

        return filtered


class ConflictDetector:
    """
    Detect conflicts between generated parcels and ROR records.

    Conflicts include:
    - Area mismatches
    - Missing parcels (ROR without segment)
    - Extra parcels (segment without ROR)
    - Topology issues
    """

    def __init__(self, area_threshold: float = 0.05):
        """
        Initialize conflict detector.

        Args:
            area_threshold: Area mismatch threshold (default 5%)
        """
        self.area_threshold = area_threshold

    def detect_conflicts(
        self,
        parcels: gpd.GeoDataFrame,
        ror_records: List[Dict]
    ) -> List[Dict]:
        """
        Detect all conflicts.

        Args:
            parcels: GeoDataFrame with matching info
            ror_records: List of ROR records

        Returns:
            List of conflict dictionaries
        """
        conflicts = []

        # Check area mismatches
        if 'area_mismatch' in parcels.columns:
            for idx, row in parcels.iterrows():
                mismatch = row.get('area_mismatch')
                if mismatch is not None and not pd.isna(mismatch):
                    if mismatch > 0.20:
                        severity = 'HIGH'
                    elif mismatch > self.area_threshold:
                        severity = 'MEDIUM'
                    else:
                        continue

                    conflicts.append({
                        'type': 'AREA_MISMATCH',
                        'severity': severity,
                        'parcel_id': idx,
                        'survey_no': row.get('ror_survey_no'),
                        'generated_area_sqm': row.geometry.area,
                        'ror_area_sqm': row.get('ror_area_sqm'),
                        'mismatch_pct': mismatch * 100,
                        'message': f"Area mismatch: {mismatch:.1%}"
                    })

        # Check for extra parcels (no ROR match)
        if 'ror_survey_no' in parcels.columns:
            extra = parcels[parcels['ror_survey_no'].isna()]
            for idx, row in extra.iterrows():
                conflicts.append({
                    'type': 'EXTRA_PARCEL',
                    'severity': 'HIGH',
                    'parcel_id': idx,
                    'survey_no': None,
                    'area_sqm': row.geometry.area,
                    'message': f"No ROR record found for parcel"
                })

            # Check for missing ROR records
            matched_survey_nos = set(parcels['ror_survey_no'].dropna())
            all_survey_nos = set(r.get('survey_no') for r in ror_records)
            missing = all_survey_nos - matched_survey_nos

            for survey_no in missing:
                conflicts.append({
                    'type': 'MISSING_PARCEL',
                    'severity': 'HIGH',
                    'parcel_id': None,
                    'survey_no': survey_no,
                    'message': f"ROR record {survey_no} has no matching parcel"
                })

        return conflicts

    def get_conflict_summary(self, conflicts: List[Dict]) -> Dict:
        """
        Get summary of conflicts by type and severity.

        Args:
            conflicts: List of conflict dictionaries

        Returns:
            Summary dictionary
        """
        summary = {
            'total': len(conflicts),
            'by_type': {},
            'by_severity': {
                'HIGH': 0,
                'MEDIUM': 0,
                'LOW': 0
            }
        }

        for conflict in conflicts:
            # Count by type
            conflict_type = conflict.get('type', 'UNKNOWN')
            if conflict_type not in summary['by_type']:
                summary['by_type'][conflict_type] = 0
            summary['by_type'][conflict_type] += 1

            # Count by severity
            severity = conflict.get('severity', 'MEDIUM')
            if severity in summary['by_severity']:
                summary['by_severity'][severity] += 1

        return summary


# Convenience functions

def score_parcels(
    parcels: gpd.GeoDataFrame,
    expected_count: int,
    min_area_sqm: float = 100,
    max_area_sqm: float = 50000
) -> gpd.GeoDataFrame:
    """
    Score parcels with default settings.

    Args:
        parcels: GeoDataFrame of parcels
        expected_count: Expected count from ROR
        min_area_sqm: Minimum expected area
        max_area_sqm: Maximum expected area

    Returns:
        GeoDataFrame with scores
    """
    scorer = ConfidenceScorer()
    return scorer.score_all_parcels(parcels, expected_count, min_area_sqm, max_area_sqm)


def get_routing_stats(parcels: gpd.GeoDataFrame) -> Dict:
    """Get routing statistics for scored parcels."""
    scorer = ConfidenceScorer()
    return scorer.get_routing_summary(parcels)

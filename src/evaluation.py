"""
Evaluation Module for BoundaryAI

Compares detected parcels against ground truth and computes metrics.
Supports ablation testing with configurable innovation flags.
"""

from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
import numpy as np
import geopandas as gpd
from shapely.geometry import Polygon
from scipy.optimize import linear_sum_assignment


@dataclass
class ParcelMetrics:
    """Metrics for a single parcel comparison."""
    parcel_id: str
    iou: float  # Intersection over Union
    area_error: float  # Relative area error
    boundary_distance: float  # Average boundary distance
    matched: bool


@dataclass
class EvaluationResult:
    """Aggregated evaluation results."""
    config_name: str
    flags: Dict[str, bool]

    # Aggregate metrics
    mean_iou: float
    median_iou: float
    mean_area_error: float
    median_area_error: float
    mean_boundary_distance: float

    # Counts
    total_ground_truth: int
    total_detected: int
    matched_count: int
    match_rate: float

    # Thresholded accuracy
    iou_above_50: float  # % of parcels with IoU > 0.5
    iou_above_70: float  # % of parcels with IoU > 0.7
    area_within_10: float  # % within 10% area error
    area_within_20: float  # % within 20% area error

    # Per-parcel details
    parcel_metrics: List[ParcelMetrics]


class ParcelEvaluator:
    """
    Evaluates detected parcels against ground truth.

    Metrics computed:
    - IoU (Intersection over Union): How well boundaries overlap
    - Area Error: |detected - ground_truth| / ground_truth
    - Boundary Distance: Average Hausdorff distance between boundaries
    """

    def __init__(self, iou_threshold: float = 0.3):
        """
        Args:
            iou_threshold: Minimum IoU to consider a match
        """
        self.iou_threshold = iou_threshold

    def evaluate(
        self,
        detected: gpd.GeoDataFrame,
        ground_truth: gpd.GeoDataFrame,
        config_name: str = "default",
        flags: Dict[str, bool] = None
    ) -> EvaluationResult:
        """
        Compare detected parcels against ground truth.

        Args:
            detected: GeoDataFrame with detected parcel geometries
            ground_truth: GeoDataFrame with ground truth geometries
            config_name: Name for this configuration
            flags: Innovation flags used

        Returns:
            EvaluationResult with all metrics
        """
        flags = flags or {}

        if len(detected) == 0:
            return self._empty_result(config_name, flags, len(ground_truth))

        # Match detected parcels to ground truth using IoU
        matches = self._match_parcels(detected, ground_truth)

        # Compute per-parcel metrics
        parcel_metrics = []
        for gt_idx, det_idx, iou in matches:
            gt_geom = ground_truth.iloc[gt_idx].geometry
            gt_id = ground_truth.iloc[gt_idx].get('LP_NUMBER',
                    ground_truth.iloc[gt_idx].get('lp_number', f'GT_{gt_idx}'))

            if det_idx is not None:
                det_geom = detected.iloc[det_idx].geometry

                # Compute metrics
                area_error = abs(det_geom.area - gt_geom.area) / gt_geom.area if gt_geom.area > 0 else 1.0
                boundary_dist = self._boundary_distance(det_geom, gt_geom)

                parcel_metrics.append(ParcelMetrics(
                    parcel_id=str(gt_id),
                    iou=iou,
                    area_error=area_error,
                    boundary_distance=boundary_dist,
                    matched=True
                ))
            else:
                parcel_metrics.append(ParcelMetrics(
                    parcel_id=str(gt_id),
                    iou=0.0,
                    area_error=1.0,
                    boundary_distance=float('inf'),
                    matched=False
                ))

        # Aggregate metrics
        matched_metrics = [m for m in parcel_metrics if m.matched]
        all_ious = [m.iou for m in parcel_metrics]
        all_errors = [m.area_error for m in matched_metrics] if matched_metrics else [1.0]
        all_dists = [m.boundary_distance for m in matched_metrics if m.boundary_distance < float('inf')]

        return EvaluationResult(
            config_name=config_name,
            flags=flags,

            mean_iou=np.mean(all_ious),
            median_iou=np.median(all_ious),
            mean_area_error=np.mean(all_errors),
            median_area_error=np.median(all_errors),
            mean_boundary_distance=np.mean(all_dists) if all_dists else float('inf'),

            total_ground_truth=len(ground_truth),
            total_detected=len(detected),
            matched_count=len(matched_metrics),
            match_rate=len(matched_metrics) / len(ground_truth) if len(ground_truth) > 0 else 0,

            iou_above_50=sum(1 for m in parcel_metrics if m.iou > 0.5) / len(parcel_metrics),
            iou_above_70=sum(1 for m in parcel_metrics if m.iou > 0.7) / len(parcel_metrics),
            area_within_10=sum(1 for m in matched_metrics if m.area_error <= 0.1) / len(matched_metrics) if matched_metrics else 0,
            area_within_20=sum(1 for m in matched_metrics if m.area_error <= 0.2) / len(matched_metrics) if matched_metrics else 0,

            parcel_metrics=parcel_metrics
        )

    def _match_parcels(
        self,
        detected: gpd.GeoDataFrame,
        ground_truth: gpd.GeoDataFrame
    ) -> List[Tuple[int, Optional[int], float]]:
        """
        Match detected parcels to ground truth using IoU.
        Returns list of (gt_idx, det_idx or None, iou).
        """
        n_gt = len(ground_truth)
        n_det = len(detected)

        # Build IoU matrix
        iou_matrix = np.zeros((n_gt, n_det))
        for i, gt_row in ground_truth.iterrows():
            for j, det_row in detected.iterrows():
                iou_matrix[i, j] = self._compute_iou(
                    gt_row.geometry, det_row.geometry
                )

        # Use Hungarian algorithm for optimal matching
        # Negate IoU for minimization (we want max IoU)
        cost_matrix = 1 - iou_matrix
        gt_indices, det_indices = linear_sum_assignment(cost_matrix)

        # Build matches list
        matches = []
        matched_gt = set()

        for gt_idx, det_idx in zip(gt_indices, det_indices):
            iou = iou_matrix[gt_idx, det_idx]
            if iou >= self.iou_threshold:
                matches.append((gt_idx, det_idx, iou))
                matched_gt.add(gt_idx)
            else:
                matches.append((gt_idx, None, 0.0))
                matched_gt.add(gt_idx)

        # Add unmatched ground truth parcels
        for i in range(n_gt):
            if i not in matched_gt:
                matches.append((i, None, 0.0))

        return matches

    def _compute_iou(self, geom1: Polygon, geom2: Polygon) -> float:
        """Compute Intersection over Union between two geometries."""
        try:
            if not geom1.is_valid:
                geom1 = geom1.buffer(0)
            if not geom2.is_valid:
                geom2 = geom2.buffer(0)

            intersection = geom1.intersection(geom2).area
            union = geom1.union(geom2).area

            if union == 0:
                return 0.0
            return intersection / union
        except Exception:
            return 0.0

    def _boundary_distance(self, geom1: Polygon, geom2: Polygon) -> float:
        """Compute average boundary distance between two polygons."""
        try:
            # Sample points along both boundaries
            boundary1 = geom1.boundary
            boundary2 = geom2.boundary

            # Sample 50 points along each boundary
            points1 = [boundary1.interpolate(i/50, normalized=True) for i in range(50)]
            points2 = [boundary2.interpolate(i/50, normalized=True) for i in range(50)]

            # Compute distances from points1 to boundary2
            dists1 = [p.distance(boundary2) for p in points1]
            dists2 = [p.distance(boundary1) for p in points2]

            # Average of both directions (symmetric)
            return (np.mean(dists1) + np.mean(dists2)) / 2

        except Exception:
            return float('inf')

    def _empty_result(
        self,
        config_name: str,
        flags: Dict,
        n_gt: int
    ) -> EvaluationResult:
        """Return empty result when no detections."""
        return EvaluationResult(
            config_name=config_name,
            flags=flags,
            mean_iou=0.0,
            median_iou=0.0,
            mean_area_error=1.0,
            median_area_error=1.0,
            mean_boundary_distance=float('inf'),
            total_ground_truth=n_gt,
            total_detected=0,
            matched_count=0,
            match_rate=0.0,
            iou_above_50=0.0,
            iou_above_70=0.0,
            area_within_10=0.0,
            area_within_20=0.0,
            parcel_metrics=[]
        )


def print_evaluation_result(result: EvaluationResult):
    """Pretty print evaluation results."""
    print(f"\n{'='*60}")
    print(f"Configuration: {result.config_name}")
    print(f"{'='*60}")

    print(f"\nFlags:")
    for flag, value in result.flags.items():
        status = "✓ ON" if value else "✗ OFF"
        print(f"  {flag}: {status}")

    print(f"\nMatching:")
    print(f"  Ground Truth Parcels: {result.total_ground_truth}")
    print(f"  Detected Parcels:     {result.total_detected}")
    print(f"  Matched Parcels:      {result.matched_count}")
    print(f"  Match Rate:           {result.match_rate:.1%}")

    print(f"\nIoU (Intersection over Union):")
    print(f"  Mean IoU:    {result.mean_iou:.3f}")
    print(f"  Median IoU:  {result.median_iou:.3f}")
    print(f"  IoU > 0.5:   {result.iou_above_50:.1%}")
    print(f"  IoU > 0.7:   {result.iou_above_70:.1%}")

    print(f"\nArea Accuracy:")
    print(f"  Mean Error:     {result.mean_area_error:.1%}")
    print(f"  Median Error:   {result.median_area_error:.1%}")
    print(f"  Within 10%:     {result.area_within_10:.1%}")
    print(f"  Within 20%:     {result.area_within_20:.1%}")

    print(f"\nBoundary Distance:")
    if result.mean_boundary_distance < float('inf'):
        print(f"  Mean Distance:  {result.mean_boundary_distance:.2f} units")
    else:
        print(f"  Mean Distance:  N/A (no matches)")


def compare_configurations(results: List[EvaluationResult]):
    """Compare multiple configuration results side by side."""
    print(f"\n{'='*80}")
    print("CONFIGURATION COMPARISON")
    print(f"{'='*80}")

    # Header
    headers = ["Metric"] + [r.config_name for r in results]
    col_width = max(15, max(len(h) for h in headers))

    print(f"\n{headers[0]:<20}", end="")
    for h in headers[1:]:
        print(f"{h:>{col_width}}", end="")
    print()
    print("-" * (20 + col_width * len(results)))

    # Metrics rows
    metrics = [
        ("Match Rate", lambda r: f"{r.match_rate:.1%}"),
        ("Mean IoU", lambda r: f"{r.mean_iou:.3f}"),
        ("IoU > 0.5", lambda r: f"{r.iou_above_50:.1%}"),
        ("IoU > 0.7", lambda r: f"{r.iou_above_70:.1%}"),
        ("Mean Area Error", lambda r: f"{r.mean_area_error:.1%}"),
        ("Area within 10%", lambda r: f"{r.area_within_10:.1%}"),
        ("Area within 20%", lambda r: f"{r.area_within_20:.1%}"),
    ]

    for metric_name, metric_fn in metrics:
        print(f"{metric_name:<20}", end="")
        for r in results:
            print(f"{metric_fn(r):>{col_width}}", end="")
        print()

    # Highlight best configuration
    print(f"\n{'='*80}")
    best_by_iou = max(results, key=lambda r: r.mean_iou)
    best_by_area = min(results, key=lambda r: r.mean_area_error)

    print(f"Best by IoU:        {best_by_iou.config_name} (IoU={best_by_iou.mean_iou:.3f})")
    print(f"Best by Area Error: {best_by_area.config_name} (Error={best_by_area.mean_area_error:.1%})")

/**
 * Accuracy utilities for comparing polygons against ground truth.
 * Calculates IoU (Intersection over Union) and other metrics.
 */

import * as turf from '@turf/turf';
import type { Feature, Polygon } from 'geojson';

export interface PolygonAccuracy {
  polygonId: string;
  groundTruthId: string | null;
  iou: number; // 0-1
  matchType: 'matched' | 'unmatched' | 'no-ground-truth';
  needsReview: boolean;
}

export interface AccuracyMetrics {
  overallIoU: number;
  matchedCount: number;
  unmatchedCount: number;
  noGroundTruthCount: number;
  belowThresholdCount: number;
  aboveThresholdCount: number;
  parcelsNeedingReview: PolygonAccuracy[];
  perPolygonAccuracy: PolygonAccuracy[];
}

const ACCURACY_THRESHOLD = 0.85; // 85% IoU threshold from requirements

/**
 * Calculate Intersection over Union (IoU) between two polygons.
 */
export function calculateIoU(
  polygon1: Feature<Polygon>,
  polygon2: Feature<Polygon>
): number {
  try {
    const intersection = turf.intersect(
      turf.featureCollection([polygon1, polygon2])
    );

    if (!intersection) return 0;

    const union = turf.union(
      turf.featureCollection([polygon1, polygon2])
    );

    if (!union) return 0;

    const intersectionArea = turf.area(intersection);
    const unionArea = turf.area(union);

    if (unionArea === 0) return 0;

    return intersectionArea / unionArea;
  } catch (e) {
    console.warn('Error calculating IoU:', e);
    return 0;
  }
}

/**
 * Find the best matching ground truth polygon for a given polygon.
 * Uses centroid proximity and IoU to find the best match.
 */
export function findBestMatch(
  polygon: Feature<Polygon>,
  groundTruth: Feature<Polygon>[]
): { match: Feature<Polygon> | null; iou: number } {
  let bestMatch: Feature<Polygon> | null = null;
  let bestIoU = 0;

  const polygonCentroid = turf.centroid(polygon);
  const polygonBbox = turf.bbox(polygon);

  for (const gt of groundTruth) {
    try {
      // Quick rejection based on bounding box
      const gtBbox = turf.bbox(gt) as [number, number, number, number];
      if (!bboxOverlaps(polygonBbox as [number, number, number, number], gtBbox)) continue;

      // Check centroid distance for quick filtering
      const gtCentroid = turf.centroid(gt);
      const distance = turf.distance(polygonCentroid, gtCentroid, { units: 'meters' });

      // Skip if centroids are too far apart (more than 100m)
      if (distance > 100) continue;

      const iou = calculateIoU(polygon, gt);

      if (iou > bestIoU) {
        bestIoU = iou;
        bestMatch = gt;
      }
    } catch (e) {
      // Skip invalid geometries
    }
  }

  return { match: bestMatch, iou: bestIoU };
}

/**
 * Check if two bounding boxes overlap.
 */
function bboxOverlaps(
  bbox1: [number, number, number, number],
  bbox2: [number, number, number, number]
): boolean {
  return !(
    bbox1[2] < bbox2[0] ||
    bbox1[0] > bbox2[2] ||
    bbox1[3] < bbox2[1] ||
    bbox1[1] > bbox2[3]
  );
}

/**
 * Calculate accuracy metrics for a collection of polygons against ground truth.
 */
export function calculateAccuracyMetrics(
  polygons: Feature<Polygon>[],
  groundTruth: Feature<Polygon>[]
): AccuracyMetrics {
  const perPolygonAccuracy: PolygonAccuracy[] = [];
  const parcelsNeedingReview: PolygonAccuracy[] = [];

  let totalIoU = 0;
  let matchedCount = 0;
  let unmatchedCount = 0;
  let noGroundTruthCount = 0;
  let belowThresholdCount = 0;
  let aboveThresholdCount = 0;

  // If no ground truth, all polygons are unmatched
  if (groundTruth.length === 0) {
    for (const poly of polygons) {
      const accuracy: PolygonAccuracy = {
        polygonId: poly.properties?.id || 'unknown',
        groundTruthId: null,
        iou: 0,
        matchType: 'no-ground-truth',
        needsReview: true,
      };
      perPolygonAccuracy.push(accuracy);
      parcelsNeedingReview.push(accuracy);
      noGroundTruthCount++;
    }

    return {
      overallIoU: 0,
      matchedCount: 0,
      unmatchedCount: 0,
      noGroundTruthCount,
      belowThresholdCount: 0,
      aboveThresholdCount: 0,
      parcelsNeedingReview,
      perPolygonAccuracy,
    };
  }

  // Match each polygon to ground truth
  for (const poly of polygons) {
    const polygonId = poly.properties?.id || 'unknown';
    const { match, iou } = findBestMatch(poly, groundTruth);

    let accuracy: PolygonAccuracy;

    if (match && iou > 0.1) {
      // Consider it a match if IoU > 10%
      matchedCount++;
      totalIoU += iou;

      const needsReview = iou < ACCURACY_THRESHOLD;
      if (needsReview) {
        belowThresholdCount++;
      } else {
        aboveThresholdCount++;
      }

      accuracy = {
        polygonId,
        groundTruthId: match.properties?.id || 'unknown',
        iou,
        matchType: 'matched',
        needsReview,
      };

      if (needsReview) {
        parcelsNeedingReview.push(accuracy);
      }
    } else {
      // No match found
      unmatchedCount++;
      accuracy = {
        polygonId,
        groundTruthId: null,
        iou: 0,
        matchType: 'unmatched',
        needsReview: true,
      };
      parcelsNeedingReview.push(accuracy);
    }

    perPolygonAccuracy.push(accuracy);
  }

  // Sort parcels needing review by IoU (worst first)
  parcelsNeedingReview.sort((a, b) => a.iou - b.iou);

  const overallIoU = matchedCount > 0 ? totalIoU / matchedCount : 0;

  return {
    overallIoU,
    matchedCount,
    unmatchedCount,
    noGroundTruthCount,
    belowThresholdCount,
    aboveThresholdCount,
    parcelsNeedingReview,
    perPolygonAccuracy,
  };
}

/**
 * Get color for accuracy score (red for low, green for high).
 */
export function getAccuracyColor(iou: number): string {
  if (iou >= ACCURACY_THRESHOLD) {
    return '#22c55e'; // green-500
  } else if (iou >= 0.7) {
    return '#eab308'; // yellow-500
  } else if (iou >= 0.5) {
    return '#f97316'; // orange-500
  } else {
    return '#ef4444'; // red-500
  }
}

/**
 * Format IoU as percentage string.
 */
export function formatAccuracy(iou: number): string {
  return `${(iou * 100).toFixed(1)}%`;
}

/**
 * Check if overall accuracy meets the threshold.
 */
export function meetsAccuracyTarget(metrics: AccuracyMetrics): boolean {
  return metrics.overallIoU >= ACCURACY_THRESHOLD;
}

/**
 * Generate accuracy summary for export/display.
 */
export function generateAccuracySummary(metrics: AccuracyMetrics): string {
  const lines = [
    `Accuracy Summary`,
    `================`,
    `Overall IoU: ${formatAccuracy(metrics.overallIoU)}`,
    `Target: ${formatAccuracy(ACCURACY_THRESHOLD)}`,
    `Status: ${meetsAccuracyTarget(metrics) ? 'PASSED ✓' : 'BELOW TARGET ✗'}`,
    ``,
    `Breakdown:`,
    `- Matched polygons: ${metrics.matchedCount}`,
    `- Above threshold (≥85%): ${metrics.aboveThresholdCount}`,
    `- Below threshold (<85%): ${metrics.belowThresholdCount}`,
    `- Unmatched: ${metrics.unmatchedCount}`,
    ``,
    `Parcels needing field review: ${metrics.parcelsNeedingReview.length}`,
  ];

  return lines.join('\n');
}

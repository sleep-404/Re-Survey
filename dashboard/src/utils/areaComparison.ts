import * as turf from '@turf/turf';
import type { Feature, Polygon } from 'geojson';
import type { RORRecord } from '../types/ror';
import type { ParcelFeature } from '../types';

export interface AreaComparison {
  polygonId: string;
  lpNumber: number | null;
  drawnAreaSqm: number;
  expectedAreaSqm: number | null;
  differenceSqm: number | null;
  differencePercent: number | null;
  matchQuality: 'excellent' | 'good' | 'fair' | 'poor' | 'no-match';
}

/**
 * Calculate drawn area of a polygon in square meters
 */
export function calculateArea(polygon: Feature<Polygon>): number {
  try {
    return turf.area(polygon);
  } catch {
    return 0;
  }
}

/**
 * Determine match quality based on percentage difference
 * Based on 5% permissible error from requirements
 */
export function getMatchQuality(differencePercent: number | null): AreaComparison['matchQuality'] {
  if (differencePercent === null) return 'no-match';
  const absDiff = Math.abs(differencePercent);
  if (absDiff <= 5) return 'excellent';   // Within 5% - meets requirement
  if (absDiff <= 10) return 'good';       // Within 10%
  if (absDiff <= 20) return 'fair';       // Within 20%
  return 'poor';                           // Over 20% difference
}

/**
 * Get color for match quality
 */
export function getMatchQualityColor(quality: AreaComparison['matchQuality']): string {
  switch (quality) {
    case 'excellent': return '#22c55e'; // green-500
    case 'good': return '#84cc16';      // lime-500
    case 'fair': return '#eab308';      // yellow-500
    case 'poor': return '#ef4444';      // red-500
    case 'no-match': return '#6b7280';  // gray-500
  }
}

/**
 * Compare a polygon against ROR record by LP number
 */
export function comparePolygonToROR(
  polygon: ParcelFeature,
  rorRecords: RORRecord[]
): AreaComparison {
  const polygonId = polygon.properties.id;
  const drawnAreaSqm = calculateArea(polygon as Feature<Polygon>);

  // Try to find matching ROR record by lp_no property
  const lpNo = polygon.properties.lp_no || polygon.properties.lpNumber;
  const rorRecord = lpNo ? rorRecords.find(r => r.lpNumber === lpNo) : null;

  if (!rorRecord) {
    return {
      polygonId,
      lpNumber: lpNo || null,
      drawnAreaSqm,
      expectedAreaSqm: null,
      differenceSqm: null,
      differencePercent: null,
      matchQuality: 'no-match',
    };
  }

  const expectedAreaSqm = rorRecord.extentSqm;
  const differenceSqm = drawnAreaSqm - expectedAreaSqm;
  const differencePercent = (differenceSqm / expectedAreaSqm) * 100;

  return {
    polygonId,
    lpNumber: rorRecord.lpNumber,
    drawnAreaSqm,
    expectedAreaSqm,
    differenceSqm,
    differencePercent,
    matchQuality: getMatchQuality(differencePercent),
  };
}

/**
 * Format area with appropriate unit (m² or ha)
 */
export function formatArea(sqm: number): string {
  if (sqm < 10000) return `${sqm.toFixed(0)} m²`;
  return `${(sqm / 10000).toFixed(2)} ha`;
}

/**
 * Format difference percentage with sign
 */
export function formatDifferencePercent(percent: number | null): string {
  if (percent === null) return 'N/A';
  const sign = percent >= 0 ? '+' : '';
  return `${sign}${percent.toFixed(1)}%`;
}

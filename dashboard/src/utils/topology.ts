/**
 * Topology validation utilities for detecting overlaps and gaps between polygons.
 * Uses Turf.js for geometry operations.
 */

import * as turf from '@turf/turf';
import type { Feature, Polygon, MultiPolygon } from 'geojson';

export interface TopologyError {
  id: string;
  type: 'overlap' | 'gap';
  geometry: Feature<Polygon | MultiPolygon>;
  area: number; // in square meters
  affectedPolygonIds: string[];
  canAutoFix: boolean;
}

export interface TopologyValidationResult {
  isValid: boolean;
  overlaps: TopologyError[];
  gaps: TopologyError[];
  totalOverlapArea: number;
  totalGapArea: number;
}

/**
 * Detect overlapping polygons in a collection.
 * Returns list of overlap geometries with affected polygon IDs.
 */
export function detectOverlaps(
  polygons: Feature<Polygon>[]
): TopologyError[] {
  const overlaps: TopologyError[] = [];
  const checked = new Set<string>();

  for (let i = 0; i < polygons.length; i++) {
    for (let j = i + 1; j < polygons.length; j++) {
      const poly1 = polygons[i];
      const poly2 = polygons[j];
      const id1 = poly1.properties?.id || `poly-${i}`;
      const id2 = poly2.properties?.id || `poly-${j}`;
      const pairKey = [id1, id2].sort().join('-');

      if (checked.has(pairKey)) continue;
      checked.add(pairKey);

      try {
        // Check if bounding boxes intersect first (fast rejection)
        const bbox1 = turf.bbox(poly1) as [number, number, number, number];
        const bbox2 = turf.bbox(poly2) as [number, number, number, number];
        if (!bboxIntersects(bbox1, bbox2)) continue;

        // Calculate intersection
        const intersection = turf.intersect(
          turf.featureCollection([poly1, poly2])
        );

        if (intersection && turf.area(intersection) > 0.01) {
          const area = turf.area(intersection);
          overlaps.push({
            id: `overlap-${id1}-${id2}`,
            type: 'overlap',
            geometry: intersection as Feature<Polygon | MultiPolygon>,
            area,
            affectedPolygonIds: [id1, id2],
            canAutoFix: area < 1, // Can auto-fix if less than 1 sqm
          });
        }
      } catch (e) {
        // Skip invalid geometries
        console.warn(`Error checking overlap between ${id1} and ${id2}:`, e);
      }
    }
  }

  return overlaps;
}

/**
 * Detect gaps between adjacent polygons.
 * Creates a union of all polygons and finds holes.
 */
export function detectGaps(
  polygons: Feature<Polygon>[],
  boundaryPolygon?: Feature<Polygon>
): TopologyError[] {
  const gaps: TopologyError[] = [];

  if (polygons.length < 2) return gaps;

  try {
    // Create union of all polygons
    let union: Feature<Polygon | MultiPolygon> | null = null;

    for (const poly of polygons) {
      if (!union) {
        union = poly as Feature<Polygon | MultiPolygon>;
      } else {
        const result: Feature<Polygon | MultiPolygon> | null = turf.union(turf.featureCollection([union, poly]));
        if (result) {
          union = result;
        }
      }
    }

    if (!union) return gaps;

    // If we have a boundary, find gaps between union and boundary
    if (boundaryPolygon) {
      const difference = turf.difference(
        turf.featureCollection([boundaryPolygon, union])
      );

      if (difference) {
        const area = turf.area(difference);
        if (area > 0.01) {
          gaps.push({
            id: `gap-boundary`,
            type: 'gap',
            geometry: difference as Feature<Polygon | MultiPolygon>,
            area,
            affectedPolygonIds: [],
            canAutoFix: area < 0.5,
          });
        }
      }
    }

    // Find internal holes in the union (gaps between polygons)
    const unionGeom = union.geometry;
    if (unionGeom.type === 'Polygon' && unionGeom.coordinates.length > 1) {
      // Holes are additional coordinate rings after the first one
      for (let i = 1; i < unionGeom.coordinates.length; i++) {
        const holeCoords = unionGeom.coordinates[i];
        const holePolygon = turf.polygon([holeCoords]);
        const area = turf.area(holePolygon);

        if (area > 0.01) {
          // Find which polygons are adjacent to this gap
          const adjacentIds = findAdjacentPolygons(holePolygon, polygons);

          gaps.push({
            id: `gap-${i}`,
            type: 'gap',
            geometry: holePolygon,
            area,
            affectedPolygonIds: adjacentIds,
            canAutoFix: area < 0.5,
          });
        }
      }
    } else if (unionGeom.type === 'MultiPolygon') {
      // Check each polygon in the multipolygon for holes
      unionGeom.coordinates.forEach((polyCoords, polyIdx) => {
        for (let i = 1; i < polyCoords.length; i++) {
          const holeCoords = polyCoords[i];
          const holePolygon = turf.polygon([holeCoords]);
          const area = turf.area(holePolygon);

          if (area > 0.01) {
            const adjacentIds = findAdjacentPolygons(holePolygon, polygons);

            gaps.push({
              id: `gap-${polyIdx}-${i}`,
              type: 'gap',
              geometry: holePolygon,
              area,
              affectedPolygonIds: adjacentIds,
              canAutoFix: area < 0.5,
            });
          }
        }
      });
    }
  } catch (e) {
    console.warn('Error detecting gaps:', e);
  }

  return gaps;
}

/**
 * Find polygons that are adjacent to a given geometry.
 */
function findAdjacentPolygons(
  geometry: Feature<Polygon>,
  polygons: Feature<Polygon>[]
): string[] {
  const adjacent: string[] = [];
  const buffered = turf.buffer(geometry, 0.5, { units: 'meters' });

  if (!buffered) return adjacent;

  for (const poly of polygons) {
    try {
      if (turf.booleanIntersects(buffered, poly)) {
        const id = poly.properties?.id;
        if (id) adjacent.push(id);
      }
    } catch (e) {
      // Skip invalid geometries
    }
  }

  return adjacent;
}

/**
 * Check if two bounding boxes intersect.
 */
function bboxIntersects(
  bbox1: [number, number, number, number],
  bbox2: [number, number, number, number]
): boolean {
  return !(
    bbox1[2] < bbox2[0] || // bbox1 is left of bbox2
    bbox1[0] > bbox2[2] || // bbox1 is right of bbox2
    bbox1[3] < bbox2[1] || // bbox1 is below bbox2
    bbox1[1] > bbox2[3]    // bbox1 is above bbox2
  );
}

/**
 * Run full topology validation on a polygon collection.
 */
export function validateTopology(
  polygons: Feature<Polygon>[],
  boundaryPolygon?: Feature<Polygon>
): TopologyValidationResult {
  const overlaps = detectOverlaps(polygons);
  const gaps = detectGaps(polygons, boundaryPolygon);

  const totalOverlapArea = overlaps.reduce((sum, o) => sum + o.area, 0);
  const totalGapArea = gaps.reduce((sum, g) => sum + g.area, 0);

  return {
    isValid: overlaps.length === 0 && gaps.length === 0,
    overlaps,
    gaps,
    totalOverlapArea,
    totalGapArea,
  };
}

/**
 * Attempt to auto-fix small overlaps by subtracting from the larger polygon.
 */
export function fixOverlap(
  overlap: TopologyError,
  polygons: Feature<Polygon>[]
): Feature<Polygon>[] | null {
  if (!overlap.canAutoFix || overlap.affectedPolygonIds.length !== 2) {
    return null;
  }

  const [id1, id2] = overlap.affectedPolygonIds;
  const poly1 = polygons.find(p => p.properties?.id === id1);
  const poly2 = polygons.find(p => p.properties?.id === id2);

  if (!poly1 || !poly2) return null;

  try {
    // Subtract overlap from the larger polygon
    const area1 = turf.area(poly1);
    const area2 = turf.area(poly2);

    const larger = area1 >= area2 ? poly1 : poly2;
    const result = turf.difference(
      turf.featureCollection([larger, overlap.geometry])
    );

    if (result && result.geometry.type === 'Polygon') {
      return polygons.map(p => {
        if (p.properties?.id === larger.properties?.id) {
          return {
            ...p,
            geometry: result.geometry as Polygon,
          };
        }
        return p;
      });
    }
  } catch (e) {
    console.warn('Error fixing overlap:', e);
  }

  return null;
}

/**
 * Attempt to auto-fix small gaps by expanding adjacent polygons.
 */
export function fixGap(
  gap: TopologyError,
  polygons: Feature<Polygon>[]
): Feature<Polygon>[] | null {
  if (!gap.canAutoFix || gap.affectedPolygonIds.length === 0) {
    return null;
  }

  try {
    // Find the adjacent polygon with the longest shared boundary
    let bestMatch: Feature<Polygon> | null = null;
    let bestLength = 0;

    for (const id of gap.affectedPolygonIds) {
      const poly = polygons.find(p => p.properties?.id === id);
      if (!poly) continue;

      // Calculate shared boundary length
      const bufferedGap = turf.buffer(gap.geometry, 0.1, { units: 'meters' });
      if (!bufferedGap) continue;

      const intersection = turf.intersect(
        turf.featureCollection([bufferedGap, poly])
      );

      if (intersection) {
        const length = turf.length(turf.polygonToLine(intersection as Feature<Polygon>));
        if (length > bestLength) {
          bestLength = length;
          bestMatch = poly;
        }
      }
    }

    if (bestMatch) {
      // Expand the best matching polygon to fill the gap
      const union = turf.union(
        turf.featureCollection([bestMatch, gap.geometry])
      );

      if (union && union.geometry.type === 'Polygon') {
        return polygons.map(p => {
          if (p.properties?.id === bestMatch!.properties?.id) {
            return {
              ...p,
              geometry: union.geometry as Polygon,
            };
          }
          return p;
        });
      }
    }
  } catch (e) {
    console.warn('Error fixing gap:', e);
  }

  return null;
}

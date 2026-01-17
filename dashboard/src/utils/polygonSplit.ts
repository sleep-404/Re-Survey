import { polygon, lineString, buffer, difference, booleanPointInPolygon, point, centroid } from '@turf/turf';
import type { Position } from 'geojson';
import type { ParcelFeature } from '../types';

/**
 * Splits a polygon into two parts using a split line.
 * The split line should cross the polygon from one edge to another.
 *
 * @param parcel The parcel to split
 * @param lineCoords The coordinates of the split line (at least 2 points)
 * @returns Array of two new parcels, or null if split fails
 */
export function polygonSplit(
  parcel: ParcelFeature,
  lineCoords: Position[]
): ParcelFeature[] | null {
  if (parcel.geometry.type !== 'Polygon' || lineCoords.length < 2) {
    return null;
  }

  try {
    // Create a buffered line to cut the polygon
    // The buffer creates a thin rectangle we can use for difference operations
    const line = lineString(lineCoords);
    const bufferedLine = buffer(line, 0.0001, { units: 'kilometers' }); // ~10cm buffer

    if (!bufferedLine) {
      console.error('Failed to buffer split line');
      return null;
    }

    // Get the original polygon
    const originalPolygon = polygon(parcel.geometry.coordinates);

    // Calculate the "difference" - this gives us one side
    const side1 = difference(originalPolygon, bufferedLine);

    if (!side1 || side1.geometry.type === 'Point' || side1.geometry.type === 'LineString') {
      console.error('Split resulted in invalid geometry');
      return null;
    }

    // For MultiPolygon results, we have our split parts
    if (side1.geometry.type === 'MultiPolygon') {
      const parts = side1.geometry.coordinates;

      if (parts.length < 2) {
        console.error('Split did not produce multiple parts');
        return null;
      }

      // Create new parcels from each part
      const newParcels: ParcelFeature[] = parts.map((coords, index) => ({
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: coords,
        },
        properties: {
          id: `${parcel.properties.id}-split-${index}-${Date.now()}`,
          parcelType: parcel.properties.parcelType,
          // Original ID for reference
          originalId: parcel.properties.id,
        },
      }));

      return newParcels;
    }

    // If we get a single Polygon, the line didn't fully cross
    // Try an alternative approach using the line to determine sides
    console.warn('Simple difference did not split - line may not cross polygon completely');
    return null;

  } catch (err) {
    console.error('Polygon split failed:', err);
    return null;
  }
}

/**
 * Check if a split line properly crosses a polygon
 * (enters and exits the polygon boundary)
 */
export function validateSplitLine(
  parcel: ParcelFeature,
  lineCoords: Position[]
): boolean {
  if (parcel.geometry.type !== 'Polygon' || lineCoords.length < 2) {
    return false;
  }

  try {
    const poly = polygon(parcel.geometry.coordinates);
    const startPoint = point(lineCoords[0]);
    const endPoint = point(lineCoords[lineCoords.length - 1]);

    // Check if start and end points are on opposite sides
    // (both outside, or one outside the polygon area)
    const startInside = booleanPointInPolygon(startPoint, poly);
    const endInside = booleanPointInPolygon(endPoint, poly);

    // Line should start outside and end outside (crossing through)
    // or at least one end should be outside
    return !startInside || !endInside;
  } catch {
    return false;
  }
}

/**
 * LassoSelection component for freehand selection on the map.
 * Allows users to draw a freehand shape to select multiple polygons.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import type { Map as MapLibreMap } from 'maplibre-gl';
import * as turf from '@turf/turf';
import { usePolygonStore } from '../../hooks/usePolygonStore';
import { useSelectionStore } from '../../hooks/useSelectionStore';
import type { Feature, Polygon, Position } from 'geojson';

interface LassoSelectionProps {
  map: MapLibreMap | null;
  isActive: boolean;
  onComplete?: () => void;
}

export function LassoSelection({ map, isActive, onComplete }: LassoSelectionProps) {
  const [isDrawing, setIsDrawing] = useState(false);
  const [points, setPoints] = useState<Position[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { parcels } = usePolygonStore();
  const { addToSelection, selectMultiple } = useSelectionStore();

  const getPolygonsInLasso = useCallback((lassoPoints: Position[]): string[] => {
    if (!map || lassoPoints.length < 3) return [];

    // Close the lasso polygon
    const closedPoints = [...lassoPoints, lassoPoints[0]];

    try {
      const lassoPolygon = turf.polygon([closedPoints]);
      const selectedIds: string[] = [];

      for (const parcel of parcels) {
        try {
          const feature: Feature<Polygon> = {
            type: 'Feature',
            properties: { id: parcel.properties.id },
            geometry: parcel.geometry as Polygon,
          };

          // Check if polygon intersects with lasso
          if (turf.booleanIntersects(lassoPolygon, feature)) {
            selectedIds.push(parcel.properties.id);
          }
        } catch (e) {
          // Skip invalid geometries
        }
      }

      return selectedIds;
    } catch (e) {
      return [];
    }
  }, [map, parcels]);

  const drawLasso = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (points.length < 2) return;

    // Draw the lasso path
    ctx.beginPath();
    ctx.strokeStyle = '#22d3ee'; // cyan-400
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);

    // Convert map coordinates to screen coordinates
    points.forEach((point, i) => {
      if (!map) return;
      const screenPoint = map.project([point[0], point[1]]);
      if (i === 0) {
        ctx.moveTo(screenPoint.x, screenPoint.y);
      } else {
        ctx.lineTo(screenPoint.x, screenPoint.y);
      }
    });

    // Close the path visually
    if (points.length > 2) {
      const firstPoint = map?.project([points[0][0], points[0][1]]);
      if (firstPoint) {
        ctx.lineTo(firstPoint.x, firstPoint.y);
      }
    }

    ctx.stroke();

    // Fill with semi-transparent color
    ctx.fillStyle = 'rgba(34, 211, 238, 0.1)';
    ctx.fill();
  }, [points, map]);

  useEffect(() => {
    drawLasso();
  }, [drawLasso]);

  const handleMouseDown = useCallback((e: MouseEvent) => {
    if (!isActive || !map || !containerRef.current) return;

    // Only activate with Alt key held
    if (!e.altKey) return;

    e.preventDefault();

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const lngLat = map.unproject([x, y]);

    setIsDrawing(true);
    setPoints([[lngLat.lng, lngLat.lat]]);
  }, [isActive, map]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDrawing || !map || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const lngLat = map.unproject([x, y]);

    // Add point if it's far enough from the last point
    setPoints(prev => {
      const lastPoint = prev[prev.length - 1];
      const distance = Math.sqrt(
        Math.pow(lngLat.lng - lastPoint[0], 2) +
        Math.pow(lngLat.lat - lastPoint[1], 2)
      );

      // Only add if moved enough (prevents too many points)
      if (distance > 0.00001) {
        return [...prev, [lngLat.lng, lngLat.lat]];
      }
      return prev;
    });
  }, [isDrawing, map]);

  const handleMouseUp = useCallback((e: MouseEvent) => {
    if (!isDrawing) return;

    setIsDrawing(false);

    if (points.length >= 3) {
      const selectedIds = getPolygonsInLasso(points);

      if (e.shiftKey) {
        // Add to existing selection
        selectedIds.forEach(id => addToSelection(id));
      } else {
        // Replace selection
        selectMultiple(selectedIds);
      }
    }

    setPoints([]);
    onComplete?.();
  }, [isDrawing, points, getPolygonsInLasso, addToSelection, selectMultiple, onComplete]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && isDrawing) {
      setIsDrawing(false);
      setPoints([]);
    }
  }, [isDrawing]);

  useEffect(() => {
    if (!isActive) {
      setIsDrawing(false);
      setPoints([]);
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isActive, handleMouseDown, handleMouseMove, handleMouseUp, handleKeyDown]);

  if (!isActive) return null;

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-10"
      style={{ pointerEvents: 'none' }}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
      />
      {isActive && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-gray-800 px-3 py-1 rounded text-xs text-gray-300">
          Hold Alt + drag to draw lasso selection
        </div>
      )}
    </div>
  );
}

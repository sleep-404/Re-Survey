/**
 * SelectionBox component for rectangular selection on the map.
 * Allows users to draw a rectangle to select multiple polygons.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import type { Map as MapLibreMap } from 'maplibre-gl';
import * as turf from '@turf/turf';
import { usePolygonStore } from '../../hooks/usePolygonStore';
import { useSelectionStore } from '../../hooks/useSelectionStore';
import type { Feature, Polygon, BBox } from 'geojson';

interface SelectionBoxProps {
  map: MapLibreMap | null;
  isActive: boolean;
  onComplete?: () => void;
}

interface BoxCoords {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export function SelectionBox({ map, isActive, onComplete }: SelectionBoxProps) {
  const [isDrawing, setIsDrawing] = useState(false);
  const [box, setBox] = useState<BoxCoords | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { parcels } = usePolygonStore();
  const { addToSelection, selectMultiple } = useSelectionStore();

  const getPolygonsInBox = useCallback((boxCoords: BoxCoords): string[] => {
    if (!map) return [];

    // Convert screen coordinates to map coordinates
    const sw = map.unproject([
      Math.min(boxCoords.startX, boxCoords.endX),
      Math.max(boxCoords.startY, boxCoords.endY),
    ]);
    const ne = map.unproject([
      Math.max(boxCoords.startX, boxCoords.endX),
      Math.min(boxCoords.startY, boxCoords.endY),
    ]);

    const bbox: BBox = [sw.lng, sw.lat, ne.lng, ne.lat];
    const bboxPolygon = turf.bboxPolygon(bbox);

    const selectedIds: string[] = [];

    for (const parcel of parcels) {
      try {
        const feature: Feature<Polygon> = {
          type: 'Feature',
          properties: { id: parcel.properties.id },
          geometry: parcel.geometry as Polygon,
        };

        // Check if polygon intersects with selection box
        if (turf.booleanIntersects(bboxPolygon, feature)) {
          selectedIds.push(parcel.properties.id);
        }
      } catch (e) {
        // Skip invalid geometries
      }
    }

    return selectedIds;
  }, [map, parcels]);

  const handleMouseDown = useCallback((e: MouseEvent) => {
    if (!isActive || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const startX = e.clientX - rect.left;
    const startY = e.clientY - rect.top;

    setIsDrawing(true);
    setBox({
      startX,
      startY,
      endX: startX,
      endY: startY,
    });
  }, [isActive]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDrawing || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const endX = e.clientX - rect.left;
    const endY = e.clientY - rect.top;

    setBox(prev => prev ? { ...prev, endX, endY } : null);
  }, [isDrawing]);

  const handleMouseUp = useCallback((e: MouseEvent) => {
    if (!isDrawing || !box) return;

    setIsDrawing(false);

    // Check if it's a real drag (not just a click)
    const width = Math.abs(box.endX - box.startX);
    const height = Math.abs(box.endY - box.startY);

    if (width > 5 && height > 5) {
      const selectedIds = getPolygonsInBox(box);

      if (e.shiftKey) {
        // Add to existing selection
        selectedIds.forEach(id => addToSelection(id));
      } else {
        // Replace selection
        selectMultiple(selectedIds);
      }
    }

    setBox(null);
    onComplete?.();
  }, [isDrawing, box, getPolygonsInBox, addToSelection, selectMultiple, onComplete]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && isDrawing) {
      setIsDrawing(false);
      setBox(null);
    }
  }, [isDrawing]);

  useEffect(() => {
    if (!isActive) {
      setIsDrawing(false);
      setBox(null);
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

  const boxStyle = box ? {
    left: Math.min(box.startX, box.endX),
    top: Math.min(box.startY, box.endY),
    width: Math.abs(box.endX - box.startX),
    height: Math.abs(box.endY - box.startY),
  } : null;

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 cursor-crosshair z-10"
      style={{ pointerEvents: isActive ? 'auto' : 'none' }}
    >
      {box && boxStyle && (
        <div
          className="absolute border-2 border-cyan-400 bg-cyan-400/10 pointer-events-none"
          style={boxStyle}
        />
      )}
    </div>
  );
}

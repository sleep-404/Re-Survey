import { useEffect, useRef, useCallback, useState } from 'react';
import maplibregl from 'maplibre-gl';
import type { Map, MapMouseEvent, GeoJSONSource } from 'maplibre-gl';
import { usePolygonStore } from '../../hooks/usePolygonStore';
import { useSelectionStore } from '../../hooks/useSelectionStore';
import { useModeStore } from '../../hooks/useModeStore';
import { useDrawingStore } from '../../hooks/useDrawingStore';
import { useEditingStore } from '../../hooks/useEditingStore';
import { useSplitStore } from '../../hooks/useSplitStore';
import { useHistoryStore, createAddAction, createEditVerticesAction, createSplitAction } from '../../hooks/useHistoryStore';
import { PARCEL_TYPES, SELECTION_COLORS } from '../../constants/parcelTypes';
import { polygonSplit } from '../../utils/polygonSplit';
import type { ParcelFeature } from '../../types';

// Default center - nibanupudi village parcels
const DEFAULT_CENTER: [number, number] = [80.98846, 16.27826];
const DEFAULT_ZOOM = 16;

interface MapCanvasProps {
  className?: string;
}

export function MapCanvas({ className = '' }: MapCanvasProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<Map | null>(null);

  const { parcels, isLoading, addParcel } = usePolygonStore();
  const { selectedIds, hoveredId, setHovered, select, addToSelection, removeFromSelection } = useSelectionStore();
  const { mode } = useModeStore();
  const { isDrawing, vertices, startDrawing, addVertex, finishDrawing } = useDrawingStore();
  const {
    editingPolygonId,
    currentCoordinates,
    isDragging,
    draggedVertexIndex,
    startEditing,
    updateVertex,
    startDragging,
    stopDragging,
    finishEditing,
  } = useEditingStore();
  const {
    isSplitting,
    targetPolygonId: splitTargetId,
    lineVertices: splitLineVertices,
    startSplit,
    addVertex: addSplitVertex,
    finishSplit,
    cancelSplit,
  } = useSplitStore();
  const { pushAction } = useHistoryStore();
  const [cursorPosition, setCursorPosition] = useState<[number, number] | null>(null);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      maxZoom: 22, // Allow zooming up to level 22
      style: {
        version: 8,
        glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
        sources: {
          // Google Satellite (higher coverage in India)
          'google-satellite': {
            type: 'raster',
            tiles: [
              'https://mt0.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
              'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
              'https://mt2.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
              'https://mt3.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
            ],
            tileSize: 256,
            attribution: '© Google',
            maxzoom: 21,
          },
          // Local ORI tiles (high-res drone imagery, priority over Google)
          'ori-tiles': {
            type: 'raster',
            tiles: ['/tiles/{z}/{x}/{y}.png'],
            tileSize: 256,
            minzoom: 14,
            maxzoom: 20,
          },
        },
        layers: [
          // Background color fallback
          {
            id: 'background',
            type: 'background',
            paint: {
              'background-color': '#1a1a2e',
            },
          },
          {
            id: 'satellite-layer',
            type: 'raster',
            source: 'google-satellite',
            minzoom: 0,
            maxzoom: 24,
          },
          {
            id: 'ori-layer',
            type: 'raster',
            source: 'ori-tiles',
            minzoom: 12,
            maxzoom: 22,
          },
        ],
      },
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
    });

    // Add navigation controls
    map.current.addControl(new maplibregl.NavigationControl(), 'top-right');

    // Add scale control
    map.current.addControl(
      new maplibregl.ScaleControl({ maxWidth: 100, unit: 'metric' }),
      'bottom-left'
    );

    // Setup polygon layers when map loads
    map.current.on('load', () => {
      if (!map.current) return;

      // Add empty GeoJSON source for parcels
      map.current.addSource('parcels', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      // Add fill layer for parcels (colored by type)
      map.current.addLayer({
        id: 'parcels-fill',
        type: 'fill',
        source: 'parcels',
        paint: {
          'fill-color': [
            'match',
            ['get', 'parcelType'],
            'agricultural', PARCEL_TYPES.agricultural.fillColor,
            'gramakantam', PARCEL_TYPES.gramakantam.fillColor,
            'building', PARCEL_TYPES.building.fillColor,
            'road', PARCEL_TYPES.road.fillColor,
            'water_body', PARCEL_TYPES.water_body.fillColor,
            'open_space', PARCEL_TYPES.open_space.fillColor,
            'compound', PARCEL_TYPES.compound.fillColor,
            'government_land', PARCEL_TYPES.government_land.fillColor,
            PARCEL_TYPES.unclassified.fillColor, // default
          ],
          'fill-opacity': [
            'case',
            ['boolean', ['get', 'isSelected'], false],
            SELECTION_COLORS.selected.fillOpacity,
            ['boolean', ['get', 'isHovered'], false],
            0.1,
            [
              'match',
              ['get', 'parcelType'],
              'agricultural', PARCEL_TYPES.agricultural.fillOpacity,
              'gramakantam', PARCEL_TYPES.gramakantam.fillOpacity,
              'building', PARCEL_TYPES.building.fillOpacity,
              'road', PARCEL_TYPES.road.fillOpacity,
              'water_body', PARCEL_TYPES.water_body.fillOpacity,
              'open_space', PARCEL_TYPES.open_space.fillOpacity,
              'compound', PARCEL_TYPES.compound.fillOpacity,
              'government_land', PARCEL_TYPES.government_land.fillOpacity,
              PARCEL_TYPES.unclassified.fillOpacity, // default
            ],
          ],
        },
      });

      // Add border layer for parcels
      map.current.addLayer({
        id: 'parcels-border',
        type: 'line',
        source: 'parcels',
        paint: {
          'line-color': [
            'case',
            ['boolean', ['get', 'isSelected'], false],
            SELECTION_COLORS.selected.borderColor,
            [
              'match',
              ['get', 'parcelType'],
              'agricultural', PARCEL_TYPES.agricultural.borderColor,
              'gramakantam', PARCEL_TYPES.gramakantam.borderColor,
              'building', PARCEL_TYPES.building.borderColor,
              'road', PARCEL_TYPES.road.borderColor,
              'water_body', PARCEL_TYPES.water_body.borderColor,
              'open_space', PARCEL_TYPES.open_space.borderColor,
              'compound', PARCEL_TYPES.compound.borderColor,
              'government_land', PARCEL_TYPES.government_land.borderColor,
              PARCEL_TYPES.unclassified.borderColor, // default
            ],
          ],
          'line-width': [
            'case',
            ['boolean', ['get', 'isSelected'], false],
            3,
            ['boolean', ['get', 'isHovered'], false],
            2.5,
            1.5,
          ],
        },
      });

      // Add drawing preview source and layers
      map.current.addSource('drawing', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      // Drawing polygon fill
      map.current.addLayer({
        id: 'drawing-fill',
        type: 'fill',
        source: 'drawing',
        paint: {
          'fill-color': '#06b6d4',
          'fill-opacity': 0.2,
        },
        filter: ['==', '$type', 'Polygon'],
      });

      // Drawing lines
      map.current.addLayer({
        id: 'drawing-line',
        type: 'line',
        source: 'drawing',
        paint: {
          'line-color': '#06b6d4',
          'line-width': 2,
          'line-dasharray': [2, 2],
        },
      });

      // Drawing vertices
      map.current.addLayer({
        id: 'drawing-points',
        type: 'circle',
        source: 'drawing',
        paint: {
          'circle-radius': 5,
          'circle-color': '#06b6d4',
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 2,
        },
        filter: ['==', '$type', 'Point'],
      });

      // Add editing source and layers
      map.current.addSource('editing', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      // Editing polygon fill
      map.current.addLayer({
        id: 'editing-fill',
        type: 'fill',
        source: 'editing',
        paint: {
          'fill-color': '#06b6d4',
          'fill-opacity': 0.15,
        },
        filter: ['==', '$type', 'Polygon'],
      });

      // Editing polygon border
      map.current.addLayer({
        id: 'editing-line',
        type: 'line',
        source: 'editing',
        paint: {
          'line-color': '#06b6d4',
          'line-width': 2,
        },
        filter: ['==', '$type', 'Polygon'],
      });

      // Editing vertex handles
      map.current.addLayer({
        id: 'editing-vertices',
        type: 'circle',
        source: 'editing',
        paint: {
          'circle-radius': 7,
          'circle-color': '#ffffff',
          'circle-stroke-color': '#06b6d4',
          'circle-stroke-width': 2,
        },
        filter: ['==', '$type', 'Point'],
      });

      // Add split line source and layers
      map.current.addSource('split', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      // Split line
      map.current.addLayer({
        id: 'split-line',
        type: 'line',
        source: 'split',
        paint: {
          'line-color': '#ef4444',
          'line-width': 3,
          'line-dasharray': [4, 2],
        },
        filter: ['==', '$type', 'LineString'],
      });

      // Split line vertices
      map.current.addLayer({
        id: 'split-points',
        type: 'circle',
        source: 'split',
        paint: {
          'circle-radius': 6,
          'circle-color': '#ef4444',
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 2,
        },
        filter: ['==', '$type', 'Point'],
      });
    });

    // Cleanup on unmount
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Update parcels data when it changes
  useEffect(() => {
    if (!map.current) return;

    const source = map.current.getSource('parcels') as GeoJSONSource;
    if (!source) return;

    // Update features with selection/hover state
    const featuresWithState = parcels.map((p) => ({
      ...p,
      properties: {
        ...p.properties,
        isSelected: selectedIds.has(p.properties.id),
        isHovered: p.properties.id === hoveredId,
      },
    }));

    source.setData({
      type: 'FeatureCollection',
      features: featuresWithState,
    });
  }, [parcels, selectedIds, hoveredId]);

  // Update drawing preview
  useEffect(() => {
    if (!map.current) return;

    const source = map.current.getSource('drawing') as GeoJSONSource;
    if (!source) return;

    const features: GeoJSON.Feature[] = [];

    if (vertices.length > 0) {
      // Add points for each vertex
      vertices.forEach((v) => {
        features.push({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: v },
          properties: {},
        });
      });

      // Add line connecting vertices (and to cursor if drawing)
      const lineCoords = [...vertices];
      if (cursorPosition && isDrawing) {
        lineCoords.push(cursorPosition);
      }
      if (lineCoords.length >= 2) {
        features.push({
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: lineCoords },
          properties: {},
        });
      }

      // Add polygon preview if we have at least 3 vertices
      if (vertices.length >= 3) {
        const polygonCoords = [...vertices, vertices[0]];
        features.push({
          type: 'Feature',
          geometry: { type: 'Polygon', coordinates: [polygonCoords] },
          properties: {},
        });
      }
    }

    source.setData({
      type: 'FeatureCollection',
      features,
    });
  }, [vertices, cursorPosition, isDrawing]);

  // Update editing preview
  useEffect(() => {
    if (!map.current) return;

    const source = map.current.getSource('editing') as GeoJSONSource;
    if (!source) return;

    const features: GeoJSON.Feature[] = [];

    if (currentCoordinates && currentCoordinates.length > 0) {
      // Add vertex points
      currentCoordinates.forEach((coord, index) => {
        features.push({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: coord },
          properties: { index },
        });
      });

      // Add polygon preview (closed)
      if (currentCoordinates.length >= 3) {
        const closedCoords = [...currentCoordinates, currentCoordinates[0]];
        features.push({
          type: 'Feature',
          geometry: { type: 'Polygon', coordinates: [closedCoords] },
          properties: {},
        });
      }
    }

    source.setData({
      type: 'FeatureCollection',
      features,
    });
  }, [currentCoordinates]);

  // Update split line preview
  useEffect(() => {
    if (!map.current) return;

    const source = map.current.getSource('split') as GeoJSONSource;
    if (!source) return;

    const features: GeoJSON.Feature[] = [];

    if (splitLineVertices.length > 0) {
      // Add points for each vertex
      splitLineVertices.forEach((v) => {
        features.push({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: v },
          properties: {},
        });
      });

      // Add line connecting vertices (and to cursor if splitting)
      const lineCoords = [...splitLineVertices];
      if (cursorPosition && isSplitting) {
        lineCoords.push(cursorPosition);
      }
      if (lineCoords.length >= 2) {
        features.push({
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: lineCoords },
          properties: {},
        });
      }
    }

    source.setData({
      type: 'FeatureCollection',
      features,
    });
  }, [splitLineVertices, cursorPosition, isSplitting]);

  // Start split when entering split mode with a selected polygon
  useEffect(() => {
    if (mode === 'split' && selectedIds.size === 1 && !isSplitting) {
      const selectedId = Array.from(selectedIds)[0];
      startSplit(selectedId);
    }
  }, [mode, selectedIds, isSplitting, startSplit]);

  // Start editing when entering edit mode with a selected polygon
  useEffect(() => {
    if (mode === 'edit-vertices' && selectedIds.size === 1 && !editingPolygonId) {
      const selectedId = Array.from(selectedIds)[0];
      const parcel = parcels.find((p) => p.properties.id === selectedId);
      if (parcel && parcel.geometry.type === 'Polygon') {
        startEditing(selectedId, parcel.geometry.coordinates[0]);
      }
    }
  }, [mode, selectedIds, editingPolygonId, parcels, startEditing]);

  // Save edits when exiting edit mode
  const saveEdits = useCallback(() => {
    if (!editingPolygonId) return;

    const parcel = parcels.find((p) => p.properties.id === editingPolygonId);
    if (!parcel || parcel.geometry.type !== 'Polygon') return;

    const newCoords = finishEditing();
    if (newCoords) {
      const oldCoords = parcel.geometry.coordinates[0];
      pushAction(createEditVerticesAction(editingPolygonId, oldCoords, newCoords));
      usePolygonStore.getState().updateParcelGeometry(editingPolygonId, newCoords);
    }
  }, [editingPolygonId, parcels, finishEditing, pushAction]);

  // Watch for mode changes to save edits
  useEffect(() => {
    if (mode !== 'edit-vertices' && editingPolygonId) {
      saveEdits();
    }
  }, [mode, editingPolygonId, saveEdits]);

  // Handle click events
  const handleClick = useCallback(
    (e: MapMouseEvent) => {
      if (!map.current) return;

      // Split mode - add vertex to split line
      if (mode === 'split' && isSplitting) {
        const coords: [number, number] = [e.lngLat.lng, e.lngLat.lat];
        addSplitVertex(coords);
        return;
      }

      // Drawing mode - add vertex on click
      if (mode === 'draw') {
        const coords: [number, number] = [e.lngLat.lng, e.lngLat.lat];

        if (!isDrawing) {
          startDrawing();
        }
        addVertex(coords);
        return;
      }

      // Select mode
      if (mode !== 'select') return;

      const features = map.current.queryRenderedFeatures(e.point, {
        layers: ['parcels-fill'],
      });

      if (features.length === 0) {
        // Clicked on empty space - clear selection
        useSelectionStore.getState().clearSelection();
        return;
      }

      const clickedId = features[0].properties?.id;
      if (!clickedId) return;

      if (e.originalEvent.shiftKey) {
        // Shift+click: add to selection
        addToSelection(clickedId);
      } else if (e.originalEvent.ctrlKey || e.originalEvent.metaKey) {
        // Ctrl/Cmd+click: toggle selection
        if (selectedIds.has(clickedId)) {
          removeFromSelection(clickedId);
        } else {
          addToSelection(clickedId);
        }
      } else {
        // Normal click: select only this
        select(clickedId);
      }
    },
    [mode, selectedIds, select, addToSelection, removeFromSelection, isDrawing, startDrawing, addVertex, isSplitting, addSplitVertex]
  );

  // Handle mouse move for hover, drawing preview, and vertex dragging
  const handleMouseMove = useCallback(
    (e: MapMouseEvent) => {
      if (!map.current) return;

      // Split mode - update cursor position for line preview
      if (mode === 'split' && isSplitting) {
        setCursorPosition([e.lngLat.lng, e.lngLat.lat]);
        map.current.getCanvas().style.cursor = 'crosshair';
        return;
      }

      // Edit mode - handle vertex dragging
      if (mode === 'edit-vertices') {
        if (isDragging && draggedVertexIndex !== null) {
          // Update the vertex position while dragging
          updateVertex(draggedVertexIndex, [e.lngLat.lng, e.lngLat.lat]);
          map.current.getCanvas().style.cursor = 'grabbing';
          return;
        }

        // Check if hovering over a vertex
        const vertexFeatures = map.current.queryRenderedFeatures(e.point, {
          layers: ['editing-vertices'],
        });

        if (vertexFeatures.length > 0) {
          map.current.getCanvas().style.cursor = 'grab';
        } else {
          map.current.getCanvas().style.cursor = 'default';
        }
        return;
      }

      // Update cursor position for drawing preview
      if (mode === 'draw' && isDrawing) {
        setCursorPosition([e.lngLat.lng, e.lngLat.lat]);
        map.current.getCanvas().style.cursor = 'crosshair';
        return;
      }

      // Drawing mode but not yet started
      if (mode === 'draw') {
        map.current.getCanvas().style.cursor = 'crosshair';
        return;
      }

      // Select mode - show hover state
      const features = map.current.queryRenderedFeatures(e.point, {
        layers: ['parcels-fill'],
      });

      if (features.length > 0) {
        const hoverId = features[0].properties?.id;
        if (hoverId !== hoveredId) {
          setHovered(hoverId);
        }
        map.current.getCanvas().style.cursor = 'pointer';
      } else {
        if (hoveredId !== null) {
          setHovered(null);
        }
        map.current.getCanvas().style.cursor = '';
      }
    },
    [hoveredId, setHovered, mode, isDrawing, isDragging, draggedVertexIndex, updateVertex, isSplitting]
  );

  // Handle double-click to finish drawing or split
  const handleDoubleClick = useCallback(
    (e: MapMouseEvent) => {
      // Split mode - execute the split
      if (mode === 'split' && isSplitting && splitTargetId) {
        e.preventDefault();

        const splitLine = finishSplit();
        if (splitLine && splitLine.length >= 2) {
          const targetParcel = parcels.find((p) => p.properties.id === splitTargetId);
          if (targetParcel) {
            const newParcels = polygonSplit(targetParcel, splitLine);

            if (newParcels && newParcels.length >= 2) {
              // Record history for undo
              pushAction(createSplitAction(targetParcel, newParcels));

              // Remove original and add new parcels
              const { splitParcel } = usePolygonStore.getState();
              splitParcel(splitTargetId, newParcels);

              // Switch back to select mode
              useModeStore.getState().exitToSelectMode();
              useSelectionStore.getState().clearSelection();
            } else {
              alert('Split failed. Make sure the line crosses through the polygon from one edge to another.');
              cancelSplit();
              useModeStore.getState().exitToSelectMode();
            }
          }
        }

        setCursorPosition(null);
        return;
      }

      // Draw mode - finish drawing
      if (mode !== 'draw' || !isDrawing) return;

      e.preventDefault();

      const closedVertices = finishDrawing();
      if (closedVertices && closedVertices.length >= 4) {
        // Create a new parcel feature
        const newParcel: ParcelFeature = {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [closedVertices],
          },
          properties: {
            id: `new-${Date.now()}`,
            parcelType: 'unclassified',
          },
        };

        // Add to store and history
        addParcel(newParcel);
        pushAction(createAddAction(newParcel));

        // Switch back to select mode and select the new parcel
        useModeStore.getState().exitToSelectMode();
        useSelectionStore.getState().select(newParcel.properties.id);
      }

      setCursorPosition(null);
    },
    [mode, isDrawing, finishDrawing, addParcel, pushAction, isSplitting, splitTargetId, finishSplit, cancelSplit, parcels]
  );

  // Handle mousedown for vertex dragging
  const handleMouseDown = useCallback(
    (e: MapMouseEvent) => {
      if (!map.current || mode !== 'edit-vertices') return;

      // Check if clicking on a vertex
      const vertexFeatures = map.current.queryRenderedFeatures(e.point, {
        layers: ['editing-vertices'],
      });

      if (vertexFeatures.length > 0) {
        const vertexIndex = vertexFeatures[0].properties?.index;
        if (typeof vertexIndex === 'number') {
          e.preventDefault();
          startDragging(vertexIndex);
          // Disable map dragging while vertex dragging
          map.current.dragPan.disable();
        }
      }
    },
    [mode, startDragging]
  );

  // Handle mouseup to stop vertex dragging
  const handleMouseUp = useCallback(() => {
    if (!map.current) return;

    if (isDragging) {
      stopDragging();
      // Re-enable map dragging
      map.current.dragPan.enable();
    }
  }, [isDragging, stopDragging]);

  // Attach event handlers
  useEffect(() => {
    if (!map.current) return;

    map.current.on('click', handleClick);
    map.current.on('mousemove', handleMouseMove);
    map.current.on('dblclick', handleDoubleClick);
    map.current.on('mousedown', handleMouseDown);
    map.current.on('mouseup', handleMouseUp);

    // Disable default double-click zoom in draw mode
    if (mode === 'draw') {
      map.current.doubleClickZoom.disable();
    } else {
      map.current.doubleClickZoom.enable();
    }

    return () => {
      if (map.current) {
        map.current.off('click', handleClick);
        map.current.off('mousemove', handleMouseMove);
        map.current.off('dblclick', handleDoubleClick);
        map.current.off('mousedown', handleMouseDown);
        map.current.off('mouseup', handleMouseUp);
      }
    };
  }, [handleClick, handleMouseMove, handleDoubleClick, handleMouseDown, handleMouseUp, mode]);

  return (
    <div className={`relative ${className}`}>
      <div ref={mapContainer} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-600 border-t-cyan-500" />
            <span className="text-sm text-gray-300">Loading parcels...</span>
          </div>
        </div>
      )}
    </div>
  );
}

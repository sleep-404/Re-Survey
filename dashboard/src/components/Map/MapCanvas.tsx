import { useEffect, useRef, useCallback, useState } from 'react';
import maplibregl from 'maplibre-gl';
import type { Map, MapMouseEvent, GeoJSONSource } from 'maplibre-gl';
import { usePolygonStore } from '../../hooks/usePolygonStore';
import { useSelectionStore } from '../../hooks/useSelectionStore';
import { useModeStore } from '../../hooks/useModeStore';
import { useDrawingStore } from '../../hooks/useDrawingStore';
import { useHistoryStore, createAddAction } from '../../hooks/useHistoryStore';
import { PARCEL_TYPES, SELECTION_COLORS } from '../../constants/parcelTypes';
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
  const { pushAction } = useHistoryStore();
  const [cursorPosition, setCursorPosition] = useState<[number, number] | null>(null);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          // Esri World Imagery as high-res satellite fallback
          'esri-satellite': {
            type: 'raster',
            tiles: [
              'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            ],
            tileSize: 256,
            attribution: '© Esri, Maxar, Earthstar Geographics',
            maxzoom: 19,
          },
          // Local ORI tiles (when available, higher priority)
          'ori-tiles': {
            type: 'raster',
            tiles: ['/tiles/{z}/{x}/{y}.png'],
            tileSize: 256,
            minzoom: 12,
            maxzoom: 22,
          },
        },
        layers: [
          {
            id: 'satellite-layer',
            type: 'raster',
            source: 'esri-satellite',
            minzoom: 0,
            maxzoom: 22,
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

  // Handle click events
  const handleClick = useCallback(
    (e: MapMouseEvent) => {
      if (!map.current) return;

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
    [mode, selectedIds, select, addToSelection, removeFromSelection, isDrawing, startDrawing, addVertex]
  );

  // Handle mouse move for hover and drawing preview
  const handleMouseMove = useCallback(
    (e: MapMouseEvent) => {
      if (!map.current) return;

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
    [hoveredId, setHovered, mode, isDrawing]
  );

  // Handle double-click to finish drawing
  const handleDoubleClick = useCallback(
    (e: MapMouseEvent) => {
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
    [mode, isDrawing, finishDrawing, addParcel, pushAction]
  );

  // Attach event handlers
  useEffect(() => {
    if (!map.current) return;

    map.current.on('click', handleClick);
    map.current.on('mousemove', handleMouseMove);
    map.current.on('dblclick', handleDoubleClick);

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
      }
    };
  }, [handleClick, handleMouseMove, handleDoubleClick, mode]);

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

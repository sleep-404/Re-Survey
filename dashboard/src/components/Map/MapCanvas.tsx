import { useEffect, useRef, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import type { Map, MapMouseEvent, GeoJSONSource } from 'maplibre-gl';
import { usePolygonStore } from '../../hooks/usePolygonStore';
import { useSelectionStore } from '../../hooks/useSelectionStore';
import { useModeStore } from '../../hooks/useModeStore';
import { PARCEL_TYPES, SELECTION_COLORS } from '../../constants/parcelTypes';

// Default center - nibanupudi village parcels
const DEFAULT_CENTER: [number, number] = [80.98846, 16.27826];
const DEFAULT_ZOOM = 16;

interface MapCanvasProps {
  className?: string;
}

export function MapCanvas({ className = '' }: MapCanvasProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<Map | null>(null);

  const { parcels, isLoading } = usePolygonStore();
  const { selectedIds, hoveredId, setHovered, select, addToSelection, removeFromSelection } = useSelectionStore();
  const { mode } = useModeStore();

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          // OSM tiles as fallback base layer
          'osm-tiles': {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors',
          },
          // Local ORI tiles (when available)
          'ori-tiles': {
            type: 'raster',
            tiles: ['/tiles/{z}/{x}/{y}.png'],
            tileSize: 256,
            minzoom: 12,
            maxzoom: 20,
          },
        },
        layers: [
          {
            id: 'osm-layer',
            type: 'raster',
            source: 'osm-tiles',
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

  // Handle click events
  const handleClick = useCallback(
    (e: MapMouseEvent) => {
      if (mode !== 'select' || !map.current) return;

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
    [mode, selectedIds, select, addToSelection, removeFromSelection]
  );

  // Handle mouse move for hover
  const handleMouseMove = useCallback(
    (e: MapMouseEvent) => {
      if (!map.current) return;

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
    [hoveredId, setHovered]
  );

  // Attach event handlers
  useEffect(() => {
    if (!map.current) return;

    map.current.on('click', handleClick);
    map.current.on('mousemove', handleMouseMove);

    return () => {
      if (map.current) {
        map.current.off('click', handleClick);
        map.current.off('mousemove', handleMouseMove);
      }
    };
  }, [handleClick, handleMouseMove]);

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

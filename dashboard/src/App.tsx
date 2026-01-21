import { useEffect, useRef } from 'react';
import { MapCanvas } from './components/Map/MapCanvas';
import { Sidebar } from './components/Sidebar/Sidebar';
import { BottomBar } from './components/BottomBar/BottomBar';
import { usePolygonStore } from './hooks/usePolygonStore';
import { useLayerStore, type DataSource } from './hooks/useLayerStore';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import type { ParcelFeature } from './types';

function App() {
  const { setParcels, setLoading, setError } = usePolygonStore();
  const { activeDataSource } = useLayerStore();

  // Track working layer data separately so it persists when switching away and back
  const workingLayerRef = useRef<ParcelFeature[] | null>(null);

  // Load data based on active data source
  useEffect(() => {
    async function loadData() {
      // If switching TO working layer, restore saved data
      if (activeDataSource === 'working') {
        if (workingLayerRef.current) {
          setParcels(workingLayerRef.current);
        }
        // If no working layer saved yet, keep current parcels
        return;
      }

      // Before loading new data, save current parcels as working layer
      const currentParcels = usePolygonStore.getState().parcels;
      if (currentParcels.length > 0) {
        workingLayerRef.current = currentParcels;
      }

      setLoading(true);

      // Map data source to file path
      const urlMap: Record<Exclude<DataSource, 'working'>, string> = {
        sam: '/data/sam_segments.geojson',
        ground_truth: '/data/ground_truth.geojson',
      };

      const url = urlMap[activeDataSource as Exclude<DataSource, 'working'>];

      try {
        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(`Failed to load ${url}: ${response.status}`);
        }

        const geojson = await response.json();

        // Validate and transform features
        const features: ParcelFeature[] = geojson.features.map(
          (f: any, index: number) => ({
            ...f,
            properties: {
              id: f.properties?.id ?? `${activeDataSource}-${index}`,
              parcelType: f.properties?.parcelType ?? 'unclassified',
              area: f.properties?.area_sqm ?? f.properties?.area,
              ...f.properties,
            },
          })
        );

        setParcels(features);
        console.log(
          `Loaded ${features.length} parcels from ${activeDataSource}`
        );
      } catch (err) {
        console.error('Error loading data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
      }
    }

    loadData();
  }, [activeDataSource, setParcels, setLoading, setError]);

  // Register keyboard shortcuts
  useKeyboardShortcuts();

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden">
      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar className="w-64 flex-shrink-0 border-r border-gray-700" />

        {/* Map */}
        <MapCanvas className="flex-1" />
      </div>

      {/* Bottom bar */}
      <BottomBar className="flex-shrink-0" />
    </div>
  );
}

export default App;

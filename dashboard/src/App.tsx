import { useEffect } from 'react';
import { MapCanvas } from './components/Map/MapCanvas';
import { Sidebar } from './components/Sidebar/Sidebar';
import { BottomBar } from './components/BottomBar/BottomBar';
import { usePolygonStore } from './hooks/usePolygonStore';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import type { ParcelFeature } from './types';

function App() {
  const { setParcels, setLoading, setError } = usePolygonStore();

  // Load sample data on mount
  useEffect(() => {
    async function loadData() {
      setLoading(true);

      try {
        const response = await fetch('/data/sam_segments.geojson');

        if (!response.ok) {
          // If no data file exists, load with empty array
          console.warn('No sam_segments.geojson found, starting with empty data');
          setParcels([]);
          return;
        }

        const geojson = await response.json();

        // Validate and transform features
        const features: ParcelFeature[] = geojson.features.map(
          (f: any, index: number) => ({
            ...f,
            properties: {
              id: f.properties?.id ?? `parcel-${index}`,
              parcelType: f.properties?.parcelType ?? 'unclassified',
              area: f.properties?.area_sqm ?? f.properties?.area,
              ...f.properties,
            },
          })
        );

        setParcels(features);
        console.log(`Loaded ${features.length} parcels`);
      } catch (err) {
        console.error('Error loading data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
        setParcels([]);
      }
    }

    loadData();
  }, [setParcels, setLoading, setError]);

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

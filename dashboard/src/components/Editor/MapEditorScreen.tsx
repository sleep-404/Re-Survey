import { useEffect, useRef } from 'react';
import { MapCanvas } from '../Map/MapCanvas';
import { Sidebar } from '../Sidebar/Sidebar';
import { BottomBar } from '../BottomBar/BottomBar';
import { EditorHeader } from './EditorHeader';
import { usePolygonStore } from '../../hooks/usePolygonStore';
import { useLayerStore } from '../../hooks/useLayerStore';
import { useLiveSegmentationStore, loadLiveSegmentsFromStorage } from '../../hooks/useLiveSegmentationStore';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import type { ParcelFeature } from '../../types';

export function MapEditorScreen() {
  const { setParcels, setLoading, setError } = usePolygonStore();
  const { activeDataSource, setDataSourceCount } = useLayerStore();
  const { liveSegments, setLiveSegments } = useLiveSegmentationStore();

  // Track working layer data separately so it persists when switching away and back
  const workingLayerRef = useRef<ParcelFeature[] | null>(null);

  // Load live segments from storage on mount
  useEffect(() => {
    loadLiveSegmentsFromStorage().then((segments) => {
      if (segments.length > 0) {
        setLiveSegments(segments);
        setDataSourceCount('live', segments.length);
        console.log(`Loaded ${segments.length} live segments from storage`);
      }
    });
  }, [setLiveSegments, setDataSourceCount]);

  // Update live segment count when liveSegments changes
  useEffect(() => {
    setDataSourceCount('live', liveSegments.length);
  }, [liveSegments.length, setDataSourceCount]);

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

      // If switching TO live, use live segments from store
      if (activeDataSource === 'live') {
        const currentLiveSegments = useLiveSegmentationStore.getState().liveSegments;
        setParcels(currentLiveSegments);
        console.log(`Loaded ${currentLiveSegments.length} parcels from live segmentation`);
        return;
      }

      // Before loading new data, save current parcels as working layer
      const currentParcels = usePolygonStore.getState().parcels;
      if (currentParcels.length > 0) {
        workingLayerRef.current = currentParcels;
        setDataSourceCount('working', currentParcels.length);
      }

      setLoading(true);

      // Map data source to file path
      const urlMap: Record<'sam' | 'ground_truth', string> = {
        sam: '/data/sam_segments.geojson',
        ground_truth: '/data/ground_truth.geojson'
      };

      const url = urlMap[activeDataSource as 'sam' | 'ground_truth'];

      try {
        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(`Failed to load ${url}: ${response.status}`);
        }

        const geojson = await response.json();

        // Validate and transform features
        const features: ParcelFeature[] = geojson.features.map(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (f: any, index: number) => ({
            ...f,
            properties: {
              id: f.properties?.id ?? `${activeDataSource}-${index}`,
              parcelType: f.properties?.parcelType ?? 'unclassified',
              area: f.properties?.area_sqm ?? f.properties?.area,
              ...f.properties
            }
          })
        );

        setParcels(features);
        setDataSourceCount(activeDataSource as 'sam' | 'ground_truth', features.length);
        console.log(
          `Loaded ${features.length} parcels from ${activeDataSource}`
        );
      } catch (err) {
        console.error('Error loading data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
      }
    }

    loadData();
  }, [activeDataSource, setParcels, setLoading, setError, setDataSourceCount]);

  // Sync polygon edits back to live segments store when editing live data
  useEffect(() => {
    if (activeDataSource === 'live') {
      const parcels = usePolygonStore.getState().parcels;
      // Only sync if there are actual changes (avoid infinite loop)
      const currentLive = useLiveSegmentationStore.getState().liveSegments;
      if (parcels !== currentLive && parcels.length > 0) {
        useLiveSegmentationStore.getState().setLiveSegments(parcels);
      }
    }
  }, [activeDataSource]);

  // Register keyboard shortcuts
  useKeyboardShortcuts();

  return (
    <div className="h-screen w-screen bg-gray-900 text-gray-100 flex flex-col overflow-hidden font-sans selection:bg-cyan-500/30">
      <EditorHeader />
      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar className="w-[280px] flex-shrink-0 border-r border-gray-700 z-20 shadow-xl" />
        <MapCanvas className="flex-1 relative" />
      </div>
      <BottomBar className="flex-shrink-0 z-30" />
    </div>
  );
}

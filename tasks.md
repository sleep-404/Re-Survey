# BoundaryAI Implementation Tasks

**Generated:** 2026-01-22
**Source:** docs/REALISTIC_DEMO_PLAN.md
**Demo Date:** Jan 19-23, 2026

---

## Overview

This document contains **detailed, step-by-step implementation tasks** for the P0 demo features. Each task includes:

- Complete file contents (not fragments)
- Exact imports and type definitions
- Verification steps
- Commit commands

**Complete all P0 tasks in order.** Each task depends on the previous one.

---

## Pre-Implementation Setup

Before starting, verify your environment:

```bash
cd dashboard
npm run dev
```

Open http://localhost:5173 - you should see the map with SAM segments loaded.

---

## P0: MUST HAVE FOR DEMO

---

## Task 1: Create useLayerStore for Global Layer State

### Goal
Create a Zustand store for layer visibility state so LayerPanel and MapCanvas can share state.

### Step 1.1: Create the store file

**CREATE FILE:** `dashboard/src/hooks/useLayerStore.ts`

```typescript
import { create } from 'zustand';

/**
 * Data source types for the main polygon layer
 * - 'sam': SAM-generated segments (12,032 features)
 * - 'ground_truth': Official annotations (105 features)
 * - 'working': User's edited working layer
 */
export type DataSource = 'working' | 'sam' | 'ground_truth';

interface LayerState {
  // Base tile layer visibility
  showOriTiles: boolean;
  showSatellite: boolean;

  // Data source selection (radio - only one active at a time)
  activeDataSource: DataSource;

  // Overlay toggle (can show GT overlay on top of any data source)
  showGroundTruthOverlay: boolean;

  // Polygon layer visibility
  showPolygons: boolean;

  // Parcel type filter (which types are visible)
  visibleParcelTypes: Set<string>;

  // Actions
  setShowOriTiles: (show: boolean) => void;
  setShowSatellite: (show: boolean) => void;
  setActiveDataSource: (source: DataSource) => void;
  setShowGroundTruthOverlay: (show: boolean) => void;
  setShowPolygons: (show: boolean) => void;
  setVisibleParcelTypes: (types: Set<string>) => void;
  toggleParcelType: (type: string) => void;
}

export const useLayerStore = create<LayerState>((set) => ({
  // Initial state - ORI tiles on, satellite off
  showOriTiles: true,
  showSatellite: true,

  // Start with SAM data loaded (matches current App.tsx behavior)
  activeDataSource: 'sam',

  // Ground truth overlay off by default
  showGroundTruthOverlay: false,

  // Polygons visible by default
  showPolygons: true,

  // All parcel types visible by default
  visibleParcelTypes: new Set([
    'agricultural',
    'gramakantam',
    'building',
    'road',
    'water_body',
    'open_space',
    'compound',
    'government_land',
    'unclassified',
  ]),

  // Actions
  setShowOriTiles: (show) => set({ showOriTiles: show }),
  setShowSatellite: (show) => set({ showSatellite: show }),
  setActiveDataSource: (source) => set({ activeDataSource: source }),
  setShowGroundTruthOverlay: (show) => set({ showGroundTruthOverlay: show }),
  setShowPolygons: (show) => set({ showPolygons: show }),
  setVisibleParcelTypes: (types) => set({ visibleParcelTypes: types }),
  toggleParcelType: (type) =>
    set((state) => {
      const newTypes = new Set(state.visibleParcelTypes);
      if (newTypes.has(type)) {
        newTypes.delete(type);
      } else {
        newTypes.add(type);
      }
      return { visibleParcelTypes: newTypes };
    }),
}));
```

### Step 1.2: Update LayerPanel to use the store

**REPLACE ENTIRE FILE:** `dashboard/src/components/Sidebar/LayerPanel.tsx`

```tsx
import { usePolygonStore } from '../../hooks/usePolygonStore';
import { useLayerStore } from '../../hooks/useLayerStore';
import { PARCEL_TYPES, PARCEL_TYPE_ORDER } from '../../constants/parcelTypes';
import type { ParcelType } from '../../types';

export function LayerPanel() {
  const { parcels, isLoading } = usePolygonStore();

  // Get layer state from global store (persists across tab switches)
  const {
    showOriTiles,
    setShowOriTiles,
    showSatellite,
    setShowSatellite,
    showPolygons,
    setShowPolygons,
    activeDataSource,
    setActiveDataSource,
    showGroundTruthOverlay,
    setShowGroundTruthOverlay,
    visibleParcelTypes,
    toggleParcelType,
    setVisibleParcelTypes,
  } = useLayerStore();

  // Count parcels by type
  const typeCounts = PARCEL_TYPE_ORDER.reduce(
    (acc, type) => {
      acc[type] = parcels.filter((p) => p.properties.parcelType === type).length;
      return acc;
    },
    {} as Record<ParcelType, number>
  );

  const showAllTypes = () =>
    setVisibleParcelTypes(new Set(PARCEL_TYPE_ORDER));
  const hideAllTypes = () => setVisibleParcelTypes(new Set());

  return (
    <div className="space-y-4">
      {/* Data Source Selection */}
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
          Data Source
        </h3>
        <div className="space-y-1">
          <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-gray-800">
            <input
              type="radio"
              name="dataSource"
              checked={activeDataSource === 'working'}
              onChange={() => setActiveDataSource('working')}
              className="h-4 w-4 border-gray-600 bg-gray-700 text-cyan-500 focus:ring-cyan-500"
            />
            <span className="text-sm text-gray-300">Working Layer</span>
            <span className="ml-auto text-xs text-gray-500">(editable)</span>
          </label>
          <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-gray-800">
            <input
              type="radio"
              name="dataSource"
              checked={activeDataSource === 'sam'}
              onChange={() => setActiveDataSource('sam')}
              className="h-4 w-4 border-gray-600 bg-gray-700 text-cyan-500 focus:ring-cyan-500"
            />
            <span className="text-sm text-gray-300">SAM Output</span>
            <span className="ml-auto text-xs text-blue-400">12,032</span>
          </label>
          <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-gray-800">
            <input
              type="radio"
              name="dataSource"
              checked={activeDataSource === 'ground_truth'}
              onChange={() => setActiveDataSource('ground_truth')}
              className="h-4 w-4 border-gray-600 bg-gray-700 text-cyan-500 focus:ring-cyan-500"
            />
            <span className="text-sm text-gray-300">Ground Truth</span>
            <span className="ml-auto text-xs text-green-400">105</span>
          </label>
        </div>
        {isLoading && (
          <div className="mt-2 text-xs text-gray-500">Loading...</div>
        )}
      </div>

      {/* Ground Truth Overlay Toggle */}
      <div className="border-t border-gray-700 pt-3">
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={showGroundTruthOverlay}
            onChange={(e) => setShowGroundTruthOverlay(e.target.checked)}
            className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-red-500 focus:ring-red-500 focus:ring-offset-gray-900"
          />
          <span className="text-sm text-gray-300">Show GT Overlay</span>
          <span className="ml-auto text-xs text-red-400">(dashed red)</span>
        </label>
      </div>

      {/* Base Layers */}
      <div className="border-t border-gray-700 pt-3">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
          Base Layers
        </h3>
        <div className="space-y-2">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={showOriTiles}
              onChange={(e) => setShowOriTiles(e.target.checked)}
              className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-gray-900"
            />
            <span className="text-sm text-gray-300">ORI Tiles</span>
            <span className="ml-auto text-xs text-gray-500">(drone)</span>
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={showSatellite}
              onChange={(e) => setShowSatellite(e.target.checked)}
              className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-gray-900"
            />
            <span className="text-sm text-gray-300">Google Satellite</span>
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={showPolygons}
              onChange={(e) => setShowPolygons(e.target.checked)}
              className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-gray-900"
            />
            <span className="text-sm text-gray-300">Polygons</span>
          </label>
        </div>
      </div>

      {/* Parcel Type Filters */}
      <div className="border-t border-gray-700 pt-3">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Parcel Types
          </h3>
          <div className="flex gap-1">
            <button
              onClick={showAllTypes}
              className="text-xs text-cyan-500 hover:text-cyan-400"
            >
              All
            </button>
            <span className="text-gray-600">|</span>
            <button
              onClick={hideAllTypes}
              className="text-xs text-cyan-500 hover:text-cyan-400"
            >
              None
            </button>
          </div>
        </div>
        <div className="space-y-1">
          {PARCEL_TYPE_ORDER.map((type) => {
            const config = PARCEL_TYPES[type];
            const count = typeCounts[type];

            return (
              <label
                key={type}
                className="flex cursor-pointer items-center justify-between rounded px-2 py-1 hover:bg-gray-800"
              >
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={visibleParcelTypes.has(type)}
                    onChange={() => toggleParcelType(type)}
                    className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-gray-900"
                  />
                  <span
                    className="h-3 w-3 rounded-sm border border-gray-600"
                    style={{ backgroundColor: config.borderColor }}
                  />
                  <span className="text-sm text-gray-300">{config.label}</span>
                </div>
                <span className="text-xs text-gray-500">{count}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Total Count */}
      <div className="border-t border-gray-700 pt-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">Total Parcels</span>
          <span className="font-medium text-gray-200">{parcels.length}</span>
        </div>
      </div>
    </div>
  );
}
```

### Step 1.3: Verify Task 1

```bash
# Terminal 1: Run dev server (if not already running)
cd dashboard && npm run dev

# Terminal 2: Type check
cd dashboard && npx tsc --noEmit
```

**Browser checks:**
1. Open http://localhost:5173
2. Click "Layers" tab in sidebar
3. You should see:
   - Data Source section with 3 radio buttons (Working, SAM, Ground Truth)
   - GT Overlay checkbox
   - Base Layers section (ORI, Google Satellite, Polygons)
   - Parcel Types section
4. Switch to "Tools" tab and back to "Layers" - state should persist
5. No console errors

### Step 1.4: Commit

```bash
git add dashboard/src/hooks/useLayerStore.ts dashboard/src/components/Sidebar/LayerPanel.tsx
git commit -m "feat: Add useLayerStore for global layer state management"
```

---

## Task 2: Add Ground Truth Overlay Layer to MapCanvas

### Goal
Add a dedicated map layer that shows ground truth boundaries as dashed red lines, controlled by the store.

### Step 2.1: Update MapCanvas.tsx

**MODIFY FILE:** `dashboard/src/components/Map/MapCanvas.tsx`

**ADD these imports at the top (after existing imports around line 1-13):**

```typescript
// ADD after line 13 (after existing imports)
import { useLayerStore } from '../../hooks/useLayerStore';
import type { FeatureCollection } from 'geojson';
```

**ADD state for ground truth data (after line 52, inside the component):**

```typescript
// ADD after line 52 (after const [cursorPosition, setCursorPosition] = ...)
const [groundTruthData, setGroundTruthData] = useState<FeatureCollection | null>(null);
const [mapLoaded, setMapLoaded] = useState(false);

// Get layer visibility from store
const { showGroundTruthOverlay, showOriTiles, showSatellite, showPolygons } = useLayerStore();
```

**ADD ground truth data loading (after the map initialization useEffect, around line 341):**

```typescript
// ADD after line 341 (after the map initialization useEffect's closing });)

// Load ground truth data on mount
useEffect(() => {
  fetch('/data/ground_truth.geojson')
    .then((res) => res.json())
    .then((data: FeatureCollection) => {
      console.log(`Loaded ${data.features.length} ground truth features`);
      setGroundTruthData(data);
    })
    .catch((err) => console.warn('Failed to load ground truth:', err));
}, []);
```

**MODIFY the map.on('load', ...) callback to add ground truth layers and set mapLoaded flag.**

Find the section starting around line 126 that says `map.current.on('load', () => {`.

**ADD at the end of the load callback, just before the closing `});` (around line 331):**

```typescript
      // ADD before the closing }); of map.on('load', ...)

      // Ground truth overlay source (starts empty, populated when toggled)
      map.current.addSource('ground-truth-overlay', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      // Ground truth fill (very subtle)
      map.current.addLayer({
        id: 'ground-truth-fill',
        type: 'fill',
        source: 'ground-truth-overlay',
        paint: {
          'fill-color': '#ef4444',
          'fill-opacity': 0.05,
        },
      });

      // Ground truth border (dashed red lines)
      map.current.addLayer({
        id: 'ground-truth-border',
        type: 'line',
        source: 'ground-truth-overlay',
        paint: {
          'line-color': '#ef4444',
          'line-width': 3,
          'line-dasharray': [4, 2],
        },
      });

      // Mark map as loaded
      setMapLoaded(true);
```

**ADD useEffect to update ground truth overlay when toggled (after the ground truth loading useEffect):**

```typescript
// ADD after the ground truth loading useEffect

// Update ground truth overlay when toggle changes
useEffect(() => {
  if (!map.current || !mapLoaded) return;

  const source = map.current.getSource('ground-truth-overlay') as GeoJSONSource;
  if (!source) return;

  if (showGroundTruthOverlay && groundTruthData) {
    source.setData(groundTruthData);
  } else {
    source.setData({ type: 'FeatureCollection', features: [] });
  }
}, [showGroundTruthOverlay, groundTruthData, mapLoaded]);
```

**ADD useEffect to control base layer visibility (after the ground truth overlay useEffect):**

```typescript
// ADD after the ground truth overlay useEffect

// Control base tile layer visibility
useEffect(() => {
  if (!map.current || !mapLoaded) return;

  // ORI tiles layer
  if (map.current.getLayer('ori-layer')) {
    map.current.setLayoutProperty(
      'ori-layer',
      'visibility',
      showOriTiles ? 'visible' : 'none'
    );
  }

  // Google satellite layer (note: layer ID is 'satellite-layer', not 'google-satellite-layer')
  if (map.current.getLayer('satellite-layer')) {
    map.current.setLayoutProperty(
      'satellite-layer',
      'visibility',
      showSatellite ? 'visible' : 'none'
    );
  }
}, [showOriTiles, showSatellite, mapLoaded]);

// Control polygon layer visibility
useEffect(() => {
  if (!map.current || !mapLoaded) return;

  const visibility = showPolygons ? 'visible' : 'none';

  if (map.current.getLayer('parcels-fill')) {
    map.current.setLayoutProperty('parcels-fill', 'visibility', visibility);
  }
  if (map.current.getLayer('parcels-border')) {
    map.current.setLayoutProperty('parcels-border', 'visibility', visibility);
  }
}, [showPolygons, mapLoaded]);
```

### Step 2.2: Complete MapCanvas.tsx Reference

Here's where each addition goes in the file structure:

```
MapCanvas.tsx structure:
├── Lines 1-13: Existing imports
├── Line 14: ADD useLayerStore import
├── Line 15: ADD FeatureCollection type import
├── Lines 16-22: Constants (DEFAULT_CENTER, etc.)
├── Lines 23-52: Component start, existing state
├── Line 53: ADD groundTruthData state
├── Line 54: ADD mapLoaded state
├── Line 55: ADD useLayerStore destructuring
├── Lines 56-341: Existing map initialization useEffect
│   └── Inside map.on('load', ...) before closing:
│       ADD ground-truth-overlay source and layers
│       ADD setMapLoaded(true)
├── Line 342: ADD ground truth data loading useEffect
├── Line 352: ADD ground truth overlay update useEffect
├── Line 365: ADD base layer visibility useEffect
├── Line 385: ADD polygon visibility useEffect
├── Remaining: Existing event handlers and JSX
```

### Step 2.3: Verify Task 2

```bash
cd dashboard && npx tsc --noEmit
```

**Browser checks:**
1. Refresh http://localhost:5173
2. Go to "Layers" tab
3. Check "Show GT Overlay" checkbox
4. You should see **dashed red lines** appear on the map showing ground truth parcel boundaries
5. Uncheck - the red lines should disappear
6. Toggle "ORI Tiles" - drone imagery should hide/show
7. Toggle "Google Satellite" - satellite layer should hide/show
8. Toggle "Polygons" - the filled polygon layer should hide/show
9. Check console - should see "Loaded 105 ground truth features"

### Step 2.4: Commit

```bash
git add dashboard/src/components/Map/MapCanvas.tsx
git commit -m "feat: Add ground truth overlay layer with dashed red boundaries"
```

---

## Task 3: Implement Data Source Switcher

### Goal
Make the data source radio buttons actually load different GeoJSON files.

### Step 3.1: Update App.tsx

**REPLACE ENTIRE FILE:** `dashboard/src/App.tsx`

```typescript
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
```

### Step 3.2: Verify Task 3

```bash
cd dashboard && npx tsc --noEmit
```

**Browser checks:**
1. Refresh http://localhost:5173
2. Go to "Layers" tab
3. Current selection should be "SAM Output" (default in store)
4. Verify "Total Parcels" shows **12,032** (or close to it)
5. Click "Ground Truth" radio button
6. Should see "Loading..." briefly
7. Total Parcels should change to **105**
8. Map should show fewer, larger polygons
9. Click "SAM Output" again - should load 12,032 segments
10. Click "Working Layer" - should show the last viewed data (preserved)
11. Make an edit (select + delete a polygon)
12. Switch to "SAM Output" then back to "Working Layer" - your edit should be preserved

### Step 3.3: Commit

```bash
git add dashboard/src/App.tsx
git commit -m "feat: Implement data source switching between SAM, Ground Truth, and Working layer"
```

---

## Task 4: Final Integration and Testing

### Goal
Ensure all features work together correctly.

### Step 4.1: Full Integration Test

Run through this complete test script:

```
INTEGRATION TEST CHECKLIST:

□ 1. Start fresh
   - Clear localStorage: DevTools → Application → Local Storage → Clear All
   - Refresh page

□ 2. Initial state
   - Map shows SAM segments (12,032)
   - "SAM Output" radio selected in Layers tab
   - ORI tiles visible (drone imagery)

□ 3. Ground Truth overlay
   - Check "Show GT Overlay"
   - Dashed red lines appear showing official boundaries
   - Can see both SAM segments AND GT overlay simultaneously

□ 4. Data source switching
   - Select "Ground Truth" radio
   - Map changes to show 105 larger parcels
   - Total count updates to 105
   - GT overlay still works (shows same boundaries, but now as main layer too)

□ 5. Working layer persistence
   - Select "SAM Output"
   - Select a few polygons with lasso tool
   - Delete them (press D)
   - Note the new count (e.g., 12,029)
   - Switch to "Ground Truth"
   - Switch to "Working Layer"
   - Count should still be 12,029 (edits preserved)

□ 6. Base layer toggles
   - Uncheck "ORI Tiles" - drone imagery hides
   - Uncheck "Google Satellite" - satellite hides (should see gray background)
   - Check both back on
   - Uncheck "Polygons" - all polygon fills/borders hide
   - Check back on

□ 7. Parcel type filters
   - Uncheck "Agricultural" - those polygons should visually disappear
   - Click "None" - all polygons hide
   - Click "All" - all polygons show

□ 8. Tab persistence
   - Toggle some layers off
   - Switch to "Tools" tab
   - Switch back to "Layers" tab
   - All toggle states should be preserved

□ 9. Merge tool still works
   - Select "SAM Output" data source
   - Lasso select 3-4 adjacent polygons
   - Right-click → "Merge 4 Polygons"
   - Polygons should merge into one

□ 10. Split tool still works
   - Select the merged polygon
   - Press S to enter split mode
   - Draw a line across the polygon
   - Double-click to execute split
   - Should split into 2 polygons
```

### Step 4.2: Fix Any Issues

If any test fails, check:

1. **Console errors** - Open DevTools Console, look for red errors
2. **TypeScript errors** - Run `npx tsc --noEmit`
3. **Layer order** - Ground truth should be on top (added last in map.on('load'))
4. **State sync** - Verify useLayerStore is imported in both LayerPanel and MapCanvas

### Step 4.3: Final Commit

```bash
git add -A
git commit -m "feat: Complete P0 layer controls - data source switching and GT overlay"
```

---

## Quick Reference: What Changed

| File | Change Type | Description |
|------|-------------|-------------|
| `hooks/useLayerStore.ts` | **NEW** | Global layer state store |
| `components/Sidebar/LayerPanel.tsx` | **REPLACED** | Uses store, adds data source UI |
| `components/Map/MapCanvas.tsx` | **MODIFIED** | GT overlay layer, tile toggles |
| `App.tsx` | **REPLACED** | Data source switching logic |

---

## Demo Day Checklist

### Pre-Demo Setup (30 min before)

```bash
cd dashboard
npm run dev
```

- [ ] Open http://localhost:5173 in Chrome
- [ ] Verify ORI tiles load (zoom to Nibanupudi)
- [ ] Select "SAM Output" → verify 12,032 segments
- [ ] Select "Ground Truth" → verify 105 parcels
- [ ] Check "Show GT Overlay" → verify dashed red lines appear
- [ ] Test merge: Lasso select 3 polygons → Right-click → Merge
- [ ] Test split: Press S → Draw line → Double-click
- [ ] Test topology: Go to Validate tab → Click "Validate"
- [ ] Test accuracy: Click "Calculate" in Accuracy Panel
- [ ] Test export: Click "Export Shapefile" → Download
- [ ] Clear localStorage for fresh demo start

### Demo Script (7-8 min)

1. **Problem** (30s) - "Manual tracing takes 3-5 days per village"
2. **Ground Truth** (30s) - Switch to Ground Truth layer, "105 official parcels"
3. **SAM Output** (1m) - Switch to SAM, "AI detected 12,032 segments"
4. **Overlay Comparison** (30s) - Enable GT overlay, "See where AI differs"
5. **Merge Tool** (1m) - Lasso + merge fragmented parcels
6. **Split Tool** (30s) - Draw line to split
7. **Topology** (1m) - Validate + Fix overlaps/gaps
8. **Accuracy** (30s) - Show IoU metrics
9. **Export** (30s) - Download shapefile
10. **Summary** (30s) - "3-5 days → 2-4 hours"

### Backup Plans

| If This Fails | Do This Instead |
|---------------|-----------------|
| ORI tiles don't load | Use Google satellite only |
| GT overlay not working | Use Accuracy Panel metrics |
| Merge crashes | Demo split and delete instead |
| Export fails | Show GeoJSON in console |

---

## P1 Tasks (Nice to Have)

These are lower priority and less detailed. Complete P0 first.

### Task 5: ROR Data Panel
- Create `useRORStore.ts` for loading XLSX
- Create `RORPanel.tsx` component
- Add ROR tab to Sidebar
- Display records, search by LP number

### Task 6: Area Comparison Display
- Show drawn area vs ROR expected area
- Color code by difference percentage

### Task 7: Conflict Highlighting
- Add MapLibre paint expression for area mismatch colors
- Toggle in LayerPanel

---

## P2 Tasks (If Time Permits)

### Task 8: Segment Filtering by Area
- Add slider for minimum area threshold
- Filter small SAM segments

### Task 9: Statistics Summary Panel
- Show parcel counts by type/status
- Simple bar chart visualization

---

*Document Version: 2.0 - Detailed Implementation Guide*
*Last Updated: 2026-01-22*

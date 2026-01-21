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

**ADD these imports at the top (after existing imports, around line 13):**

```typescript
// ADD after line 13 (after the existing imports)
// NOTE: GeoJSONSource is already imported at line 3
import { useLayerStore } from '../../hooks/useLayerStore';
import type { FeatureCollection } from 'geojson';
```

**ADD state for ground truth data (after line 52, inside the component):**

```typescript
// ADD after line 52 (after const [cursorPosition, setCursorPosition] = useState...)
const [groundTruthData, setGroundTruthData] = useState<FeatureCollection | null>(null);
const [mapLoaded, setMapLoaded] = useState(false);

// Get layer visibility from store
const { showGroundTruthOverlay, showOriTiles, showSatellite, showPolygons } = useLayerStore();
```

**ADD ground truth data loading (after the map initialization useEffect, around line 342):**

```typescript
// ADD after line 342 (after the map initialization useEffect's closing });)

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

**ADD at the end of the load callback, just before the closing `});` (around line 332):**

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
MapCanvas.tsx structure (802 lines total):
├── Lines 1-13: Existing imports (GeoJSONSource already at line 3)
├── Line 14: ADD useLayerStore import
├── Line 15: ADD FeatureCollection type import from 'geojson'
├── Lines 16-22: Constants (DEFAULT_CENTER, DEFAULT_ZOOM)
├── Lines 23-52: Component start, existing state declarations
├── Line 53: ADD groundTruthData state
├── Line 54: ADD mapLoaded state
├── Line 55: ADD useLayerStore destructuring
├── Lines 56-341: Existing map initialization useEffect
│   └── map.on('load', ...) runs from line 126 to 332
│   └── Inside map.on('load', ...) before closing });:
│       ADD ground-truth-overlay source and layers
│       ADD setMapLoaded(true)
├── Line 343: ADD ground truth data loading useEffect
├── Line 353: ADD ground truth overlay update useEffect
├── Line 366: ADD base layer visibility useEffect
├── Line 386: ADD polygon visibility useEffect
├── Remaining: Existing event handlers and JSX (lines 343-802)
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

These are lower priority. Complete P0 first.

---

## Task 5: ROR Data Panel

### Goal
Load ROR (Record of Rights) data from XLSX files and display it in a searchable panel. Allow comparing parcel areas against ROR expected areas.

### Step 5.1: Install xlsx package

```bash
cd dashboard && npm install xlsx
```

### Step 5.2: Create ROR types

**CREATE FILE:** `dashboard/src/types/ror.ts`

```typescript
/**
 * ROR (Record of Rights) data types
 * Based on Nibhanupudi-annonymized ROR.xlsx structure
 */

export interface RORRecord {
  lpNumber: number;           // LP Number (official parcel ID)
  extentAcres: number;        // LP Extent in acres
  extentHectares: number;     // Calculated from acres
  extentSqm: number;          // Calculated from acres
  ulpin?: string;             // Unique Land Parcel Identification Number
  oldSurveyNumber?: string;   // Old Survey Number
  landType?: string;          // Land classification
  ownerName?: string;         // Owner name (anonymized)
  village?: string;           // Village name
}

export interface RORState {
  records: RORRecord[];
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  selectedLpNumber: number | null;
}
```

### Step 5.3: Create useRORStore

**CREATE FILE:** `dashboard/src/hooks/useRORStore.ts`

```typescript
import { create } from 'zustand';
import * as XLSX from 'xlsx';
import type { RORRecord, RORState } from '../types/ror';

interface RORStoreActions {
  loadFromFile: (file: File) => Promise<void>;
  loadFromUrl: (url: string) => Promise<void>;
  setSearchQuery: (query: string) => void;
  selectLpNumber: (lpNumber: number | null) => void;
  getFilteredRecords: () => RORRecord[];
  getRecordByLpNumber: (lpNumber: number) => RORRecord | undefined;
  clearRecords: () => void;
}

type RORStore = RORState & RORStoreActions;

// Convert acres to other units
const acresToHectares = (acres: number) => acres * 0.404686;
const acresToSqm = (acres: number) => acres * 4046.86;

// Parse XLSX row to RORRecord
function parseRow(row: any): RORRecord | null {
  // Try different column name variations
  const lpNumber = row['LP Number'] || row['lp_no'] || row['LP_Number'] || row['lpNumber'];
  const extentAcres = row['LP Extent'] || row['extent_ac'] || row['LP_Extent'] || row['Extent (Acres)'];

  if (!lpNumber || !extentAcres) return null;

  const acres = parseFloat(extentAcres) || 0;

  return {
    lpNumber: parseInt(lpNumber) || 0,
    extentAcres: acres,
    extentHectares: acresToHectares(acres),
    extentSqm: acresToSqm(acres),
    ulpin: row['ULPIN'] || row['ulpin'] || undefined,
    oldSurveyNumber: row['Old Survey Number'] || row['old_survey_no'] || undefined,
    landType: row['Land Type'] || row['land_type'] || undefined,
    ownerName: row['Owner'] || row['owner_name'] || undefined,
    village: row['Village'] || row['village'] || undefined,
  };
}

export const useRORStore = create<RORStore>((set, get) => ({
  // Initial state
  records: [],
  isLoading: false,
  error: null,
  searchQuery: '',
  selectedLpNumber: null,

  // Load from File object (for file input)
  loadFromFile: async (file: File) => {
    set({ isLoading: true, error: null });

    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      const records: RORRecord[] = [];
      for (const row of jsonData) {
        const record = parseRow(row);
        if (record) records.push(record);
      }

      set({ records, isLoading: false });
      console.log(`Loaded ${records.length} ROR records from file`);
    } catch (err) {
      console.error('Error loading ROR file:', err);
      set({ error: err instanceof Error ? err.message : 'Failed to load ROR file', isLoading: false });
    }
  },

  // Load from URL (for pre-bundled data)
  loadFromUrl: async (url: string) => {
    set({ isLoading: true, error: null });

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);

      const arrayBuffer = await response.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      const records: RORRecord[] = [];
      for (const row of jsonData) {
        const record = parseRow(row);
        if (record) records.push(record);
      }

      set({ records, isLoading: false });
      console.log(`Loaded ${records.length} ROR records from URL`);
    } catch (err) {
      console.error('Error loading ROR from URL:', err);
      set({ error: err instanceof Error ? err.message : 'Failed to load ROR data', isLoading: false });
    }
  },

  setSearchQuery: (query: string) => set({ searchQuery: query }),

  selectLpNumber: (lpNumber: number | null) => set({ selectedLpNumber: lpNumber }),

  getFilteredRecords: () => {
    const { records, searchQuery } = get();
    if (!searchQuery.trim()) return records;

    const query = searchQuery.toLowerCase().trim();
    return records.filter((r) =>
      r.lpNumber.toString().includes(query) ||
      r.oldSurveyNumber?.toLowerCase().includes(query) ||
      r.landType?.toLowerCase().includes(query)
    );
  },

  getRecordByLpNumber: (lpNumber: number) => {
    return get().records.find((r) => r.lpNumber === lpNumber);
  },

  clearRecords: () => set({ records: [], searchQuery: '', selectedLpNumber: null }),
}));
```

### Step 5.4: Create RORPanel component

**CREATE FILE:** `dashboard/src/components/Sidebar/RORPanel.tsx`

```tsx
import { useState, useCallback, useEffect } from 'react';
import { useRORStore } from '../../hooks/useRORStore';
import { usePolygonStore } from '../../hooks/usePolygonStore';
import type { RORRecord } from '../../types/ror';

interface RORPanelProps {
  onSelectParcel?: (lpNumber: number) => void;
}

export function RORPanel({ onSelectParcel }: RORPanelProps) {
  const {
    records,
    isLoading,
    error,
    searchQuery,
    selectedLpNumber,
    loadFromUrl,
    loadFromFile,
    setSearchQuery,
    selectLpNumber,
    getFilteredRecords,
  } = useRORStore();

  const { parcels } = usePolygonStore();
  const [showUpload, setShowUpload] = useState(false);

  // Auto-load Nibanupudi ROR on mount
  useEffect(() => {
    if (records.length === 0 && !isLoading) {
      loadFromUrl('/data/Nibhanupudi-annonymized ROR.xlsx').catch(() => {
        // If URL fails, user can upload manually
        console.log('ROR file not found at default location');
      });
    }
  }, [records.length, isLoading, loadFromUrl]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      loadFromFile(file);
      setShowUpload(false);
    }
  }, [loadFromFile]);

  const handleRecordClick = useCallback((record: RORRecord) => {
    selectLpNumber(record.lpNumber);
    onSelectParcel?.(record.lpNumber);
  }, [selectLpNumber, onSelectParcel]);

  const filteredRecords = getFilteredRecords();

  // Format area display
  const formatArea = (sqm: number) => {
    if (sqm < 10000) return `${sqm.toFixed(0)} m²`;
    return `${(sqm / 10000).toFixed(2)} ha`;
  };

  return (
    <div className="space-y-3">
      {/* Header with upload option */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          ROR Data
        </h3>
        <button
          onClick={() => setShowUpload(!showUpload)}
          className="text-xs text-cyan-500 hover:text-cyan-400"
        >
          {showUpload ? 'Cancel' : 'Upload'}
        </button>
      </div>

      {/* File upload */}
      {showUpload && (
        <div className="rounded border border-dashed border-gray-600 p-2">
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileUpload}
            className="w-full text-xs text-gray-400 file:mr-2 file:rounded file:border-0
                       file:bg-gray-700 file:px-2 file:py-1 file:text-xs file:text-gray-300"
          />
          <p className="mt-1 text-xs text-gray-500">Upload ROR Excel file</p>
        </div>
      )}

      {/* Status */}
      {isLoading && (
        <div className="text-xs text-gray-400">Loading ROR data...</div>
      )}
      {error && (
        <div className="text-xs text-red-400">{error}</div>
      )}

      {/* Search */}
      {records.length > 0 && (
        <div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search LP#, Survey#, Type..."
            className="w-full rounded border border-gray-600 bg-gray-800 px-2 py-1.5
                       text-sm text-gray-200 placeholder-gray-500 focus:border-cyan-500
                       focus:outline-none"
          />
        </div>
      )}

      {/* Stats */}
      {records.length > 0 && (
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>{filteredRecords.length} of {records.length} records</span>
          <span>
            Total: {formatArea(records.reduce((sum, r) => sum + r.extentSqm, 0))}
          </span>
        </div>
      )}

      {/* Records list */}
      {records.length > 0 && (
        <div className="max-h-64 space-y-1 overflow-y-auto">
          {filteredRecords.slice(0, 50).map((record) => (
            <div
              key={record.lpNumber}
              onClick={() => handleRecordClick(record)}
              className={`cursor-pointer rounded p-2 text-xs transition-colors ${
                selectedLpNumber === record.lpNumber
                  ? 'bg-cyan-900/50 border border-cyan-500'
                  : 'bg-gray-800 hover:bg-gray-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-200">
                  LP# {record.lpNumber}
                </span>
                <span className="text-gray-400">
                  {formatArea(record.extentSqm)}
                </span>
              </div>
              {record.landType && (
                <div className="mt-1 text-gray-500">{record.landType}</div>
              )}
              {record.oldSurveyNumber && (
                <div className="text-gray-500">Survey: {record.oldSurveyNumber}</div>
              )}
            </div>
          ))}
          {filteredRecords.length > 50 && (
            <div className="py-2 text-center text-xs text-gray-500">
              +{filteredRecords.length - 50} more records...
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && records.length === 0 && !error && (
        <div className="py-4 text-center text-xs text-gray-500">
          No ROR data loaded. Click Upload to load an Excel file.
        </div>
      )}
    </div>
  );
}
```

### Step 5.5: Add ROR tab to Sidebar

**MODIFY FILE:** `dashboard/src/components/Sidebar/Sidebar.tsx`

Add import at the top:
```typescript
import { RORPanel } from './RORPanel';
```

Add new tab option in the tabs array (find where tabs are defined):
```typescript
// Add 'ror' to the tabs array, e.g.:
const tabs = ['tools', 'layers', 'validate', 'ror'] as const;
```

Add the panel rendering in the tab content section:
```tsx
{activeTab === 'ror' && <RORPanel />}
```

### Step 5.6: Copy ROR file to public folder

```bash
cp "Resurvey/Nibhanupudi-annonymized ROR.xlsx" dashboard/public/data/
```

### Step 5.7: Verify Task 5

```bash
cd dashboard && npx tsc --noEmit
```

**Browser checks:**
1. Refresh http://localhost:5173
2. Click "ROR" tab in sidebar
3. Should auto-load and show ~850 records
4. Search for "824" - should filter to matching LP numbers
5. Click a record - should highlight it
6. No console errors

### Step 5.8: Commit

```bash
git add dashboard/src/types/ror.ts dashboard/src/hooks/useRORStore.ts dashboard/src/components/Sidebar/RORPanel.tsx dashboard/src/components/Sidebar/Sidebar.tsx dashboard/public/data/
git commit -m "feat: Add ROR data panel with XLSX loading and search"
```

---

## Task 6: Area Comparison Display

### Goal
Show comparison between drawn polygon area and ROR expected area. Display difference percentage and color-code by match quality.

### Step 6.1: Add area comparison utility

**CREATE FILE:** `dashboard/src/utils/areaComparison.ts`

```typescript
import * as turf from '@turf/turf';
import type { Feature, Polygon } from 'geojson';
import type { RORRecord } from '../types/ror';
import type { ParcelFeature } from '../types';

export interface AreaComparison {
  polygonId: string;
  lpNumber: number | null;
  drawnAreaSqm: number;
  expectedAreaSqm: number | null;
  differenceSqm: number | null;
  differencePercent: number | null;
  matchQuality: 'excellent' | 'good' | 'fair' | 'poor' | 'no-match';
}

/**
 * Calculate drawn area of a polygon in square meters
 */
export function calculateArea(polygon: Feature<Polygon>): number {
  try {
    return turf.area(polygon);
  } catch {
    return 0;
  }
}

/**
 * Determine match quality based on percentage difference
 * Based on 5% permissible error from requirements
 */
export function getMatchQuality(differencePercent: number | null): AreaComparison['matchQuality'] {
  if (differencePercent === null) return 'no-match';
  const absDiff = Math.abs(differencePercent);
  if (absDiff <= 5) return 'excellent';   // Within 5% - meets requirement
  if (absDiff <= 10) return 'good';       // Within 10%
  if (absDiff <= 20) return 'fair';       // Within 20%
  return 'poor';                           // Over 20% difference
}

/**
 * Get color for match quality
 */
export function getMatchQualityColor(quality: AreaComparison['matchQuality']): string {
  switch (quality) {
    case 'excellent': return '#22c55e'; // green-500
    case 'good': return '#84cc16';      // lime-500
    case 'fair': return '#eab308';      // yellow-500
    case 'poor': return '#ef4444';      // red-500
    case 'no-match': return '#6b7280';  // gray-500
  }
}

/**
 * Compare a polygon against ROR record by LP number
 */
export function comparePolygonToROR(
  polygon: ParcelFeature,
  rorRecords: RORRecord[]
): AreaComparison {
  const polygonId = polygon.properties.id;
  const drawnAreaSqm = calculateArea(polygon as Feature<Polygon>);

  // Try to find matching ROR record by lp_no property
  const lpNo = polygon.properties.lp_no || polygon.properties.lpNumber;
  const rorRecord = lpNo ? rorRecords.find(r => r.lpNumber === lpNo) : null;

  if (!rorRecord) {
    return {
      polygonId,
      lpNumber: lpNo || null,
      drawnAreaSqm,
      expectedAreaSqm: null,
      differenceSqm: null,
      differencePercent: null,
      matchQuality: 'no-match',
    };
  }

  const expectedAreaSqm = rorRecord.extentSqm;
  const differenceSqm = drawnAreaSqm - expectedAreaSqm;
  const differencePercent = (differenceSqm / expectedAreaSqm) * 100;

  return {
    polygonId,
    lpNumber: rorRecord.lpNumber,
    drawnAreaSqm,
    expectedAreaSqm,
    differenceSqm,
    differencePercent,
    matchQuality: getMatchQuality(differencePercent),
  };
}

/**
 * Compare all polygons against ROR records
 */
export function compareAllPolygons(
  polygons: ParcelFeature[],
  rorRecords: RORRecord[]
): AreaComparison[] {
  return polygons.map(p => comparePolygonToROR(p, rorRecords));
}

/**
 * Generate area comparison summary
 */
export function generateAreaComparisonSummary(comparisons: AreaComparison[]): {
  total: number;
  excellent: number;
  good: number;
  fair: number;
  poor: number;
  noMatch: number;
  avgDifferencePercent: number | null;
} {
  const matched = comparisons.filter(c => c.differencePercent !== null);

  return {
    total: comparisons.length,
    excellent: comparisons.filter(c => c.matchQuality === 'excellent').length,
    good: comparisons.filter(c => c.matchQuality === 'good').length,
    fair: comparisons.filter(c => c.matchQuality === 'fair').length,
    poor: comparisons.filter(c => c.matchQuality === 'poor').length,
    noMatch: comparisons.filter(c => c.matchQuality === 'no-match').length,
    avgDifferencePercent: matched.length > 0
      ? matched.reduce((sum, c) => sum + Math.abs(c.differencePercent!), 0) / matched.length
      : null,
  };
}
```

### Step 6.2: Create AreaComparisonPanel component

**CREATE FILE:** `dashboard/src/components/Sidebar/AreaComparisonPanel.tsx`

```tsx
import { useState, useCallback } from 'react';
import { usePolygonStore } from '../../hooks/usePolygonStore';
import { useRORStore } from '../../hooks/useRORStore';
import { useSelectionStore } from '../../hooks/useSelectionStore';
import {
  compareAllPolygons,
  generateAreaComparisonSummary,
  getMatchQualityColor,
  type AreaComparison,
} from '../../utils/areaComparison';

export function AreaComparisonPanel() {
  const { parcels } = usePolygonStore();
  const { records: rorRecords } = useRORStore();
  const { select } = useSelectionStore();

  const [comparisons, setComparisons] = useState<AreaComparison[]>([]);
  const [isComparing, setIsComparing] = useState(false);

  const handleCompare = useCallback(async () => {
    setIsComparing(true);
    await new Promise(resolve => setTimeout(resolve, 10));

    const results = compareAllPolygons(parcels, rorRecords);
    // Sort by difference (worst first)
    results.sort((a, b) => {
      if (a.differencePercent === null) return 1;
      if (b.differencePercent === null) return -1;
      return Math.abs(b.differencePercent) - Math.abs(a.differencePercent);
    });
    setComparisons(results);
    setIsComparing(false);
  }, [parcels, rorRecords]);

  const handleSelectPolygon = useCallback((polygonId: string) => {
    select(polygonId);
  }, [select]);

  const summary = comparisons.length > 0 ? generateAreaComparisonSummary(comparisons) : null;

  const formatArea = (sqm: number) => {
    if (sqm < 10000) return `${sqm.toFixed(0)} m²`;
    return `${(sqm / 10000).toFixed(2)} ha`;
  };

  const formatPercent = (pct: number | null) => {
    if (pct === null) return 'N/A';
    const sign = pct >= 0 ? '+' : '';
    return `${sign}${pct.toFixed(1)}%`;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          Area Comparison
        </h3>
        <button
          onClick={handleCompare}
          disabled={isComparing || rorRecords.length === 0}
          className="rounded bg-blue-600 px-2 py-1 text-xs font-medium
                     hover:bg-blue-700 disabled:bg-gray-600"
        >
          {isComparing ? 'Comparing...' : 'Compare'}
        </button>
      </div>

      {rorRecords.length === 0 && (
        <p className="text-xs text-gray-500">
          Load ROR data first to enable area comparison.
        </p>
      )}

      {/* Summary */}
      {summary && (
        <div className="space-y-2">
          <div className={`rounded p-2 text-center ${
            summary.avgDifferencePercent !== null && summary.avgDifferencePercent <= 5
              ? 'bg-green-900/50'
              : 'bg-yellow-900/50'
          }`}>
            <div className="text-lg font-bold text-gray-200">
              {summary.avgDifferencePercent !== null
                ? `${summary.avgDifferencePercent.toFixed(1)}%`
                : 'N/A'}
            </div>
            <div className="text-xs text-gray-400">Avg. Difference</div>
          </div>

          <div className="grid grid-cols-5 gap-1 text-center text-xs">
            <div className="rounded bg-green-900/30 p-1">
              <div className="font-medium text-green-400">{summary.excellent}</div>
              <div className="text-gray-500">≤5%</div>
            </div>
            <div className="rounded bg-lime-900/30 p-1">
              <div className="font-medium text-lime-400">{summary.good}</div>
              <div className="text-gray-500">≤10%</div>
            </div>
            <div className="rounded bg-yellow-900/30 p-1">
              <div className="font-medium text-yellow-400">{summary.fair}</div>
              <div className="text-gray-500">≤20%</div>
            </div>
            <div className="rounded bg-red-900/30 p-1">
              <div className="font-medium text-red-400">{summary.poor}</div>
              <div className="text-gray-500">&gt;20%</div>
            </div>
            <div className="rounded bg-gray-800 p-1">
              <div className="font-medium text-gray-400">{summary.noMatch}</div>
              <div className="text-gray-500">None</div>
            </div>
          </div>
        </div>
      )}

      {/* Comparison list */}
      {comparisons.length > 0 && (
        <div className="max-h-48 space-y-1 overflow-y-auto">
          {comparisons.slice(0, 30).map((c) => (
            <div
              key={c.polygonId}
              onClick={() => handleSelectPolygon(c.polygonId)}
              className="flex cursor-pointer items-center justify-between rounded
                         bg-gray-800 p-2 text-xs hover:bg-gray-700"
            >
              <div className="flex items-center gap-2">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: getMatchQualityColor(c.matchQuality) }}
                />
                <span className="font-mono text-gray-300">
                  {c.lpNumber ? `LP#${c.lpNumber}` : c.polygonId.slice(0, 8)}
                </span>
              </div>
              <div className="text-right">
                <div style={{ color: getMatchQualityColor(c.matchQuality) }}>
                  {formatPercent(c.differencePercent)}
                </div>
                <div className="text-gray-500">
                  {formatArea(c.drawnAreaSqm)}
                </div>
              </div>
            </div>
          ))}
          {comparisons.length > 30 && (
            <div className="py-1 text-center text-xs text-gray-500">
              +{comparisons.length - 30} more...
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

### Step 6.3: Add to Validate tab in Sidebar

**MODIFY FILE:** `dashboard/src/components/Sidebar/Sidebar.tsx`

Add import:
```typescript
import { AreaComparisonPanel } from './AreaComparisonPanel';
```

Add to the validate tab content (after TopologyPanel or AccuracyPanel):
```tsx
{activeTab === 'validate' && (
  <>
    <TopologyPanel />
    <AccuracyPanel />
    <AreaComparisonPanel />
  </>
)}
```

### Step 6.4: Verify Task 6

```bash
cd dashboard && npx tsc --noEmit
```

**Browser checks:**
1. Load ROR data in "ROR" tab
2. Go to "Validate" tab
3. Click "Compare" in Area Comparison panel
4. Should see summary with percentages
5. Click a row to select that polygon on map

### Step 6.5: Commit

```bash
git add dashboard/src/utils/areaComparison.ts dashboard/src/components/Sidebar/AreaComparisonPanel.tsx
git commit -m "feat: Add area comparison panel for ROR vs drawn area"
```

---

## Task 7: Conflict Highlighting

### Goal
Add visual highlighting on the map to show polygons with area mismatches. Color-code by difference percentage with a toggle in LayerPanel.

### Step 7.1: Update useLayerStore with conflict toggle

**MODIFY FILE:** `dashboard/src/hooks/useLayerStore.ts`

**FIND this interface (around line 7-25):**
```typescript
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
```

**REPLACE WITH:**
```typescript
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

  // Conflict highlighting toggle
  showConflictHighlighting: boolean;

  // Parcel type filter (which types are visible)
  visibleParcelTypes: Set<string>;

  // Actions
  setShowOriTiles: (show: boolean) => void;
  setShowSatellite: (show: boolean) => void;
  setActiveDataSource: (source: DataSource) => void;
  setShowGroundTruthOverlay: (show: boolean) => void;
  setShowPolygons: (show: boolean) => void;
  setShowConflictHighlighting: (show: boolean) => void;
  setVisibleParcelTypes: (types: Set<string>) => void;
  toggleParcelType: (type: string) => void;
}
```

**FIND this store creation (around line 30-45):**
```typescript
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
```

**REPLACE WITH:**
```typescript
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

  // Conflict highlighting off by default
  showConflictHighlighting: false,
```

**FIND this actions section (around line 60-65):**
```typescript
  setShowPolygons: (show) => set({ showPolygons: show }),
  setVisibleParcelTypes: (types) => set({ visibleParcelTypes: types }),
```

**REPLACE WITH:**
```typescript
  setShowPolygons: (show) => set({ showPolygons: show }),
  setShowConflictHighlighting: (show) => set({ showConflictHighlighting: show }),
  setVisibleParcelTypes: (types) => set({ visibleParcelTypes: types }),
```

### Step 7.2: Create useConflictStore

**CREATE FILE:** `dashboard/src/hooks/useConflictStore.ts`

```typescript
import { create } from 'zustand';
import type { AreaComparison } from '../utils/areaComparison';

interface ConflictState {
  comparisons: Map<string, AreaComparison>; // polygonId -> comparison
  setComparisons: (comparisons: AreaComparison[]) => void;
  getComparison: (polygonId: string) => AreaComparison | undefined;
  clearComparisons: () => void;
}

export const useConflictStore = create<ConflictState>((set, get) => ({
  comparisons: new Map(),

  setComparisons: (comparisons: AreaComparison[]) => {
    const map = new Map<string, AreaComparison>();
    comparisons.forEach(c => map.set(c.polygonId, c));
    set({ comparisons: map });
  },

  getComparison: (polygonId: string) => {
    return get().comparisons.get(polygonId);
  },

  clearComparisons: () => set({ comparisons: new Map() }),
}));
```

### Step 7.3: Update AreaComparisonPanel to store results

**MODIFY FILE:** `dashboard/src/components/Sidebar/AreaComparisonPanel.tsx`

**FIND these imports at the top:**
```typescript
import { useState, useCallback } from 'react';
import { usePolygonStore } from '../../hooks/usePolygonStore';
import { useRORStore } from '../../hooks/useRORStore';
import { useSelectionStore } from '../../hooks/useSelectionStore';
```

**REPLACE WITH:**
```typescript
import { useState, useCallback } from 'react';
import { usePolygonStore } from '../../hooks/usePolygonStore';
import { useRORStore } from '../../hooks/useRORStore';
import { useSelectionStore } from '../../hooks/useSelectionStore';
import { useConflictStore } from '../../hooks/useConflictStore';
```

**FIND this handleCompare function:**
```typescript
  const handleCompare = useCallback(async () => {
    setIsComparing(true);
    await new Promise(resolve => setTimeout(resolve, 10));

    const results = compareAllPolygons(parcels, rorRecords);
    // Sort by difference (worst first)
    results.sort((a, b) => {
      if (a.differencePercent === null) return 1;
      if (b.differencePercent === null) return -1;
      return Math.abs(b.differencePercent) - Math.abs(a.differencePercent);
    });
    setComparisons(results);
    setIsComparing(false);
  }, [parcels, rorRecords]);
```

**REPLACE WITH:**
```typescript
  const { setComparisons: storeComparisons } = useConflictStore();

  const handleCompare = useCallback(async () => {
    setIsComparing(true);
    await new Promise(resolve => setTimeout(resolve, 10));

    const results = compareAllPolygons(parcels, rorRecords);
    // Sort by difference (worst first)
    results.sort((a, b) => {
      if (a.differencePercent === null) return 1;
      if (b.differencePercent === null) return -1;
      return Math.abs(b.differencePercent) - Math.abs(a.differencePercent);
    });
    setComparisons(results);
    storeComparisons(results); // Store for map highlighting
    setIsComparing(false);
  }, [parcels, rorRecords, storeComparisons]);
```

### Step 7.4: Add conflict overlay layer to MapCanvas

**MODIFY FILE:** `dashboard/src/components/Map/MapCanvas.tsx`

**FIND these imports (around line 14-15, after useLayerStore import you added in Task 2):**
```typescript
import { useLayerStore } from '../../hooks/useLayerStore';
import type { FeatureCollection } from 'geojson';
```

**REPLACE WITH:**
```typescript
import { useLayerStore } from '../../hooks/useLayerStore';
import { useConflictStore } from '../../hooks/useConflictStore';
import { getMatchQualityColor } from '../../utils/areaComparison';
import type { FeatureCollection } from 'geojson';
```

**FIND this useLayerStore line (around line 55):**
```typescript
const { showGroundTruthOverlay, showOriTiles, showSatellite, showPolygons } = useLayerStore();
```

**REPLACE WITH:**
```typescript
const { showGroundTruthOverlay, showOriTiles, showSatellite, showPolygons, showConflictHighlighting } = useLayerStore();
const { comparisons } = useConflictStore();
```

**FIND this ground-truth-border layer code inside map.on('load') (around line 440-450):**
```typescript
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

**REPLACE WITH:**
```typescript
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

      // Conflict highlighting overlay source
      map.current.addSource('conflict-overlay', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      // Conflict fill layer
      map.current.addLayer({
        id: 'conflict-fill',
        type: 'fill',
        source: 'conflict-overlay',
        paint: {
          'fill-color': ['get', 'conflictColor'],
          'fill-opacity': 0.4,
        },
      });

      // Conflict border layer
      map.current.addLayer({
        id: 'conflict-border',
        type: 'line',
        source: 'conflict-overlay',
        paint: {
          'line-color': ['get', 'conflictColor'],
          'line-width': 3,
        },
      });

      // Mark map as loaded
      setMapLoaded(true);
```

**ADD this useEffect after the polygon visibility useEffect (around line 520, after the `}, [showPolygons, mapLoaded]);` line):**

```typescript
// Update conflict overlay when highlighting is toggled
useEffect(() => {
  if (!map.current || !mapLoaded) return;

  const source = map.current.getSource('conflict-overlay') as GeoJSONSource;
  if (!source) return;

  if (!showConflictHighlighting || comparisons.size === 0) {
    source.setData({ type: 'FeatureCollection', features: [] });
    return;
  }

  const currentParcels = usePolygonStore.getState().parcels;
  const conflictFeatures = currentParcels
    .filter(p => comparisons.has(p.properties.id))
    .map(p => {
      const comparison = comparisons.get(p.properties.id)!;
      return {
        ...p,
        properties: {
          ...p.properties,
          conflictColor: getMatchQualityColor(comparison.matchQuality),
        },
      };
    });

  source.setData({
    type: 'FeatureCollection',
    features: conflictFeatures,
  });
}, [showConflictHighlighting, comparisons, mapLoaded]);
```

### Step 7.5: Add toggle to LayerPanel

**MODIFY FILE:** `dashboard/src/components/Sidebar/LayerPanel.tsx`

**FIND this useLayerStore destructuring:**
```typescript
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
```

**REPLACE WITH:**
```typescript
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
    showConflictHighlighting,
    setShowConflictHighlighting,
    visibleParcelTypes,
    toggleParcelType,
    setVisibleParcelTypes,
  } = useLayerStore();
```

**FIND this Ground Truth Overlay section:**
```typescript
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
```

**REPLACE WITH:**
```typescript
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

      {/* Conflict Highlighting Toggle */}
      <div className="border-t border-gray-700 pt-3">
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={showConflictHighlighting}
            onChange={(e) => setShowConflictHighlighting(e.target.checked)}
            className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-orange-500 focus:ring-orange-500 focus:ring-offset-gray-900"
          />
          <span className="text-sm text-gray-300">Show Area Conflicts</span>
        </label>
        <p className="mt-1 pl-6 text-xs text-gray-500">
          Color-code by ROR area mismatch (run Compare first)
        </p>
      </div>
```

### Step 7.6: Verify Task 7

```bash
cd dashboard && npx tsc --noEmit
```

**Browser checks:**
1. Load ROR data in "ROR" tab
2. Go to "Validate" tab, click "Compare" in Area Comparison section
3. Go to "Layers" tab
4. Check "Show Area Conflicts"
5. Map should show color overlay: green (≤5%), lime (≤10%), yellow (≤20%), red (>20%)
6. Uncheck - overlay should disappear

### Step 7.7: Commit

```bash
git add dashboard/src/hooks/useConflictStore.ts dashboard/src/hooks/useLayerStore.ts dashboard/src/components/Map/MapCanvas.tsx dashboard/src/components/Sidebar/LayerPanel.tsx dashboard/src/components/Sidebar/AreaComparisonPanel.tsx
git commit -m "feat: Add conflict highlighting with color-coded area mismatches"
```

---

---

## P2 Tasks (If Time Permits)

---

## Task 8: Segment Filtering by Area

### Goal
Add a slider to filter out small SAM segments below a minimum area threshold. SAM over-segments into tiny pieces (avg 66 sqm), so filtering helps reduce visual clutter.

### Step 8.1: Update useLayerStore with area filter state

**MODIFY FILE:** `dashboard/src/hooks/useLayerStore.ts`

**FIND this interface (which you updated in Task 7):**
```typescript
  // Conflict highlighting toggle
  showConflictHighlighting: boolean;

  // Parcel type filter (which types are visible)
  visibleParcelTypes: Set<string>;
```

**REPLACE WITH:**
```typescript
  // Conflict highlighting toggle
  showConflictHighlighting: boolean;

  // Minimum area filter (in square meters, 0 = show all)
  minAreaThreshold: number;

  // Parcel type filter (which types are visible)
  visibleParcelTypes: Set<string>;
```

**FIND this actions section in the interface:**
```typescript
  setShowConflictHighlighting: (show: boolean) => void;
  setVisibleParcelTypes: (types: Set<string>) => void;
  toggleParcelType: (type: string) => void;
```

**REPLACE WITH:**
```typescript
  setShowConflictHighlighting: (show: boolean) => void;
  setMinAreaThreshold: (area: number) => void;
  setVisibleParcelTypes: (types: Set<string>) => void;
  toggleParcelType: (type: string) => void;
```

**FIND this initial state section:**
```typescript
  // Conflict highlighting off by default
  showConflictHighlighting: false,

  // All parcel types visible by default
  visibleParcelTypes: new Set([
```

**REPLACE WITH:**
```typescript
  // Conflict highlighting off by default
  showConflictHighlighting: false,

  // No area filter by default
  minAreaThreshold: 0,

  // All parcel types visible by default
  visibleParcelTypes: new Set([
```

**FIND this actions implementation:**
```typescript
  setShowConflictHighlighting: (show) => set({ showConflictHighlighting: show }),
  setVisibleParcelTypes: (types) => set({ visibleParcelTypes: types }),
```

**REPLACE WITH:**
```typescript
  setShowConflictHighlighting: (show) => set({ showConflictHighlighting: show }),
  setMinAreaThreshold: (area) => set({ minAreaThreshold: area }),
  setVisibleParcelTypes: (types) => set({ visibleParcelTypes: types }),
```

### Step 8.2: Create AreaFilterSlider component

**CREATE FILE:** `dashboard/src/components/Sidebar/AreaFilterSlider.tsx`

```tsx
import { useMemo } from 'react';
import { useLayerStore } from '../../hooks/useLayerStore';
import { usePolygonStore } from '../../hooks/usePolygonStore';
import * as turf from '@turf/turf';
import type { Feature, Polygon } from 'geojson';

export function AreaFilterSlider() {
  const { minAreaThreshold, setMinAreaThreshold } = useLayerStore();
  const { parcels } = usePolygonStore();

  // Calculate area statistics
  const areaStats = useMemo(() => {
    if (parcels.length === 0) return null;

    const areas = parcels.map(p => {
      try {
        return turf.area(p as Feature<Polygon>);
      } catch {
        return 0;
      }
    }).sort((a, b) => a - b);

    return {
      min: areas[0],
      max: areas[areas.length - 1],
      median: areas[Math.floor(areas.length / 2)],
      p10: areas[Math.floor(areas.length * 0.1)],
      p25: areas[Math.floor(areas.length * 0.25)],
    };
  }, [parcels]);

  // Count how many would be filtered
  const filteredCount = useMemo(() => {
    if (minAreaThreshold === 0) return 0;
    return parcels.filter(p => {
      try {
        return turf.area(p as Feature<Polygon>) < minAreaThreshold;
      } catch {
        return false;
      }
    }).length;
  }, [parcels, minAreaThreshold]);

  const formatArea = (sqm: number) => {
    if (sqm < 1000) return `${sqm.toFixed(0)} m²`;
    return `${(sqm / 10000).toFixed(2)} ha`;
  };

  // Preset values for quick selection
  const presets = [
    { label: 'All', value: 0 },
    { label: '10m²', value: 10 },
    { label: '50m²', value: 50 },
    { label: '100m²', value: 100 },
    { label: '500m²', value: 500 },
  ];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-medium text-gray-400">Min Area Filter</h4>
        <span className="text-xs text-gray-500">
          {filteredCount > 0 && `Hiding ${filteredCount}`}
        </span>
      </div>

      {/* Slider */}
      <div className="flex items-center gap-2">
        <input
          type="range"
          min="0"
          max="1000"
          step="10"
          value={minAreaThreshold}
          onChange={(e) => setMinAreaThreshold(Number(e.target.value))}
          className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-700
                     [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4
                     [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full
                     [&::-webkit-slider-thumb]:bg-cyan-500"
        />
        <span className="w-16 text-right text-xs text-gray-300">
          {formatArea(minAreaThreshold)}
        </span>
      </div>

      {/* Presets */}
      <div className="flex flex-wrap gap-1">
        {presets.map((preset) => (
          <button
            key={preset.value}
            onClick={() => setMinAreaThreshold(preset.value)}
            className={`rounded px-2 py-0.5 text-xs transition-colors ${
              minAreaThreshold === preset.value
                ? 'bg-cyan-600 text-white'
                : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Stats */}
      {areaStats && (
        <div className="mt-2 grid grid-cols-3 gap-1 text-xs text-gray-500">
          <div>Min: {formatArea(areaStats.min)}</div>
          <div>Med: {formatArea(areaStats.median)}</div>
          <div>Max: {formatArea(areaStats.max)}</div>
        </div>
      )}
    </div>
  );
}
```

### Step 8.3: Update MapCanvas to apply area filter

**MODIFY FILE:** `dashboard/src/components/Map/MapCanvas.tsx`

**FIND this imports section (which you updated in Task 7):**
```typescript
import { useLayerStore } from '../../hooks/useLayerStore';
import { useConflictStore } from '../../hooks/useConflictStore';
import { getMatchQualityColor } from '../../utils/areaComparison';
import type { FeatureCollection } from 'geojson';
```

**REPLACE WITH:**
```typescript
import { useLayerStore } from '../../hooks/useLayerStore';
import { useConflictStore } from '../../hooks/useConflictStore';
import { getMatchQualityColor } from '../../utils/areaComparison';
import * as turf from '@turf/turf';
import type { FeatureCollection, Feature, Polygon } from 'geojson';
```

**FIND this useLayerStore line (which you updated in Task 7):**
```typescript
const { showGroundTruthOverlay, showOriTiles, showSatellite, showPolygons, showConflictHighlighting } = useLayerStore();
```

**REPLACE WITH:**
```typescript
const { showGroundTruthOverlay, showOriTiles, showSatellite, showPolygons, showConflictHighlighting, minAreaThreshold } = useLayerStore();
```

**ADD this useEffect after the conflict overlay useEffect you added in Task 7 (after the `}, [showConflictHighlighting, comparisons, mapLoaded]);` line):**

```typescript
// Apply minimum area filter to parcels layer
useEffect(() => {
  if (!map.current || !mapLoaded) return;

  if (minAreaThreshold === 0) {
    // No filter - show all polygons
    map.current.setFilter('parcels-fill', null);
    map.current.setFilter('parcels-border', null);
  } else {
    // Filter: only show polygons with area >= threshold
    const filter: any = ['>=', ['get', 'area'], minAreaThreshold];
    map.current.setFilter('parcels-fill', filter);
    map.current.setFilter('parcels-border', filter);
  }
}, [minAreaThreshold, mapLoaded]);
```

**FIND this parcels update useEffect (look for the comment about updating parcels data):**
```typescript
  // Update parcels layer when data changes
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
```

**REPLACE WITH:**
```typescript
  // Update parcels layer when data changes
  useEffect(() => {
    if (!map.current) return;

    const source = map.current.getSource('parcels') as GeoJSONSource;
    if (!source) return;

    // Update features with selection/hover state AND calculated area for filtering
    const featuresWithState = parcels.map((p) => {
      // Calculate area if not already present
      let area = p.properties.area;
      if (area === undefined || area === null) {
        try {
          area = turf.area(p as Feature<Polygon>);
        } catch {
          area = 0;
        }
      }

      return {
        ...p,
        properties: {
          ...p.properties,
          area, // Ensure area is always present for filtering
          isSelected: selectedIds.has(p.properties.id),
          isHovered: p.properties.id === hoveredId,
        },
      };
    });

    source.setData({
      type: 'FeatureCollection',
      features: featuresWithState,
    });
  }, [parcels, selectedIds, hoveredId]);
```

### Step 8.4: Add AreaFilterSlider to LayerPanel

**MODIFY FILE:** `dashboard/src/components/Sidebar/LayerPanel.tsx`

**FIND these imports at the top:**
```typescript
import { usePolygonStore } from '../../hooks/usePolygonStore';
import { useLayerStore } from '../../hooks/useLayerStore';
import { PARCEL_TYPES, PARCEL_TYPE_ORDER } from '../../constants/parcelTypes';
import type { ParcelType } from '../../types';
```

**REPLACE WITH:**
```typescript
import { usePolygonStore } from '../../hooks/usePolygonStore';
import { useLayerStore } from '../../hooks/useLayerStore';
import { PARCEL_TYPES, PARCEL_TYPE_ORDER } from '../../constants/parcelTypes';
import { AreaFilterSlider } from './AreaFilterSlider';
import type { ParcelType } from '../../types';
```

**FIND this Total Count section at the bottom of the return:**
```typescript
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

**REPLACE WITH:**
```typescript
      {/* Area Filter */}
      <div className="border-t border-gray-700 pt-3">
        <AreaFilterSlider />
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

### Step 8.5: Verify Task 8

```bash
cd dashboard && npx tsc --noEmit
```

**Browser checks:**
1. Load SAM segments (should show 12,032)
2. Go to "Layers" tab
3. Find the "Min Area Filter" section with slider
4. Drag slider to set minimum area to 100m²
5. Many small segments should disappear from map
6. "Hiding X" count should show how many are hidden
7. Click preset buttons (10m², 50m², etc.) to quickly change filter
8. Click "All" preset - all segments should be visible again
9. Area stats (Min, Med, Max) should display below presets

### Step 8.6: Commit

```bash
git add dashboard/src/components/Sidebar/AreaFilterSlider.tsx dashboard/src/hooks/useLayerStore.ts dashboard/src/components/Map/MapCanvas.tsx dashboard/src/components/Sidebar/LayerPanel.tsx
git commit -m "feat: Add area filter slider to hide small segments"
```

---

## Task 9: Statistics Summary Panel

### Goal
Create a comprehensive statistics panel showing parcel counts by type, total areas, and a simple bar chart visualization.

### Step 9.1: Create StatisticsPanel component

**CREATE FILE:** `dashboard/src/components/Sidebar/StatisticsPanel.tsx`

```tsx
import { useMemo } from 'react';
import { usePolygonStore } from '../../hooks/usePolygonStore';
import { PARCEL_TYPES, PARCEL_TYPE_ORDER } from '../../constants/parcelTypes';
import * as turf from '@turf/turf';
import type { Feature, Polygon } from 'geojson';
import type { ParcelType } from '../../types';

interface TypeStats {
  type: ParcelType;
  count: number;
  areaSqm: number;
  percentage: number;
}

export function StatisticsPanel() {
  const { parcels } = usePolygonStore();

  // Calculate statistics
  const stats = useMemo(() => {
    if (parcels.length === 0) return null;

    // Calculate areas
    const areasById: Record<string, number> = {};
    let totalArea = 0;

    parcels.forEach((p) => {
      let area = p.properties.area;
      if (!area) {
        try {
          area = turf.area(p as Feature<Polygon>);
        } catch {
          area = 0;
        }
      }
      areasById[p.properties.id] = area;
      totalArea += area;
    });

    // Count by type
    const byType: TypeStats[] = PARCEL_TYPE_ORDER.map((type) => {
      const ofType = parcels.filter((p) => p.properties.parcelType === type);
      const areaSqm = ofType.reduce((sum, p) => sum + (areasById[p.properties.id] || 0), 0);
      return {
        type,
        count: ofType.length,
        areaSqm,
        percentage: parcels.length > 0 ? (ofType.length / parcels.length) * 100 : 0,
      };
    });

    // Add unclassified
    const unclassified = parcels.filter((p) => p.properties.parcelType === 'unclassified');
    const unclassifiedArea = unclassified.reduce((sum, p) => sum + (areasById[p.properties.id] || 0), 0);
    byType.push({
      type: 'unclassified',
      count: unclassified.length,
      areaSqm: unclassifiedArea,
      percentage: parcels.length > 0 ? (unclassified.length / parcels.length) * 100 : 0,
    });

    // Area statistics
    const areas = Object.values(areasById).sort((a, b) => a - b);
    const minArea = areas[0] || 0;
    const maxArea = areas[areas.length - 1] || 0;
    const medianArea = areas[Math.floor(areas.length / 2)] || 0;
    const avgArea = totalArea / parcels.length;

    return {
      totalCount: parcels.length,
      totalArea,
      byType: byType.filter((t) => t.count > 0), // Only show types with parcels
      minArea,
      maxArea,
      medianArea,
      avgArea,
    };
  }, [parcels]);

  const formatArea = (sqm: number) => {
    if (sqm < 1000) return `${sqm.toFixed(0)} m²`;
    if (sqm < 10000) return `${(sqm / 1000).toFixed(1)}k m²`;
    return `${(sqm / 10000).toFixed(2)} ha`;
  };

  const formatLargeArea = (sqm: number) => {
    if (sqm < 10000) return `${sqm.toFixed(0)} m²`;
    return `${(sqm / 10000).toFixed(2)} ha`;
  };

  if (!stats) {
    return (
      <div className="p-3 text-xs text-gray-500">
        No parcels loaded. Load data to see statistics.
      </div>
    );
  }

  // Find max count for bar scaling
  const maxCount = Math.max(...stats.byType.map((t) => t.count));

  return (
    <div className="space-y-4">
      {/* Overview */}
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
          Overview
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded bg-gray-800 p-2">
            <div className="text-lg font-bold text-cyan-400">
              {stats.totalCount.toLocaleString()}
            </div>
            <div className="text-xs text-gray-400">Total Parcels</div>
          </div>
          <div className="rounded bg-gray-800 p-2">
            <div className="text-lg font-bold text-cyan-400">
              {formatLargeArea(stats.totalArea)}
            </div>
            <div className="text-xs text-gray-400">Total Area</div>
          </div>
        </div>
      </div>

      {/* Area Statistics */}
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
          Area Distribution
        </h3>
        <div className="grid grid-cols-4 gap-1 text-xs">
          <div className="rounded bg-gray-800 p-1.5 text-center">
            <div className="font-medium text-gray-300">{formatArea(stats.minArea)}</div>
            <div className="text-gray-500">Min</div>
          </div>
          <div className="rounded bg-gray-800 p-1.5 text-center">
            <div className="font-medium text-gray-300">{formatArea(stats.avgArea)}</div>
            <div className="text-gray-500">Avg</div>
          </div>
          <div className="rounded bg-gray-800 p-1.5 text-center">
            <div className="font-medium text-gray-300">{formatArea(stats.medianArea)}</div>
            <div className="text-gray-500">Median</div>
          </div>
          <div className="rounded bg-gray-800 p-1.5 text-center">
            <div className="font-medium text-gray-300">{formatArea(stats.maxArea)}</div>
            <div className="text-gray-500">Max</div>
          </div>
        </div>
      </div>

      {/* By Type - Bar Chart */}
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
          By Type
        </h3>
        <div className="space-y-1.5">
          {stats.byType.map((t) => {
            const config = PARCEL_TYPES[t.type];
            const barWidth = maxCount > 0 ? (t.count / maxCount) * 100 : 0;

            return (
              <div key={t.type} className="text-xs">
                <div className="mb-0.5 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="h-2.5 w-2.5 rounded-sm"
                      style={{ backgroundColor: config.borderColor }}
                    />
                    <span className="text-gray-300">{config.label}</span>
                  </div>
                  <span className="text-gray-400">
                    {t.count.toLocaleString()} ({t.percentage.toFixed(1)}%)
                  </span>
                </div>
                {/* Bar */}
                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-800">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${barWidth}%`,
                      backgroundColor: config.borderColor,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Export Stats Button */}
      <div className="border-t border-gray-700 pt-3">
        <button
          onClick={() => {
            const text = [
              'Parcel Statistics',
              '=================',
              `Total Parcels: ${stats.totalCount}`,
              `Total Area: ${formatLargeArea(stats.totalArea)}`,
              '',
              'By Type:',
              ...stats.byType.map(
                (t) => `- ${PARCEL_TYPES[t.type].label}: ${t.count} (${t.percentage.toFixed(1)}%)`
              ),
              '',
              'Area Distribution:',
              `- Min: ${formatArea(stats.minArea)}`,
              `- Avg: ${formatArea(stats.avgArea)}`,
              `- Median: ${formatArea(stats.medianArea)}`,
              `- Max: ${formatArea(stats.maxArea)}`,
            ].join('\n');

            const blob = new Blob([text], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'parcel_statistics.txt';
            a.click();
            URL.revokeObjectURL(url);
          }}
          className="w-full rounded bg-gray-700 px-3 py-1.5 text-xs font-medium
                     text-gray-300 hover:bg-gray-600"
        >
          Export Statistics
        </button>
      </div>
    </div>
  );
}
```

### Step 9.2: Add Statistics tab to Sidebar

**MODIFY FILE:** `dashboard/src/components/Sidebar/Sidebar.tsx`

Add import:
```typescript
import { StatisticsPanel } from './StatisticsPanel';
```

Add to tabs array:
```typescript
const tabs = ['tools', 'layers', 'validate', 'ror', 'stats'] as const;
```

Add tab button (with icon):
```tsx
<button
  onClick={() => setActiveTab('stats')}
  className={`... ${activeTab === 'stats' ? 'active-styles' : ''}`}
>
  Stats
</button>
```

Add panel rendering:
```tsx
{activeTab === 'stats' && <StatisticsPanel />}
```

### Step 9.3: Verify Task 9

```bash
cd dashboard && npx tsc --noEmit
```

**Browser checks:**
1. Load SAM segments
2. Click "Stats" tab in sidebar
3. Should see:
   - Overview: Total count, total area
   - Area distribution: Min, Avg, Median, Max
   - By Type: Bar chart showing count by parcel type
4. Click "Export Statistics" - should download text file
5. Switch to Ground Truth (105 parcels) - stats should update

### Step 9.4: Commit

```bash
git add dashboard/src/components/Sidebar/StatisticsPanel.tsx dashboard/src/components/Sidebar/Sidebar.tsx
git commit -m "feat: Add statistics panel with parcel counts and area distribution"
```

---

## Final Integration

After completing all tasks, run the full integration test from Task 4 to ensure everything works together.

---

*Document Version: 2.0 - Detailed Implementation Guide*
*Last Updated: 2026-01-22*

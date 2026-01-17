# BoundaryAI Implementation Plan

**Stack:** React + Tailwind CSS + MapLibre GL JS
**Date:** 2026-01-17

---

## Success Criteria (from Orientation Session)

| Metric | Target |
|--------|--------|
| Parcel extraction precision | ≥85% when benchmarked against manual audits |
| Topology errors | Zero overlaps and gaps between adjacent parcels |
| Parcel types supported | Agricultural, Gramakantam (Abadi), Building footprints, Roads, Open spaces, Water bodies |

---

## Available Data

| Asset | Path | Format | Size |
|-------|------|--------|------|
| ORI Tile | `AI Hackathon/nibanupudi.tif` | GeoTIFF | 11GB |
| Ground Truth | `evaluation_output/.../ground_truth.geojson` | GeoJSON (EPSG:32644) | 63KB |
| SAM Segments | `evaluation_output/.../sam_raw_segments.geojson` | GeoJSON (EPSG:32644) | 34MB |

**Note:** The 11GB ORI will be converted to XYZ tiles (PNG) using `scripts/tile_ori.py` and served from `public/tiles/`.

---

## Phase 0: Project Setup

### Task 0.1: Initialize React Project
```
- Create React app with Vite
- Install dependencies:
  - tailwindcss
  - maplibre-gl (map rendering)
  - @turf/turf (geometry operations)
  - geojson (types)
- Configure Tailwind
- Set up folder structure
```

**Folder Structure:**
```
src/
├── components/
│   ├── Map/
│   │   ├── MapCanvas.tsx        # Main map component
│   │   ├── PolygonLayer.tsx     # Polygon rendering
│   │   └── SelectionBox.tsx     # Box/lasso selection
│   ├── Sidebar/
│   │   ├── Sidebar.tsx
│   │   ├── ToolPanel.tsx
│   │   ├── LayerPanel.tsx
│   │   ├── ParcelTypePanel.tsx
│   │   ├── TopologyPanel.tsx
│   │   └── AccuracyPanel.tsx
│   ├── BottomBar/
│   │   ├── BottomBar.tsx
│   │   ├── SelectionInfo.tsx
│   │   └── ModeIndicator.tsx
│   ├── Dialogs/
│   │   ├── ExportDialog.tsx
│   │   ├── RestoreSessionDialog.tsx
│   │   └── ConfirmDialog.tsx
│   └── LoadScreen/
│       └── LoadingState.tsx
├── hooks/
│   ├── usePolygonStore.ts       # Zustand store for polygons
│   ├── useSelectionStore.ts     # Selection state
│   ├── useHistoryStore.ts       # Undo/redo
│   ├── useKeyboardShortcuts.ts  # Keyboard handling
│   └── useAutoSave.ts           # LocalStorage persistence
├── utils/
│   ├── geometry.ts              # Turf.js helpers
│   ├── topology.ts              # Gap/overlap detection
│   ├── accuracy.ts              # Ground truth comparison & IoU
│   ├── export.ts                # Shapefile export
│   └── coordinates.ts           # CRS conversion
├── types/
│   └── index.ts                 # TypeScript types
├── constants/
│   └── parcelTypes.ts           # Parcel type definitions
└── App.tsx
```

### Task 0.2: Data Preparation Scripts
**Files:** `scripts/tile_ori.py`, `scripts/convert_coordinates.py`

**Script 1: tile_ori.py**
```python
# Dependencies: gdal2tiles (from GDAL), rasterio
# Purpose: Convert 11GB GeoTIFF to XYZ tile pyramid
# Output: public/tiles/{z}/{x}/{y}.png (zoom levels 12-20)
```

**Requirements:**
- Use `gdal2tiles.py` or `rasterio` to generate PNG tiles
- Output to `public/tiles/` folder
- Generate zoom levels 12-20 (village to parcel level)
- Estimated output: ~500MB-2GB of tiles

**Script 2: convert_coordinates.py**
```python
# Dependencies: geopandas, pyproj
# Purpose: Reproject GeoJSON from EPSG:32644 (UTM 44N) to EPSG:4326 (WGS84)
#          and add random parcelType classification (placeholder)
# Input: evaluation_output/.../sam_raw_segments.geojson
# Output: public/data/sam_segments.geojson
```

**Requirements:**
- Read GeoJSON with geopandas
- Reproject to EPSG:4326
- Add random `parcelType` property to each polygon (placeholder for future AI classification)
- Add unique `id` to each polygon
- Write to `public/data/` folder
- Also convert ground_truth.geojson if needed

**Random Classification (Placeholder for MVP):**
```python
import random
import uuid

PARCEL_TYPES = [
    'agricultural',    # Most common in rural areas
    'building',
    'road',
    'open_space',
    'water_body',
    'compound',
    'gramakantam',
]
WEIGHTS = [0.60, 0.15, 0.10, 0.05, 0.05, 0.03, 0.02]

for feature in gdf.iterfeatures():
    feature['properties']['parcelType'] = random.choices(PARCEL_TYPES, WEIGHTS)[0]
    feature['properties']['id'] = str(uuid.uuid4())[:8]
```

**Note:** Random classification is a placeholder. Future work will use spectral/shape analysis or a trained classifier.

**Acceptance Criteria:**
- [ ] Tiles render correctly in browser
- [ ] GeoJSON loads without CRS errors
- [ ] Polygons align with imagery

---

## Phase 1: Core Map Display

### Task 1.1: MapCanvas Component
**File:** `src/components/Map/MapCanvas.tsx`

**Requirements:**
- Initialize MapLibre GL map
- Load ORI tiles as raster source from `/tiles/{z}/{x}/{y}.png`
- Support zoom/pan
- Handle map events (click, mousemove)

**Tile Configuration:**
```typescript
map.addSource('ori-tiles', {
  type: 'raster',
  tiles: ['/tiles/{z}/{x}/{y}.png'],
  tileSize: 256,
  minzoom: 12,
  maxzoom: 20
});
```

**Acceptance Criteria:**
- [ ] Map renders with ORI imagery from local tiles
- [ ] Scroll zooms in/out
- [ ] Click+drag pans
- [ ] Map fills 80% of screen width

### Task 1.2: Polygon Layer
**File:** `src/components/Map/PolygonLayer.tsx`

**Requirements:**
- Load GeoJSON polygons from `/data/sam_segments.geojson`
- Render with orange border, no fill
- Handle hover state (border thicker, 10% fill)
- Handle selected state (cyan border, 15% fill)
- Handle multi-selected state (dashed cyan border)

**Loading Pattern:**
```typescript
// Fetch pre-computed SAM segments on app load
const response = await fetch('/data/sam_segments.geojson');
const geojson = await response.json();
// Store in Zustand for editing
usePolygonStore.getState().setPolygons(geojson.features);
```

**Acceptance Criteria:**
- [ ] Polygons render on map
- [ ] Hover effect works
- [ ] Selected polygons visually distinct
- [ ] Performance OK with 10,000+ polygons (SAM outputs ~12k segments)

### Task 1.3: Layer Toggle
**File:** `src/components/Sidebar/LayerPanel.tsx`

**Requirements:**
- Checkbox for "Imagery" layer
- Checkbox for "Polygons" layer
- Toggle visibility on map

**Acceptance Criteria:**
- [ ] Can hide/show ORI
- [ ] Can hide/show polygons

### Task 1.4: Parcel Type Classification
**File:** `src/constants/parcelTypes.ts`, `src/components/Sidebar/ParcelTypePanel.tsx`

**Data Source:** Classifications are pre-loaded from `parcelType` property in `sam_segments.geojson` (generated with random values in Task 0.2 as placeholder). Users can manually correct via UI.

**Parcel Types (from Orientation Session):**
```typescript
type ParcelType =
  | 'agricultural'      // Farm land with bunds
  | 'gramakantam'       // Abadi/habitation area outer boundary
  | 'building'          // Building footprint
  | 'compound'          // Compound wall boundary
  | 'road'              // Road polygon (double-line)
  | 'open_space'        // Open space within Gramakantam
  | 'water_body'        // Tank, pond, canal
  | 'government_land'   // Government-owned parcel
  | 'unclassified';     // Default for new/untagged parcels
```

**Requirements:**
- Each polygon has a `parcelType` property (default: `unclassified`)
- Sidebar panel to assign type to selected polygon(s)
- Color-coded rendering by parcel type
- Keyboard shortcuts: 1-9 for quick type assignment
- Filter polygons by type in layer panel

**Color Scheme:**
| Type | Fill Color | Border Color |
|------|------------|--------------|
| agricultural | transparent | orange |
| gramakantam | yellow 10% | yellow |
| building | red 20% | red |
| road | gray 30% | gray |
| water_body | blue 20% | blue |
| open_space | green 10% | green |

**Acceptance Criteria:**
- [ ] Can assign parcel type to selected polygon(s)
- [ ] Polygons render with type-specific colors
- [ ] Can filter view by parcel type
- [ ] Type persists in export

---

## Phase 2: Selection System

### Task 2.1: Click Selection
**File:** `src/hooks/useSelectionStore.ts`

**Requirements:**
- Click polygon to select
- Click empty to deselect
- Store selected polygon IDs in Zustand

**Acceptance Criteria:**
- [ ] Single click selects polygon
- [ ] Click away deselects
- [ ] Selection state persists across re-renders

### Task 2.2: Multi-Selection
**Requirements:**
- Shift+click adds to selection
- Ctrl+click removes from selection

**Acceptance Criteria:**
- [ ] Shift+click adds polygon to selection
- [ ] Ctrl+click removes polygon from selection
- [ ] Selection count updates

### Task 2.3: Box Selection
**File:** `src/components/Map/SelectionBox.tsx`

**Requirements:**
- Click+drag draws rectangle
- All polygons intersecting rectangle get selected
- Rectangle is resizable after drawing (per ArcGIS research)
- Enter confirms, Escape cancels

**Acceptance Criteria:**
- [ ] Can draw selection rectangle
- [ ] Correct polygons selected
- [ ] Can resize rectangle before confirming
- [ ] Enter/Escape work

### Task 2.4: Lasso Selection
**Requirements:**
- Alt+drag draws freehand shape
- Polygons inside shape get selected

**Acceptance Criteria:**
- [ ] Alt+drag starts lasso
- [ ] Freehand path follows cursor
- [ ] Correct polygons selected on release

---

## Phase 3: Bottom Bar & Mode System

### Task 3.1: Mode State
**File:** `src/hooks/useModeStore.ts`

**Modes:**
```typescript
type Mode = 'select' | 'draw' | 'edit-vertices' | 'split';
```

**Acceptance Criteria:**
- [ ] Mode stored globally
- [ ] Mode changes update UI
- [ ] Only valid transitions allowed

### Task 3.2: Bottom Bar Component
**File:** `src/components/BottomBar/BottomBar.tsx`

**Requirements:**
- Shows current mode indicator
- Shows contextual hints based on mode
- Shows selection info when polygons selected
- Shows action buttons based on selection

**Content by State:**

| State | Bottom Bar Content |
|-------|-------------------|
| Nothing selected | "Click polygon to select • Shift+click to add • D delete • M merge" |
| 1 selected | "SELECTED: 1 │ 0.52 ac │ [Delete D] [Split S] [Edit E]" |
| 2+ selected | "SELECTED: 3 │ 1.47 ac │ [Delete D] [Merge M]" |
| Draw mode | "DRAWING: Click to place vertices • Double-click to finish • Esc cancel" |
| Edit mode | "EDITING: Drag vertex • A add • D delete • Esc when done" |

**Acceptance Criteria:**
- [ ] Content changes based on mode
- [ ] Content changes based on selection
- [ ] Action buttons trigger correct actions
- [ ] Shortcuts shown next to actions

---

## Phase 4: Editing Operations

### Task 4.1: Delete
**File:** `src/utils/geometry.ts`

**Requirements:**
- Delete selected polygon(s)
- Add to undo history
- No confirmation for 1-4 polygons
- Confirmation dialog for 5+ polygons

**Acceptance Criteria:**
- [ ] D key deletes selected
- [ ] Delete button works
- [ ] Undo restores deleted polygons
- [ ] Confirmation appears for 5+

### Task 4.2: Merge
**Requirements:**
- Merge 2+ adjacent selected polygons
- Use Turf.js union operation
- Add to undo history

**Acceptance Criteria:**
- [ ] M key merges selected (if 2+)
- [ ] Merged polygon replaces originals
- [ ] Undo restores original polygons
- [ ] Only adjacent polygons can merge

### Task 4.3: Split
**Requirements:**
- Enter split mode (S key or button)
- Draw split line across polygon
- Line must start and end on polygon edge
- Split using Turf.js

**Acceptance Criteria:**
- [ ] S key enters split mode
- [ ] Can draw split line
- [ ] Polygon splits into two
- [ ] Undo restores original

### Task 4.4: Draw New Polygon
**File:** `src/components/Map/DrawTool.tsx`

**Requirements:**
- N key or Draw tool enters draw mode
- Click to place vertices
- Line follows cursor from last vertex
- Double-click or click first point to complete
- Escape cancels

**Acceptance Criteria:**
- [ ] N key enters draw mode
- [ ] Vertices appear on click
- [ ] Rubber-band line shows
- [ ] Double-click completes polygon
- [ ] New polygon added to store

### Task 4.5: Edit Vertices
**File:** `src/components/Map/VertexEditor.tsx`

**Requirements:**
- E key enters edit mode for selected polygon
- Show vertices as draggable circles
- Drag vertex to move
- Click edge to add vertex
- Right-click or D+click to delete vertex
- Snapping to nearby vertices

**Acceptance Criteria:**
- [ ] Vertices displayed when editing
- [ ] Drag moves vertex
- [ ] Click on edge adds vertex
- [ ] Right-click deletes vertex
- [ ] Snapping works (visual indicator)
- [ ] Escape exits edit mode

---

## Phase 5: Undo/Redo System

### Task 5.1: History Store
**File:** `src/hooks/useHistoryStore.ts`

**Requirements:**
- Store actions as reversible operations
- Group related changes (e.g., delete 5 = 1 undo)
- Unlimited undo within session
- Z key = undo, Ctrl+Shift+Z = redo

**Action Types:**
```typescript
type Action =
  | { type: 'delete', polygons: Polygon[] }
  | { type: 'add', polygon: Polygon }
  | { type: 'merge', original: Polygon[], merged: Polygon }
  | { type: 'split', original: Polygon, result: Polygon[] }
  | { type: 'edit-vertex', polygonId: string, before: Coordinates[], after: Coordinates[] }
```

**Acceptance Criteria:**
- [ ] Z key undoes last action
- [ ] Ctrl+Shift+Z redoes
- [ ] Correct granularity (1 undo per user action)
- [ ] History cleared on export

---

## Phase 6: Keyboard Shortcuts

### Task 6.1: Shortcut Handler
**File:** `src/hooks/useKeyboardShortcuts.ts`

**Shortcuts:**
| Key | Action | Context |
|-----|--------|---------|
| V | Select tool | Always |
| N | Draw tool | Always |
| E | Edit vertices | 1 selected |
| S | Split | 1 selected |
| D | Delete | Any selected |
| M | Merge | 2+ selected |
| A | Add vertex | Edit mode |
| Z | Undo | Always |
| Escape | Cancel/Deselect | Always |
| F | Fit to extent | Always |
| + / - | Zoom in/out | Always |
| Ctrl+A | Select all | Always |
| Ctrl+Z | Undo | Always |
| Ctrl+Shift+Z | Redo | Always |
| 1 | Set type: Agricultural | Any selected |
| 2 | Set type: Gramakantam | Any selected |
| 3 | Set type: Building | Any selected |
| 4 | Set type: Road | Any selected |
| 5 | Set type: Water Body | Any selected |
| 6 | Set type: Open Space | Any selected |
| 7 | Set type: Compound | Any selected |
| 8 | Set type: Government Land | Any selected |

**Acceptance Criteria:**
- [ ] All shortcuts work
- [ ] Shortcuts disabled when typing in input
- [ ] Context-aware (E only works with 1 selected)

---

## Phase 7: Topology Validation

### Task 7.1: Overlap Detection
**File:** `src/utils/topology.ts`

**Requirements:**
- Detect overlapping polygons using Turf.js intersect
- Calculate overlap area
- Return list of overlaps with location

**Acceptance Criteria:**
- [ ] Detects all overlaps
- [ ] Returns overlap geometry
- [ ] Returns overlap area

### Task 7.2: Gap Detection
**Requirements:**
- Detect gaps between adjacent polygons
- Use Turf.js to find holes in union

**Acceptance Criteria:**
- [ ] Detects gaps
- [ ] Returns gap geometry
- [ ] Returns gap area

### Task 7.3: Validation UI
**File:** `src/components/Sidebar/TopologyPanel.tsx`

**Requirements:**
- [Validate] button triggers check
- Show error count in sidebar
- Bottom bar shows error list with [→] zoom buttons
- Errors highlighted on map (red for overlaps, blue for gaps)
- [Fix All] attempts auto-fix

**Auto-fix Rules:**
| Error | Fix |
|-------|-----|
| Small overlap (<1 sqm) | Subtract from larger polygon |
| Small gap (<0.5 sqm) | Expand adjacent polygons |
| Large errors | Highlight only, manual fix |

**Acceptance Criteria:**
- [ ] Validate button works
- [ ] Errors shown in list
- [ ] Click [→] zooms to error
- [ ] Errors highlighted on map with patterns
- [ ] Fix All fixes small errors

### Task 7.4: Ground Truth Comparison & Accuracy Metrics
**File:** `src/utils/accuracy.ts`, `src/components/Sidebar/AccuracyPanel.tsx`

**Purpose:** Compare edited polygons against ground truth to measure accuracy (≥85% target from orientation session).

**Requirements:**
- Load ground truth GeoJSON (`/data/ground_truth.geojson`)
- Calculate Intersection over Union (IoU) for each polygon
- Aggregate accuracy score across all polygons
- Show per-polygon accuracy with color gradient (red < 85%, green ≥ 85%)
- List low-accuracy parcels for field team prioritization

**Metrics:**
```typescript
interface AccuracyMetrics {
  overallIoU: number;           // Average IoU across all matched polygons
  matchedCount: number;         // Polygons with ground truth match
  unmatchedCount: number;       // Polygons without ground truth match
  belowThresholdCount: number;  // Polygons with IoU < 85%
  parcelsNeedingReview: Polygon[]; // Sorted by IoU ascending (worst first)
}
```

**Field Validation Priority List:**
- Sort parcels by accuracy score (lowest first)
- Mark parcels with topology errors
- Mark parcels with no ground truth match
- Export priority list for field teams

**Acceptance Criteria:**
- [ ] Ground truth loads and displays (toggle in layer panel)
- [ ] IoU calculated for each polygon
- [ ] Overall accuracy percentage shown
- [ ] Low-accuracy parcels highlighted on map
- [ ] Priority list exportable for field teams

---

## Phase 8: Auto-Save & Session Restore

### Task 8.1: Auto-Save
**File:** `src/hooks/useAutoSave.ts`

**Requirements:**
- Save to localStorage every 30 seconds
- Save: polygons, selection, edit history
- Show "Saved" indicator briefly

**Acceptance Criteria:**
- [ ] Auto-saves every 30s
- [ ] Can restore after page reload
- [ ] Indicator shows when saved

### Task 8.2: Session Restore Dialog
**File:** `src/components/Dialogs/RestoreSessionDialog.tsx`

**Requirements:**
- On load, check localStorage for previous session
- Show dialog: filename, polygon count, edit count, timestamp
- [Discard] clears and starts fresh
- [Restore] loads previous state

**Acceptance Criteria:**
- [ ] Dialog appears if session exists
- [ ] Restore loads correctly
- [ ] Discard clears localStorage

---

## Phase 9: Export

### Task 9.1: Export Dialog
**File:** `src/components/Dialogs/ExportDialog.tsx`

**Requirements:**
- Show polygon count
- Show topology error count
- If errors: warn and offer [Fix Errors] or [Export Anyway]
- Generate shapefile (.shp, .shx, .dbf, .prj)
- Download as zip

**Acceptance Criteria:**
- [ ] Dialog shows summary
- [ ] Warning if topology errors
- [ ] Shapefile downloads correctly
- [ ] Projection file correct (EPSG:32644)

### Task 9.2: Shapefile Generation
**File:** `src/utils/export.ts`

**Library:** shpwrite + proj4

**Requirements:**
- Convert GeoJSON to Shapefile
- Reproject from EPSG:4326 (web) back to EPSG:32644 (UTM 44N) for output
- Include .prj file with EPSG:32644 WKT
- Zip all files (.shp, .shx, .dbf, .prj)
- Include parcel attributes in .dbf:
  - `id`: Unique polygon ID
  - `parcel_typ`: Parcel type (agricultural, building, road, etc.)
  - `area_sqm`: Area in square meters
  - `iou_score`: Accuracy score vs ground truth (if available)

**Coordinate Conversion:**
```typescript
import proj4 from 'proj4';

// Define UTM Zone 44N
proj4.defs('EPSG:32644', '+proj=utm +zone=44 +datum=WGS84 +units=m +no_defs');

function toUTM(lng: number, lat: number): [number, number] {
  return proj4('EPSG:4326', 'EPSG:32644', [lng, lat]);
}
```

**Acceptance Criteria:**
- [ ] Valid shapefile generated
- [ ] Opens correctly in QGIS
- [ ] Coordinates in EPSG:32644 (meters, not degrees)

---

## Phase 10: Initial Load & Loading States

### Task 10.1: Loading State
**File:** `src/components/LoadScreen/LoadingState.tsx`

**Note:** For hackathon MVP, we load pre-computed data from `public/` folder. No file upload needed since ORI tiles and SAM segments are provided.

**Requirements:**
- Show loading spinner while fetching data
- Progress indicator: "Loading tiles...", "Loading polygons...", "Loading ground truth..."
- Show polygon count once loaded: "Loaded 12,432 polygons"
- Transition to main editor once complete

**Acceptance Criteria:**
- [ ] Loading state shows on app start
- [ ] Progress updates as data loads
- [ ] Graceful error handling if data missing
- [ ] Smooth transition to editor

### Task 10.2: Village Selector (Future Enhancement)
**Note:** For multi-village support in future iterations.

**Requirements:**
- Dropdown to select from available villages
- Each village has its own tiles + segments in `public/data/{village}/`
- Switching village reloads all data

**Acceptance Criteria:**
- [ ] Can switch between villages
- [ ] Data reloads correctly

---

## Phase 11: Context Menu

### Task 11.1: Right-Click Menu
**File:** `src/components/Map/ContextMenu.tsx`

**Requirements:**
- Right-click on polygon: Delete, Edit Vertices, Split, Zoom to
- Right-click on empty: Draw Polygon, Select All, Fit to Extent
- Right-click on multi-selection: Delete All, Merge, Zoom to
- Show shortcuts next to items

**Acceptance Criteria:**
- [ ] Menu appears on right-click
- [ ] Correct items based on context
- [ ] Actions work
- [ ] Menu closes on click outside

---

## Phase 12: Accessibility & Polish

### Task 12.1: Keyboard Navigation
**Requirements:**
- Tab moves between UI elements
- Enter activates buttons
- All functionality accessible without mouse

**Acceptance Criteria:**
- [ ] Can tab through sidebar
- [ ] Enter works on buttons
- [ ] Focus indicators visible

### Task 12.2: Screen Reader Support
**Requirements:**
- aria-labels on all buttons
- Mode changes announced
- Selection count announced

**Acceptance Criteria:**
- [ ] VoiceOver/NVDA can navigate
- [ ] Mode changes spoken

### Task 12.3: Error Patterns
**Requirements:**
- Overlaps: Red fill + cross-hatch pattern
- Gaps: Blue fill + diagonal lines pattern
- Pattern visible to colorblind users

**Acceptance Criteria:**
- [ ] Patterns render correctly
- [ ] Distinguishable without color

---

## Phase 13: Performance Optimization

### Task 13.1: Large Polygon Sets
**Requirements:**
- Handle 10,000+ polygons
- Use WebGL rendering (MapLibre)
- Virtualize sidebar lists if needed

**Acceptance Criteria:**
- [ ] No lag with 10k polygons
- [ ] Smooth pan/zoom
- [ ] Selection still fast

### Task 13.2: Debouncing
**Requirements:**
- Debounce auto-save
- Debounce topology validation on edit

**Acceptance Criteria:**
- [ ] No excessive localStorage writes
- [ ] Validation doesn't block UI

---

## Implementation Order (Recommended)

```
Week 1: Foundation
├── Task 0.1: Project setup
├── Task 0.2: Data preparation
├── Task 1.1: MapCanvas
├── Task 1.2: Polygon layer
├── Task 1.3: Layer toggle
├── Task 1.4: Parcel type classification
└── Task 10.1: Loading state

Week 2: Selection & Basic Editing
├── Task 2.1: Click selection
├── Task 2.2: Multi-selection
├── Task 3.1: Mode state
├── Task 3.2: Bottom bar
├── Task 4.1: Delete
└── Task 5.1: Undo/redo

Week 3: Advanced Editing
├── Task 4.2: Merge
├── Task 4.3: Split
├── Task 4.4: Draw new
├── Task 4.5: Edit vertices
├── Task 2.3: Box selection
└── Task 2.4: Lasso selection

Week 4: Validation, Accuracy & Export
├── Task 7.1: Overlap detection
├── Task 7.2: Gap detection
├── Task 7.3: Validation UI
├── Task 7.4: Ground truth comparison & accuracy metrics
├── Task 9.1: Export dialog
└── Task 9.2: Shapefile generation

Week 5: Polish
├── Task 6.1: All keyboard shortcuts (including 1-8 for parcel types)
├── Task 8.1: Auto-save
├── Task 8.2: Session restore
├── Task 11.1: Context menu
└── Task 12.*: Accessibility

Week 6: Performance & Testing
├── Task 13.1: Large polygon sets
├── Task 13.2: Debouncing
└── End-to-end testing (verify ≥85% accuracy target)
```

---

## Dependencies

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "maplibre-gl": "^4.0.0",
    "@turf/turf": "^6.5.0",
    "zustand": "^4.5.0",
    "shpwrite": "^0.3.2",
    "file-saver": "^2.0.5",
    "jszip": "^3.10.0",
    "proj4": "^2.9.0"
  },
  "devDependencies": {
    "@types/proj4": "^2.5.0",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.0.0",
    "vite": "^5.0.0"
  }
}
```

**Python dependencies for data prep scripts:**
```
gdal
rasterio
geopandas
pyproj
```

---

## Architecture Decisions (Confirmed)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Tile Server** | Local (Vite static files) | All data served from `public/` folder |
| **SAM Integration** | Pre-computed segments | Load existing `sam_raw_segments.geojson` |
| **Backend** | None (pure client-side) | All editing/export happens in browser |
| **Deployment** | Local machine | `npm run dev` serves everything |

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    Browser (React App)                  │
│  ┌───────────────────────────────────────────────────┐  │
│  │               MapLibre GL JS                      │  │
│  │  • Loads ORI tiles from /tiles/{z}/{x}/{y}.png   │  │
│  │  • Loads GeoJSON from /data/*.geojson            │  │
│  │  • All editing operations in-browser (Turf.js)   │  │
│  │  • Export to Shapefile in-browser (shpwrite)     │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│              Vite Dev Server (localhost:5173)           │
│  public/                                                │
│  ├── tiles/          # Pre-generated XYZ tiles         │
│  │   └── {z}/{x}/{y}.png                               │
│  └── data/                                              │
│      ├── sam_segments.geojson  # Pre-computed SAM      │
│      └── ground_truth.geojson  # Optional reference    │
└─────────────────────────────────────────────────────────┘
```

### One-Time Data Preparation (Python Scripts)

Before starting the React app, run these scripts once:

```bash
# 1. Generate XYZ tiles from the 11GB ORI
python scripts/tile_ori.py \
  --input "AI Hackathon/nibanupudi.tif" \
  --output public/tiles/ \
  --zoom 12-20

# 2. Convert coordinates from EPSG:32644 to EPSG:4326
python scripts/convert_coordinates.py \
  --input evaluation_output/nibanupudi_105parcels/sam_raw_segments.geojson \
  --output public/data/sam_segments.geojson \
  --from-crs EPSG:32644 \
  --to-crs EPSG:4326
```

These scripts need to be created in Phase 0.

# BoundaryAI Implementation Plan

**Stack:** React + Tailwind CSS + MapLibre GL JS
**Date:** 2026-01-17

---

## Available Data

| Asset | Path | Format | Size |
|-------|------|--------|------|
| ORI Tile | `AI Hackathon/nibanupudi.tif` | GeoTIFF | 11GB |
| Ground Truth | `evaluation_output/.../ground_truth.geojson` | GeoJSON (EPSG:32644) | 63KB |
| SAM Segments | `evaluation_output/.../sam_raw_segments.geojson` | GeoJSON (EPSG:32644) | 34MB |

**Note:** The 11GB ORI needs to be converted to Cloud Optimized GeoTIFF (COG) or tiled for web display.

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
│   │   └── TopologyPanel.tsx
│   ├── BottomBar/
│   │   ├── BottomBar.tsx
│   │   ├── SelectionInfo.tsx
│   │   └── ModeIndicator.tsx
│   ├── Dialogs/
│   │   ├── ExportDialog.tsx
│   │   ├── RestoreSessionDialog.tsx
│   │   └── ConfirmDialog.tsx
│   └── LoadScreen/
│       ├── EmptyState.tsx
│       └── ProcessingState.tsx
├── hooks/
│   ├── usePolygonStore.ts       # Zustand store for polygons
│   ├── useSelectionStore.ts     # Selection state
│   ├── useHistoryStore.ts       # Undo/redo
│   ├── useKeyboardShortcuts.ts  # Keyboard handling
│   └── useAutoSave.ts           # LocalStorage persistence
├── utils/
│   ├── geometry.ts              # Turf.js helpers
│   ├── topology.ts              # Gap/overlap detection
│   ├── export.ts                # Shapefile export
│   └── coordinates.ts           # CRS conversion
├── types/
│   └── index.ts                 # TypeScript types
└── App.tsx
```

### Task 0.2: Data Preparation (Backend/Scripts)
```
- Convert nibanupudi.tif to tiles (XYZ or COG)
- Convert GeoJSON from EPSG:32644 to EPSG:4326 (WGS84) for web maps
- Host tiles locally or on CDN
```

---

## Phase 1: Core Map Display

### Task 1.1: MapCanvas Component
**File:** `src/components/Map/MapCanvas.tsx`

**Requirements:**
- Initialize MapLibre GL map
- Load ORI tiles as raster layer
- Support zoom/pan
- Handle map events (click, mousemove)

**Acceptance Criteria:**
- [ ] Map renders with ORI imagery
- [ ] Scroll zooms in/out
- [ ] Click+drag pans
- [ ] Map fills 80% of screen width

### Task 1.2: Polygon Layer
**File:** `src/components/Map/PolygonLayer.tsx`

**Requirements:**
- Load GeoJSON polygons
- Render with orange border, no fill
- Handle hover state (border thicker, 10% fill)
- Handle selected state (cyan border, 15% fill)
- Handle multi-selected state (dashed cyan border)

**Acceptance Criteria:**
- [ ] Polygons render on map
- [ ] Hover effect works
- [ ] Selected polygons visually distinct
- [ ] Performance OK with 1000+ polygons

### Task 1.3: Layer Toggle
**File:** `src/components/Sidebar/LayerPanel.tsx`

**Requirements:**
- Checkbox for "Imagery" layer
- Checkbox for "Polygons" layer
- Toggle visibility on map

**Acceptance Criteria:**
- [ ] Can hide/show ORI
- [ ] Can hide/show polygons

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

**Library:** shpwrite or shapefile-js

**Requirements:**
- Convert GeoJSON to Shapefile
- Include .prj file for EPSG:32644
- Zip all files

**Acceptance Criteria:**
- [ ] Valid shapefile generated
- [ ] Opens correctly in QGIS
- [ ] Coordinates in EPSG:32644

---

## Phase 10: Initial Load States

### Task 10.1: Empty State
**File:** `src/components/LoadScreen/EmptyState.tsx`

**Requirements:**
- Centered drop zone
- "Load ORI Image" title
- "Drop .tif file here or click to browse"
- File input accepts .tif, .tiff

**Acceptance Criteria:**
- [ ] Drop zone renders
- [ ] Drag-drop works
- [ ] Click opens file picker

### Task 10.2: Processing State
**File:** `src/components/LoadScreen/ProcessingState.tsx`

**Requirements:**
- Progress bar (0-100%)
- "Extracting polygons..."
- Live count: "Found: 612"
- [Cancel] button

**Note:** For MVP, we load pre-computed SAM segments. Real AI extraction is future work.

**Acceptance Criteria:**
- [ ] Progress bar shows
- [ ] Count updates
- [ ] Cancel stops loading

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
└── Task 1.3: Layer toggle

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

Week 4: Validation & Export
├── Task 7.1: Overlap detection
├── Task 7.2: Gap detection
├── Task 7.3: Validation UI
├── Task 9.1: Export dialog
└── Task 9.2: Shapefile generation

Week 5: Polish
├── Task 6.1: All keyboard shortcuts
├── Task 8.1: Auto-save
├── Task 8.2: Session restore
├── Task 10.1: Empty state
├── Task 10.2: Processing state
├── Task 11.1: Context menu
└── Task 12.*: Accessibility

Week 6: Performance & Testing
├── Task 13.1: Large polygon sets
├── Task 13.2: Debouncing
└── End-to-end testing
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
    "jszip": "^3.10.0"
  },
  "devDependencies": {
    "tailwindcss": "^3.4.0",
    "typescript": "^5.0.0",
    "vite": "^5.0.0"
  }
}
```

---

## Questions Before Starting

1. **Tile Server:** Should we set up a local tile server for the ORI, or use a cloud solution?
2. **SAM Integration:** For MVP, load pre-computed segments. When to integrate live SAM?
3. **Backend:** Any Python backend needed, or pure client-side?
4. **Deployment:** Where will this be hosted?

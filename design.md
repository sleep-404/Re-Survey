# BoundaryAI - UI/UX Design Specification

## Project Context

**Application Name:** BoundaryAI - Land Parcel Boundary Editor
**Target Users:** Government Survey Officers, Revenue Department Officials
**Purpose:** AI-assisted land parcel boundary verification and editing for Andhra Pradesh Re-Survey Project
**Tech Stack:** React + TypeScript + MapLibre GL JS + Tailwind CSS

---

## Design Philosophy

### Color Palette (Government-Appropriate)

Use a professional, trustworthy color scheme suitable for government applications:

```
Primary Colors:
- Primary Blue: #1e40af (Government blue - trust, authority)
- Primary Blue Light: #3b82f6 (Hover states)
- Primary Blue Dark: #1e3a8a (Active states)

Secondary Colors:
- Success Green: #059669 (Approved, verified, excellent match)
- Warning Amber: #d97706 (Needs attention, fair match)
- Error Red: #dc2626 (Issues, poor match, conflicts)

Neutral Colors:
- Background: #f8fafc (Light gray-white)
- Surface: #ffffff (Cards, panels)
- Border: #e2e8f0 (Subtle dividers)
- Text Primary: #1e293b (Dark slate)
- Text Secondary: #64748b (Muted text)
- Text Disabled: #94a3b8

Land Type Colors (for parcel classification):
- Agricultural: #ea580c (Orange)
- Gramakantam: #ca8a04 (Yellow)
- Building: #dc2626 (Red)
- Road: #6b7280 (Gray)
- Water Body: #2563eb (Blue)
- Open Space: #16a34a (Green)
- Compound: #9333ea (Purple)
- Government Land: #0d9488 (Teal)
```

### Typography

```
Font Family: Inter (Google Fonts) or system-ui
- Headings: 600 weight (Semi-bold)
- Body: 400 weight (Regular)
- Labels: 500 weight (Medium)
- Captions: 400 weight, smaller size
```

### Design Principles

1. **Clarity First** - Every element should have a clear purpose
2. **Data-Dense but Organized** - Officers need to see lots of data, but grouped logically
3. **Minimal Clicks** - Common actions should be 1-2 clicks away
4. **Keyboard Accessible** - Power users can use shortcuts
5. **Status Always Visible** - Progress, sync status, current mode always shown

---

## Screen Overview

| # | Screen Name | Purpose |
|---|-------------|---------|
| 1 | Login | Authentication |
| 2 | Dashboard | Overview & village selection |
| 3 | Map Editor | Main parcel editing interface |
| 4 | Review Summary | Validation & export |

---

## Screen 1: Login Page

### Purpose
Authenticate government officials with their credentials.

### Layout
```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│     [Government of AP Logo]    [Survey Dept Logo]       │
│                                                         │
│              ┌─────────────────────────┐                │
│              │                         │                │
│              │      BoundaryAI         │                │
│              │  Land Parcel Editor     │                │
│              │                         │                │
│              │  ┌───────────────────┐  │                │
│              │  │ Employee ID       │  │                │
│              │  └───────────────────┘  │                │
│              │                         │                │
│              │  ┌───────────────────┐  │                │
│              │  │ Password          │  │                │
│              │  └───────────────────┘  │                │
│              │                         │                │
│              │  ☐ Remember this device │                │
│              │                         │                │
│              │  [      Sign In      ]  │                │
│              │                         │                │
│              │  Forgot password?       │                │
│              │                         │                │
│              └─────────────────────────┘                │
│                                                         │
│     Andhra Pradesh Survey & Land Records Department     │
│                    © 2026 All Rights Reserved           │
└─────────────────────────────────────────────────────────┘
```

### Functionalities
1. Employee ID input field
2. Password input field (with show/hide toggle)
3. Remember device checkbox
4. Sign In button
5. Forgot password link

### User Actions
- Enter credentials and click "Sign In"
- Toggle password visibility
- Check "Remember this device"
- Click "Forgot password" for recovery

### Data Placeholders
```html
<!-- Employee ID field -->
<input type="text" id="employee-id" placeholder="Enter Employee ID" />

<!-- Password field -->
<input type="password" id="password" placeholder="Enter Password" />

<!-- Sign In button -->
<button id="sign-in-btn">Sign In</button>
```

### Integration Notes
- On successful login, redirect to Dashboard (Screen 2)
- Store auth token in localStorage/sessionStorage
- Show error message below form for invalid credentials

---

## Screen 2: Dashboard

### Purpose
Show officer's assigned work, progress overview, and village selection.

### Layout
```
┌─────────────────────────────────────────────────────────────────────┐
│ [Logo] BoundaryAI          [Notifications 🔔]  [👤 Officer Name ▼] │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Welcome back, {{OFFICER_NAME}}                                     │
│  Role: Survey Officer | District: {{DISTRICT_NAME}}                 │
│                                                                     │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐       │
│  │   📊 Total      │ │   ✅ Completed  │ │   ⏳ Pending    │       │
│  │   {{TOTAL}}     │ │   {{DONE}}      │ │   {{PENDING}}   │       │
│  │   Villages      │ │   Villages      │ │   Villages      │       │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘       │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Assigned Villages                          [🔍 Search...]  │   │
│  ├─────────────────────────────────────────────────────────────┤   │
│  │  Village Name    | Mandal      | Parcels | Status | Action  │   │
│  ├─────────────────────────────────────────────────────────────┤   │
│  │  Nibhanupudi     | Pedakurapadu| 12,032  | 🟡 In Progress│[→]│   │
│  │  Kondepadu       | Pedakurapadu| 8,456   | 🟢 Completed  │[→]│   │
│  │  Manchala        | Sattenapalli| 5,234   | ⚪ Not Started│[→]│   │
│  │  ...             | ...         | ...     | ...           │   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  Recent Activity                                                    │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  • Edited 45 parcels in Nibhanupudi - 2 hours ago           │   │
│  │  • Exported shapefile for Kondepadu - Yesterday             │   │
│  │  • Completed verification of Kondepadu - Yesterday          │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Functionalities
1. **Header Bar**
   - Application logo and name
   - Notification bell with count badge
   - User profile dropdown (Settings, Logout)

2. **Welcome Section**
   - Officer name and role
   - District assignment

3. **Summary Cards**
   - Total assigned villages
   - Completed villages count
   - Pending villages count

4. **Village Table**
   - Searchable list of assigned villages
   - Columns: Village Name, Mandal, Total Parcels, Status, Action
   - Status indicators: Not Started (gray), In Progress (yellow), Completed (green)
   - Click row or arrow to open village in Map Editor

5. **Recent Activity Feed**
   - Last 5-10 actions taken by the officer
   - Timestamps in relative format

### User Actions
- Search villages by name
- Click village row to open Map Editor
- Click notification bell to see alerts
- Click profile for settings/logout
- Sort table by any column

### Data Placeholders
```html
<!-- Summary cards -->
<div id="stat-total">{{TOTAL_VILLAGES}}</div>
<div id="stat-completed">{{COMPLETED_VILLAGES}}</div>
<div id="stat-pending">{{PENDING_VILLAGES}}</div>

<!-- Village table row template -->
<tr data-village-id="{{VILLAGE_ID}}">
  <td>{{VILLAGE_NAME}}</td>
  <td>{{MANDAL_NAME}}</td>
  <td>{{PARCEL_COUNT}}</td>
  <td>{{STATUS_BADGE}}</td>
  <td><button class="open-btn">Open</button></td>
</tr>

<!-- Activity item template -->
<li>{{ACTIVITY_TEXT}} - {{RELATIVE_TIME}}</li>
```

### Integration Notes
- Fetch villages list from API on mount
- Store selected village ID in state before navigating to Map Editor
- Real-time update of progress stats

---

## Screen 3: Map Editor (Main Interface)

### Purpose
Primary workspace for viewing and editing land parcel boundaries with AI assistance.

### Layout
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ [←] Nibhanupudi, Pedakurapadu              [💾 Auto-saved] [👤 Officer ▼]  │
├────────────────────────────┬────────────────────────────────────────────────┤
│                            │                                                │
│  ┌──────────────────────┐  │                                                │
│  │ EDITING TOOLS        │  │                                                │
│  │ [V] Select      [N]  │  │         ┌────────────────────────────┐        │
│  │ [D] Draw        [D]  │  │         │                            │        │
│  │ [E] Edit Vertex [E]  │  │         │                            │        │
│  │ [S] Split       [S]  │  │         │     INTERACTIVE MAP        │        │
│  └──────────────────────┘  │         │                            │        │
│                            │         │   (MapLibre GL Canvas)     │        │
│  ┌──────────────────────┐  │         │                            │        │
│  │ LAYERS               │  │         │   - Drone Imagery (ORI)    │        │
│  │ ☑ Drone Imagery      │  │         │   - Google Satellite       │        │
│  │ ☑ Satellite          │  │         │   - Parcel Boundaries      │        │
│  │ ☑ Parcel Boundaries  │  │         │   - Ground Truth Overlay   │        │
│  │ ☐ Ground Truth       │  │         │                            │        │
│  │ ☐ Conflict Highlight │  │         │                            │        │
│  └──────────────────────┘  │         │                            │        │
│                            │         │                            │        │
│  ┌──────────────────────┐  │         └────────────────────────────┘        │
│  │ DATA SOURCE          │  │                                                │
│  │ ○ SAM AI Output      │  │         ┌────────────────────────────┐        │
│  │   (12,032 parcels)   │  │         │ Scale: ─────── │ Lat/Lng   │        │
│  │ ○ Ground Truth       │  │         └────────────────────────────┘        │
│  │   (105 parcels)      │  │                                                │
│  │ ● Working Layer      │  │                                                │
│  └──────────────────────┘  │                                                │
│                            │                                                │
│  ┌──────────────────────┐  │                                                │
│  │ SELECTED PARCEL      │  │                                                │
│  │ ID: SAM-4523         │  │                                                │
│  │ Area: 245.6 m²       │  │                                                │
│  │ Type: Agricultural   │  │                                                │
│  │ [Change Type ▼]      │  │                                                │
│  └──────────────────────┘  │                                                │
│                            │                                                │
│  ┌──────────────────────┐  │                                                │
│  │ AREA COMPARISON      │  │                                                │
│  │ SAM: 245.6 m²        │  │                                                │
│  │ ROR: 250.0 m²        │  │                                                │
│  │ Diff: -4.4 m² (1.8%) │  │                                                │
│  │ ████████████░░ Good  │  │                                                │
│  └──────────────────────┘  │                                                │
│                            │                                                │
├────────────────────────────┴────────────────────────────────────────────────┤
│  Mode: SELECT │ Selected: 1 │ Total: 12,032 │ [Undo] [Redo] [Export] [Done]│
└─────────────────────────────────────────────────────────────────────────────┘
```

### Detailed Component Breakdown

#### A. Header Bar
- Back button (← arrow) to return to Dashboard
- Current village name and mandal
- Auto-save indicator (shows "Saving..." or "Saved ✓")
- User profile dropdown

#### B. Left Sidebar (Collapsible Panels)

**Panel 1: Editing Tools**
| Tool | Shortcut | Description |
|------|----------|-------------|
| Select | V | Click to select parcels, Shift+click for multi-select |
| Draw | N | Draw new polygon boundary (double-click to finish, Escape to cancel) |
| Edit Vertices | E | Drag vertex handles to adjust boundary shape |
| Split | S | Draw line across parcel to divide into two polygons |
| Delete | D | Delete selected parcel(s) - confirmation for 5+ parcels |
| Merge | M | Merge 2+ selected adjacent parcels into one |

**Actions**
| Action | Shortcut | Description |
|--------|----------|-------------|
| Undo | Ctrl+Z or Z | Undo last action |
| Redo | Ctrl+Shift+Z | Redo undone action |
| Select All | Ctrl+A | Select all visible parcels |
| Clear Selection | Escape | Deselect all parcels |

**Panel 2: Layer Controls**
| Layer | Default | Description |
|-------|---------|-------------|
| Drone Imagery (ORI) | ON | High-resolution drone orthophoto |
| Google Satellite | ON | Satellite basemap |
| Parcel Boundaries | ON | Show/hide all parcel polygons |
| Ground Truth Overlay | OFF | Show surveyor-digitized boundaries as dashed red |
| Conflict Highlighting | OFF | Color parcels by area mismatch severity |

**Panel 3: Data Source Selector**
- Radio buttons to switch between:
  - SAM AI Output (machine-detected boundaries, ~12,032 parcels)
  - Ground Truth (surveyor-digitized, ~105 parcels)
  - Working Layer (editable, persists edits)

**Panel 4: Selected Parcel Info**
- Parcel ID
- Calculated area (m² or hectares)
- Current land type classification
- Dropdown to change type (with color swatches)

**Panel 5: Area Comparison**
- Side-by-side comparison: SAM area vs ROR (Record of Rights) area
- Difference in m² and percentage
- Visual progress bar indicating match quality
- Color-coded: Green (excellent), Yellow (fair), Red (poor)

**Panel 6: Topology Validation** (in Validate tab)
- "Validate" button to check for topology errors
- Summary: shows count of overlaps and gaps
- Error list with:
  - Overlap errors (red) - with area in m²
  - Gap errors (blue) - with area in m²
  - "auto-fix" badge on fixable errors
- "Fix All Auto-fixable Errors" button
- Click error to zoom to location
- Total overlap/gap area summary

**Panel 7: Accuracy Metrics** (in Validate tab)
- Ground truth status: loaded/not loaded with polygon count
- "Calculate" button to compute IoU metrics
- Overall IoU score (large display) with 85% target threshold
- Color-coded pass/fail based on target
- Statistics grid:
  - Matched count
  - Unmatched count
  - Above 85% count
  - Below 85% count
- "Parcels Needing Review" list (sorted by lowest IoU)
- "Export List" button for priority review report
- Click parcel to zoom to location

**Panel 8: Min Area Filter** (in Layers tab)
- Slider: 0 to 1000 m² threshold
- Preset buttons: All, 10m², 50m², 100m², 500m²
- "Hiding X parcels" count when filter active
- Area statistics: Smallest, Median, Largest parcel sizes

#### C. Map Canvas (Center)
- Full interactive map powered by MapLibre GL
- Supports:
  - Pan (drag)
  - Zoom (scroll wheel, pinch)
  - Click to select parcels
  - Shift+click for multi-select
  - Ctrl/Cmd+click to toggle selection
  - Double-click to finish drawing/splitting
  - Right-click for context menu
  - Rectangle selection (drag to draw box)
  - Lasso selection (freehand draw to select)

**Map Controls (overlaid on map)**
- Zoom in/out buttons (top-right)
- North arrow/compass
- Scale bar (bottom-left)
- Coordinates display (bottom-right)
- Full-screen toggle

**Context Menu (Right-Click)**
When right-clicking on the map, show contextual options:

*On unselected polygon:*
- Select
- Add to Selection (Shift+Click)
- Zoom to Polygon

*On single selected polygon:*
- Edit Vertices (E)
- Split (S)
- Zoom to Polygon
- Delete (D)

*On multiple selected polygons:*
- Merge (M)
- Delete All (D)
- Zoom to Selection

*On empty space:*
- Select All (Ctrl+A)
- Zoom to Full Extent
- Draw New Polygon (N)

#### D. Bottom Status Bar
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Mode: SELECT │ "Click to select, Shift+click to multi-select" │            │
│              │ Selected: 3 parcels • 456.7 m²                  │            │
│              │                                    [Delete] [Merge] [Split] │
└─────────────────────────────────────────────────────────────────────────────┘
```

- **Mode indicator**: Shows current mode (SELECT, DRAW, EDIT-VERTICES, SPLIT)
- **Mode hint**: Contextual help text for current mode
- **Selection info**:
  - Count of selected parcels
  - Total area of selection (in m² or hectares)
- **Action buttons** (contextual based on selection):
  - Delete (D) - always when selection exists
  - Merge (M) - only when 2+ parcels selected
  - Split (S) - only when 1 parcel selected
  - Edit (E) - only when 1 parcel selected

### Functionalities

1. **Parcel Selection**
   - Single click: Select one parcel
   - Shift+click: Add to selection
   - Ctrl/Cmd+click: Toggle selection
   - Click empty space: Clear selection

2. **Drawing New Parcels**
   - Click to add vertices
   - Double-click to complete polygon
   - Escape to cancel

3. **Editing Vertices**
   - Select parcel, press E
   - Drag vertex handles to adjust
   - Changes auto-save

4. **Splitting Parcels**
   - Select parcel, press S
   - Draw a line across the parcel
   - Double-click to execute split

5. **Land Type Classification**
   - Select parcel(s)
   - Use dropdown or keyboard shortcuts 1-8
   - Supports bulk classification

6. **Layer Toggles**
   - Toggle visibility of each layer
   - Conflict highlighting shows red/yellow/green based on area mismatch

7. **Data Source Switching**
   - Switch between AI output, ground truth, and working layer
   - Working layer preserves all edits

8. **Delete Parcels**
   - Select parcel(s) and press D or click Delete button
   - Confirmation dialog when deleting 5+ parcels
   - Supports undo

9. **Merge Parcels**
   - Select 2+ adjacent parcels
   - Press M or click Merge button
   - Combines into single polygon
   - Inherits land type from first selected parcel
   - Supports undo

10. **Rectangle Selection**
    - Drag to draw selection box
    - All parcels intersecting box are selected

11. **Lasso Selection**
    - Freehand draw around parcels
    - All parcels within lasso are selected

12. **Topology Validation**
    - Detects overlaps between parcels
    - Detects gaps between parcels
    - Auto-fix capability for some errors
    - Click error to zoom to location

13. **Accuracy Calculation**
    - Compares parcels against ground truth
    - Calculates IoU (Intersection over Union)
    - Shows overall accuracy score
    - Lists parcels needing review

14. **Area Filtering**
    - Hide parcels below minimum area threshold
    - Useful for filtering out noise/small segments
    - Preset buttons for common thresholds

15. **Export with Validation**
    - Runs topology check before export
    - Shows warning if errors exist
    - Option to "Export Anyway"
    - Downloads as ZIP with .shp, .shx, .dbf, .prj files
    - Output CRS: EPSG:32644 (UTM Zone 44N)

16. **Auto-Save**
    - Automatically saves edits to localStorage every 30 seconds
    - "Saved ✓" indicator in header
    - Restore session dialog on page reload

### User Actions

| Action | Method | Shortcut |
|--------|--------|----------|
| **Selection** | | |
| Select parcel | Click on parcel | - |
| Multi-select | Shift+click | - |
| Toggle selection | Ctrl/Cmd+click | - |
| Select All | - | Ctrl+A |
| Clear selection | Click empty space | Escape |
| **Mode Switching** | | |
| Select mode | Click Select tool | V |
| Draw mode | Click Draw tool | N |
| Edit vertices mode | Click Edit tool | E |
| Split mode | Click Split tool | S |
| **Editing** | | |
| Delete selected | Click Delete button | D |
| Merge selected | Click Merge button | M |
| Undo | Click Undo button | Ctrl+Z or Z |
| Redo | Click Redo button | Ctrl+Shift+Z |
| **Drawing** | | |
| Add vertex | Click on map | - |
| Finish polygon | Double-click | - |
| Cancel drawing | - | Escape |
| **Land Type Classification** | | |
| Agricultural | - | 1 |
| Gramakantam | - | 2 |
| Building | - | 3 |
| Road | - | 4 |
| Water Body | - | 5 |
| Open Space | - | 6 |
| Compound | - | 7 |
| Government Land | - | 8 |

### Data Placeholders

```html
<!-- Village header -->
<h1 id="village-name">{{VILLAGE_NAME}}, {{MANDAL_NAME}}</h1>
<span id="save-status">{{SAVE_STATUS}}</span>

<!-- Data source counts -->
<span id="sam-count">{{SAM_PARCEL_COUNT}}</span>
<span id="gt-count">{{GT_PARCEL_COUNT}}</span>

<!-- Selected parcel info -->
<div id="selected-id">{{PARCEL_ID}}</div>
<div id="selected-area">{{PARCEL_AREA}} m²</div>
<div id="selected-type">{{PARCEL_TYPE}}</div>

<!-- Area comparison -->
<div id="sam-area">{{SAM_AREA}} m²</div>
<div id="ror-area">{{ROR_AREA}} m²</div>
<div id="area-diff">{{AREA_DIFFERENCE}} m² ({{DIFF_PERCENT}}%)</div>
<div id="match-quality" class="{{QUALITY_CLASS}}">{{QUALITY_LABEL}}</div>

<!-- Status bar -->
<span id="current-mode">{{MODE}}</span>
<span id="mode-hint">{{MODE_HINT_TEXT}}</span>
<span id="selection-count">{{SELECTED_COUNT}}</span>
<span id="selection-area">{{SELECTED_AREA}}</span>
<span id="total-count">{{TOTAL_PARCELS}}</span>

<!-- Topology validation -->
<div id="overlap-count">{{OVERLAP_COUNT}}</div>
<div id="gap-count">{{GAP_COUNT}}</div>
<div id="total-overlap-area">{{TOTAL_OVERLAP_AREA}}</div>
<div id="total-gap-area">{{TOTAL_GAP_AREA}}</div>

<!-- Accuracy metrics -->
<div id="overall-iou">{{OVERALL_IOU}}%</div>
<div id="matched-count">{{MATCHED_COUNT}}</div>
<div id="unmatched-count">{{UNMATCHED_COUNT}}</div>
<div id="above-threshold">{{ABOVE_THRESHOLD_COUNT}}</div>
<div id="below-threshold">{{BELOW_THRESHOLD_COUNT}}</div>

<!-- ROR Panel -->
<div id="ror-record-count">{{ROR_RECORD_COUNT}}</div>
<div id="ror-total-area">{{ROR_TOTAL_AREA}}</div>
<!-- ROR record row template -->
<div class="ror-record" data-lp-number="{{LP_NUMBER}}">
  <span class="lp-number">{{LP_NUMBER}}</span>
  <span class="area">{{AREA}} m²</span>
</div>

<!-- Statistics Panel -->
<div id="stats-total-parcels">{{TOTAL_PARCEL_COUNT}}</div>
<div id="stats-total-area">{{TOTAL_AREA_HA}} ha</div>
<div id="stats-min-area">{{MIN_AREA}} m²</div>
<div id="stats-avg-area">{{AVG_AREA}} m²</div>
<div id="stats-median-area">{{MEDIAN_AREA}} m²</div>
<div id="stats-max-area">{{MAX_AREA}} m²</div>
<!-- Parcel type bar chart - repeat for each type -->
<div class="type-bar" data-type="{{TYPE_ID}}" style="--bar-color: {{TYPE_COLOR}}">
  <span class="type-name">{{TYPE_LABEL}}</span>
  <div class="bar" style="width: {{PERCENT}}%"></div>
  <span class="count">{{COUNT}} ({{PERCENT}}%)</span>
</div>

<!-- Map container - DO NOT include content, just the container -->
<div id="map-container" style="width: 100%; height: 100%;"></div>
```

### Integration Notes

1. **Map Integration**
   - The `#map-container` div will be replaced by MapLibre GL canvas
   - All map tiles, layers, and interactions are handled by existing React components
   - Design should provide the container only

2. **State Management**
   - Selected parcel info comes from `useSelectionStore`
   - Parcel data comes from `usePolygonStore`
   - Layer visibility from `useLayerStore`
   - Mode from `useModeStore`

3. **Real-time Updates**
   - Area comparison updates when selection changes
   - Save status updates automatically (auto-save every 30 seconds)
   - Parcel count updates when filtered

### Dialogs/Modals

#### Export Dialog
Triggered when clicking "Export Shapefile" button.

```
┌─────────────────────────────────────────┐
│ Export Shapefile                    [X] │
├─────────────────────────────────────────┤
│ Download polygons as ESRI Shapefile     │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ Total Polygons    12,032            │ │
│ │ Output CRS        EPSG:32644 (UTM)  │ │
│ │ Format            .shp, .shx, .dbf  │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ ⚠ 3 topology errors detected        │ │
│ │   2 overlaps, 1 gap                 │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ You can still export with errors, but   │
│ the shapefile may not meet quality      │
│ requirements.                           │
│                                         │
│        [Cancel] [Export Anyway] [Export]│
└─────────────────────────────────────────┘
```

**Features:**
- Shows polygon count and output format
- Runs topology validation before export
- Shows error count if validation fails
- "Export Anyway" button (yellow) for exporting with errors
- "Export" button (blue) for clean export
- Download as ZIP file containing .shp, .shx, .dbf, .prj

#### Restore Session Dialog
Shown on page load if unsaved session exists.

```
┌─────────────────────────────────────────┐
│ Restore Previous Session?           [X] │
├─────────────────────────────────────────┤
│ We found an unsaved session from your   │
│ last visit.                             │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ Saved         2 hours ago           │ │
│ │ Date          Jan 22, 2026 3:45 PM  │ │
│ │ Polygons      12,032                │ │
│ │ Edits made    47                    │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ Choose "Restore" to continue where you  │
│ left off, or "Discard" to start fresh.  │
│                                         │
│              [Discard] [Restore Session]│
└─────────────────────────────────────────┘
```

**Features:**
- Shows time since last save
- Shows polygon count and edit count
- "Discard" clears saved session and loads fresh data
- "Restore Session" loads saved parcels

#### Delete Confirmation Dialog
Shown when deleting 5+ parcels.

```
┌─────────────────────────────────────────┐
│ Confirm Delete                      [X] │
├─────────────────────────────────────────┤
│ Are you sure you want to delete         │
│ 15 parcels?                             │
│                                         │
│ This action can be undone with Ctrl+Z.  │
│                                         │
│                      [Cancel] [Delete]  │
└─────────────────────────────────────────┘
```

---

## Screen 4: Review Summary

### Purpose
Final review before submission, showing validation results and export options.

### Layout
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ [←] Review: Nibhanupudi                                    [👤 Officer ▼]  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Verification Summary                                                       │
│  ═══════════════════════════════════════════════════════════════════════   │
│                                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │ 📊 12,032    │  │ ✅ 8,456     │  │ ⚠️ 2,876     │  │ ❌ 700       │   │
│  │ Total        │  │ Verified     │  │ Need Review  │  │ Conflicts    │   │
│  │ Parcels      │  │ (70.3%)      │  │ (23.9%)      │  │ (5.8%)       │   │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘   │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ Classification Breakdown                                               │ │
│  ├───────────────────────────────────────────────────────────────────────┤ │
│  │ Agricultural    ████████████████████████████████░░░░░  8,234 (68.5%) │ │
│  │ Gramakantam     ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  1,456 (12.1%) │ │
│  │ Building        ██████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  1,023 (8.5%)  │ │
│  │ Road            ███░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    567 (4.7%)  │ │
│  │ Water Body      ██░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    234 (1.9%)  │ │
│  │ Other           ██░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    518 (4.3%)  │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ Area Statistics                                                        │ │
│  ├───────────────────────────────────────────────────────────────────────┤ │
│  │ Total Area: 786.17 hectares                                           │ │
│  │ Min: 2.3 m² | Avg: 65.4 m² | Median: 48.2 m² | Max: 12,456 m²        │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ Quality Checks                                                 Status │ │
│  ├───────────────────────────────────────────────────────────────────────┤ │
│  │ ✅ All parcels have land type assigned                          Pass │ │
│  │ ✅ No topology errors (overlaps/gaps)                           Pass │ │
│  │ ⚠️ 156 parcels have >10% area mismatch with ROR            Warning │ │
│  │ ✅ All parcels have valid geometry                              Pass │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ Export Options                                                         │ │
│  ├───────────────────────────────────────────────────────────────────────┤ │
│  │  [📦 Export Shapefile]  [📄 Export GeoJSON]  [📊 Export Report PDF]  │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                                                                       │ │
│  │  [  ← Back to Editor  ]              [  Submit for Approval  ✓  ]    │ │
│  │                                                                       │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Functionalities

1. **Summary Cards**
   - Total parcels count
   - Verified (green) - parcels with good area match
   - Need Review (yellow) - parcels with fair area match
   - Conflicts (red) - parcels with poor area match

2. **Classification Breakdown**
   - Bar chart showing distribution by land type
   - Count and percentage for each type

3. **Area Statistics**
   - Total area in hectares
   - Min, Average, Median, Max parcel sizes

4. **Quality Checks**
   - List of validation rules with pass/fail/warning status
   - Click on warnings to see affected parcels

5. **Export Options**
   - Shapefile export (ZIP with .shp, .dbf, .shx, .prj)
   - GeoJSON export
   - PDF report generation

6. **Action Buttons**
   - Back to Editor - return to Screen 3
   - Submit for Approval - mark village as complete

### User Actions
- View summary statistics
- Click warning items to see details
- Export in various formats
- Submit for supervisor approval

### Data Placeholders

```html
<!-- Summary cards -->
<div id="total-parcels">{{TOTAL_COUNT}}</div>
<div id="verified-count">{{VERIFIED_COUNT}} ({{VERIFIED_PCT}}%)</div>
<div id="review-count">{{REVIEW_COUNT}} ({{REVIEW_PCT}}%)</div>
<div id="conflict-count">{{CONFLICT_COUNT}} ({{CONFLICT_PCT}}%)</div>

<!-- Classification bars - repeat for each type -->
<div class="type-bar" data-type="agricultural">
  <span class="type-name">Agricultural</span>
  <div class="bar" style="width: {{PERCENT}}%"></div>
  <span class="type-count">{{COUNT}} ({{PERCENT}}%)</span>
</div>

<!-- Area stats -->
<div id="total-area">{{TOTAL_AREA}} hectares</div>
<div id="area-stats">
  Min: {{MIN_AREA}} m² | Avg: {{AVG_AREA}} m² |
  Median: {{MEDIAN_AREA}} m² | Max: {{MAX_AREA}} m²
</div>

<!-- Quality checks - repeat for each check -->
<div class="check-item {{STATUS}}">
  <span class="check-icon">{{ICON}}</span>
  <span class="check-text">{{CHECK_DESCRIPTION}}</span>
  <span class="check-status">{{STATUS_TEXT}}</span>
</div>
```

### Integration Notes
- Statistics calculated from `usePolygonStore` parcel data
- Quality checks run on-demand using `topology.ts` and `accuracy.ts` utilities
- Export functions already exist in `exportShapefile.ts`

---

## Component Library Requirements

### Common Components Needed

1. **Button**
   - Primary (filled, primary blue)
   - Secondary (outlined)
   - Danger (red, for destructive actions)
   - Icon button (square, icon only)
   - States: default, hover, active, disabled

2. **Input Fields**
   - Text input
   - Password input (with toggle)
   - Search input (with icon)

3. **Checkbox & Radio**
   - Checkbox with label
   - Radio button group

4. **Dropdown/Select**
   - Single select with options
   - With color swatches for land types

5. **Card/Panel**
   - Collapsible panel with header
   - Stat card with icon

6. **Table**
   - Sortable columns
   - Row hover state
   - Action buttons in rows

7. **Progress/Status Indicators**
   - Progress bar (horizontal)
   - Status badge (colored dot + text)
   - Match quality indicator

8. **Navigation**
   - Header bar
   - Sidebar (collapsible)
   - Breadcrumb
   - Tab navigation

9. **Modals/Dialogs**
   - Confirmation dialog
   - Export dialog with options
   - Error/Success toast notifications

---

## Responsive Considerations

- **Desktop (1280px+)**: Full layout as shown
- **Laptop (1024-1279px)**: Narrower sidebar, smaller panels
- **Tablet (768-1023px)**: Collapsible sidebar, map takes priority
- **Mobile**: Not primary target, but basic read-only viewing

---

## Accessibility Requirements

1. **Keyboard Navigation**
   - All interactive elements focusable
   - Visible focus indicators
   - Logical tab order

2. **Screen Reader Support**
   - ARIA labels on icons and buttons
   - Meaningful alt text
   - Status announcements

3. **Color Contrast**
   - Minimum 4.5:1 for normal text
   - Minimum 3:1 for large text and UI components

4. **Motion**
   - Respect `prefers-reduced-motion`
   - No auto-playing animations

---

## File Naming Convention

When delivering HTML/CSS files, please use:

```
login.html          - Screen 1: Login Page
dashboard.html      - Screen 2: Dashboard
editor.html         - Screen 3: Map Editor
review.html         - Screen 4: Review Summary
components.html     - Reusable component library showcase
styles.css          - Main stylesheet
```

---

## Integration Handoff Checklist

When you share the HTML designs back, ensure:

1. [ ] All placeholder text uses `{{PLACEHOLDER_NAME}}` format
2. [ ] Map container is an empty `<div id="map-container">`
3. [ ] Interactive elements have unique IDs
4. [ ] CSS classes follow BEM or similar naming convention
5. [ ] Color variables are defined as CSS custom properties
6. [ ] Responsive breakpoints are implemented
7. [ ] All states (hover, active, disabled) are styled
8. [ ] Loading states for async operations
9. [ ] Error states for form validation
10. [ ] Empty states for no-data scenarios

I will then integrate:
- MapLibre GL map rendering
- Real parcel data from GeoJSON files
- ROR data from XLSX file
- All state management and interactions
- Export functionality
- Auto-save mechanism

---

## Questions for Designer

1. Should the sidebar be on the left or right of the map?
2. Preferred icon style: outlined, filled, or duotone?
3. Any specific government branding assets (logos, emblems)?
4. Preference for light or dark theme for the map editor?
5. Any specific font requirements from government guidelines?

---

*Document Version: 1.0*
*Last Updated: 2026-01-22*
*Prepared for: UI/UX Design Tool Integration*

# BoundaryAI - UI/UX Design Specification

## Overview

**Application:** BoundaryAI - AI-Assisted Land Parcel Editor
**Users:** Government Survey Officers (Andhra Pradesh Re-Survey Project)
**Core Value:** AI does the heavy lifting - auto-detects boundaries, officers verify and correct. 10x faster than manual tracing.

---

## The Problem We Solve

**Without AI:** Officers manually trace every parcel boundary from drone images. Slow, tedious, error-prone.

**With BoundaryAI:** AI (SAM) auto-detects 12,000+ parcel boundaries in seconds. Officers review, fix mistakes, and export. Massive productivity boost.

### Two Common AI Mistakes Officers Fix:

| Problem | What Happened | Officer Action |
|---------|---------------|----------------|
| **Over-segmentation** | AI saw shadow/channel as boundary, created extra parcels | Select fragments → **Merge (M)** |
| **Under-segmentation** | AI missed a faint bund, merged two parcels | Select parcel → **Split (S)** → draw line |

---

## Demo Flow

```
Login → Dashboard (select village) → Map Editor (verify & edit parcels) → Export
```

**Three screens. One focused workflow.**

---

## Screen 1: Login

Simple authentication with government branding. Clean, professional, minimal.

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│        [AP Government Logo]  [Survey Dept Logo]         │
│                                                         │
│              ┌─────────────────────────┐                │
│              │                         │                │
│              │      BoundaryAI         │                │
│              │   Land Parcel Editor    │                │
│              │                         │                │
│              │  ┌───────────────────┐  │                │
│              │  │ Employee ID       │  │                │
│              │  └───────────────────┘  │                │
│              │                         │                │
│              │  ┌───────────────────┐  │                │
│              │  │ Password ******   │  │                │
│              │  └───────────────────┘  │                │
│              │                         │                │
│              │  [      Sign In      ]  │                │
│              │                         │                │
│              └─────────────────────────┘                │
│                                                         │
│      Andhra Pradesh Survey & Land Records Department    │
└─────────────────────────────────────────────────────────┘
```

### Elements
- AP Government emblem/logo
- Survey Department logo
- Application name and tagline
- Employee ID input
- Password input
- Sign In button
- Department name footer

### Placeholders
```html
<img id="govt-logo" src="{{GOVT_LOGO}}" alt="Government of AP" />
<img id="dept-logo" src="{{DEPT_LOGO}}" alt="Survey Department" />
<input id="employee-id" placeholder="Employee ID" />
<input id="password" type="password" placeholder="Password" />
<button id="login-btn">Sign In</button>
```

---

## Screen 2: Dashboard

Village selection screen. Shows assigned villages with status and parcel counts.

```
┌─────────────────────────────────────────────────────────────────────────┐
│  [Logo] BoundaryAI                                    [👤 Sri Ramesh ▼] │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Welcome, Sri Ramesh                                                    │
│  Survey Officer • Guntur District                                       │
│                                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                     │
│  │     12      │  │      8      │  │      4      │                     │
│  │  Assigned   │  │  Completed  │  │   Pending   │                     │
│  │  Villages   │  │             │  │             │                     │
│  └─────────────┘  └─────────────┘  └─────────────┘                     │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  Your Villages                                    [🔍 Search]   │   │
│  ├─────────────────────────────────────────────────────────────────┤   │
│  │                                                                 │   │
│  │  ┌─────────────────────────────────────────────────────────┐   │   │
│  │  │  📍 Nibhanupudi                                         │   │   │
│  │  │  Pedakurapadu Mandal • 12,032 parcels                   │   │   │
│  │  │  ████████████████████░░░░ 78% verified                  │   │   │
│  │  │                                          [Open →]       │   │   │
│  │  └─────────────────────────────────────────────────────────┘   │   │
│  │                                                                 │   │
│  │  ┌─────────────────────────────────────────────────────────┐   │   │
│  │  │  📍 Kondepadu                                           │   │   │
│  │  │  Pedakurapadu Mandal • 8,456 parcels                    │   │   │
│  │  │  ████████████████████████████ 100% verified ✓           │   │   │
│  │  │                                          [View →]       │   │   │
│  │  └─────────────────────────────────────────────────────────┘   │   │
│  │                                                                 │   │
│  │  ┌─────────────────────────────────────────────────────────┐   │   │
│  │  │  📍 Manchala                                            │   │   │
│  │  │  Sattenapalli Mandal • 5,234 parcels                    │   │   │
│  │  │  ░░░░░░░░░░░░░░░░░░░░░░░░ Not started                   │   │   │
│  │  │                                          [Start →]      │   │   │
│  │  └─────────────────────────────────────────────────────────┘   │   │
│  │                                                                 │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Elements
- Header with logo and user dropdown
- Welcome message with officer name and district
- Summary stats cards (Assigned, Completed, Pending)
- Village cards showing:
  - Village name
  - Mandal name
  - Parcel count
  - Progress bar with percentage
  - Action button (Open/View/Start)
- Search box to filter villages

### Placeholders
```html
<!-- Header -->
<span id="user-name">{{USER_NAME}}</span>
<span id="user-district">{{DISTRICT}}</span>

<!-- Stats -->
<div id="stat-assigned">{{ASSIGNED_COUNT}}</div>
<div id="stat-completed">{{COMPLETED_COUNT}}</div>
<div id="stat-pending">{{PENDING_COUNT}}</div>

<!-- Village card template -->
<div class="village-card" data-village-id="{{VILLAGE_ID}}">
  <h3>{{VILLAGE_NAME}}</h3>
  <p>{{MANDAL_NAME}} • {{PARCEL_COUNT}} parcels</p>
  <div class="progress-bar" style="--progress: {{PERCENT}}%"></div>
  <span>{{PERCENT}}% verified</span>
  <button class="open-village">Open →</button>
</div>
```

### Integration Notes
- For demo, clicking "Open →" on Nibhanupudi navigates to Map Editor
- Village data is static/mock - we only have Nibhanupudi data loaded
- Progress percentage can be calculated from parcel classification status

---

## Screen 3: Map Editor (Core Interface)

**This is where ALL the real functionality lives.** Everything documented here is implemented and uses real data.

### Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  [←] Nibhanupudi, Pedakurapadu                        [Saved ✓] [Ramesh ▼] │
├────────────────────────┬────────────────────────────────────────────────────┤
│                        │                                                    │
│  [Tools][Layers]       │                                                    │
│  [Classify][Validate]  │                                                    │
│  [ROR][Stats]          │                                                    │
│                        │                                                    │
│  ┌──────────────────┐  │                  INTERACTIVE MAP                   │
│  │                  │  │                                                    │
│  │                  │  │            ┌──────────────────────┐                │
│  │   Active Tab     │  │            │  Drone imagery with  │                │
│  │   Content        │  │            │  AI-detected parcel  │                │
│  │                  │  │            │  boundaries overlay  │                │
│  │                  │  │            └──────────────────────┘                │
│  │                  │  │                                                    │
│  │                  │  │                                                    │
│  │                  │  │                                                    │
│  └──────────────────┘  │                                                    │
│                        │                                                    │
│  [Export Shapefile]    │                                                    │
│                        │                                                    │
├────────────────────────┴────────────────────────────────────────────────────┤
│  Mode: SELECT │ "Click to select, Shift+click for multi" │ Selected: 0     │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Sidebar Tabs (All Implemented)

### Tab 1: Tools

Editing tools for parcel manipulation.

| Tool | Shortcut | Description |
|------|----------|-------------|
| Select | V | Click to select parcels. Shift+click for multi-select. Drag for box select. |
| Draw | N | Draw new parcel. Click to add points, double-click to finish. |
| Edit Vertices | E | Drag vertex handles to reshape selected parcel boundary. |
| Split | S | Draw a line across parcel to divide it into two. |

| Action | Shortcut | Description |
|--------|----------|-------------|
| Undo | Z or Ctrl+Z | Undo last action |
| Redo | Shift+Z | Redo undone action |
| Delete | D | Delete selected parcel(s) |
| Merge | M | Merge 2+ selected parcels into one |

---

### Tab 2: Layers

Data source selection and layer visibility controls.

**Data Source** (Radio buttons)
| Source | Description |
|--------|-------------|
| SAM AI Output | AI-detected boundaries (12,032 parcels) |
| Ground Truth | Manually digitized reference (105 parcels) |
| Working Layer | Your edits (auto-saved) |

**Layer Toggles** (Checkboxes)
| Toggle | Default | Description |
|--------|---------|-------------|
| Show GT Overlay | OFF | Overlay ground truth as dashed red lines |
| Conflict Highlighting | OFF | Color parcels by area mismatch (green/yellow/red) |
| ORI Tiles | ON | Show drone orthophoto imagery |
| Google Satellite | ON | Show satellite basemap |
| Polygons | ON | Show/hide parcel boundaries |

**Min Area Filter**
- Slider: 0 to 1000 m²
- Presets: All, 10m², 50m², 100m², 500m²
- Shows: "Hiding X parcels" when filter active
- Stats: Smallest, Median, Largest parcel sizes

---

### Tab 3: Classify

Assign land type to selected parcel(s).

| Type | Shortcut | Color |
|------|----------|-------|
| Agricultural | 1 | Orange |
| Gramakantam | 2 | Yellow |
| Building | 3 | Red |
| Road | 4 | Gray |
| Water Body | 5 | Blue |
| Open Space | 6 | Green |
| Compound | 7 | Purple |
| Government Land | 8 | Teal |

- Shows current type of selected parcel
- Shows "Mixed types" when multiple different types selected
- Click button or press number key to assign type

---

### Tab 4: Validate

Quality checks and accuracy metrics.

**Area Comparison** (when parcel selected)
- SAM Area: calculated area from AI boundary
- ROR Area: area from Record of Rights
- Difference: absolute and percentage
- Match indicator: Excellent (<5%), Fair (5-15%), Poor (>15%)

**Topology Validation**
- "Validate" button to check for errors
- Shows count: X overlaps, Y gaps
- Error list with click-to-zoom
- "Fix All" button for auto-fixable errors

**Accuracy Metrics**
- Overall IoU score (target: 85%)
- Matched/Unmatched parcel counts
- "Parcels Needing Review" list
- "Export Priority List" button

---

### Tab 5: ROR

Record of Rights data panel.

- Shows list of ROR entries
- Search box to filter by LP number
- Each entry shows:
  - LP Number (e.g., LP1, LP2, etc.)
  - Area in m²
- Click entry to highlight/select

---

### Tab 6: Stats

Statistics summary for current data.

**Overview**
- Total Parcels: 12,032
- Total Area: 78.62 ha

**Area Distribution**
- Min, Average, Median, Max parcel sizes

**By Parcel Type**
- Horizontal bar chart
- Each type with count and percentage
- Bar color matches type color

---

## Bottom Bar (Implemented)

Status bar showing current state and contextual actions.

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Mode: SELECT │ "Click to select, Shift+click for multi" │              │
│              │ Selected: 3 parcels • 456.7 m²           │ [Del][Merge] │
└─────────────────────────────────────────────────────────────────────────┘
```

- **Mode badge**: SELECT, DRAW, EDIT, SPLIT
- **Mode hint**: Contextual instructions
- **Selection info**: Count and total area
- **Action buttons**: Delete (D), Merge (M), Split (S), Edit (E) - shown contextually

---

## Map Interactions (All Implemented)

| Action | How To |
|--------|--------|
| Pan | Drag the map |
| Zoom | Scroll wheel or pinch |
| Select parcel | Click on it |
| Multi-select | Shift+click to add |
| Box select | Drag to draw rectangle |
| Toggle selection | Ctrl+click |
| Clear selection | Click empty area or Escape |
| Right-click menu | Context actions on parcels |

**Right-Click Menu Options:**
- On unselected parcel: Select, Add to Selection, Zoom to
- On selected parcel: Edit Vertices, Split, Delete, Zoom to
- On multiple selection: Merge, Delete All, Zoom to Selection
- On empty space: Draw New, Select All, Zoom to Extent

---

## Export Dialog (Implemented)

Triggered by "Export Shapefile" button.

```
┌─────────────────────────────────────────┐
│  Export Shapefile                   [X] │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ Total Polygons    12,032        │    │
│  │ Output CRS        EPSG:32644    │    │
│  │ Format            .shp .dbf .shx│    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ ✓ No topology errors            │    │
│  └─────────────────────────────────┘    │
│                                         │
│           [Cancel]  [Export]            │
│                                         │
└─────────────────────────────────────────┘
```

- Shows polygon count and output format
- Runs topology validation
- Shows warning if errors exist
- Downloads ZIP with .shp, .shx, .dbf, .prj files

---

## Color Palette

```
Primary:       #1e40af (Government blue)
Primary Light: #3b82f6
Success:       #059669 (Green)
Warning:       #d97706 (Amber)
Error:         #dc2626 (Red)

Background:    #f8fafc
Surface:       #ffffff
Border:        #e2e8f0
Text:          #1e293b
Text Muted:    #64748b

Parcel Types:
- Agricultural:    #ea580c
- Gramakantam:     #ca8a04
- Building:        #dc2626
- Road:            #6b7280
- Water Body:      #2563eb
- Open Space:      #16a34a
- Compound:        #9333ea
- Government Land: #0d9488
```

---

## Data Placeholders

```html
<!-- Map Editor Header -->
<button id="back-btn">←</button>
<h1 id="village-name">{{VILLAGE_NAME}}, {{MANDAL_NAME}}</h1>
<span id="save-status">Saved ✓</span>
<span id="user-name">{{USER_NAME}}</span>

<!-- Data Source Counts -->
<span class="sam-count">12,032</span>
<span class="gt-count">105</span>

<!-- Bottom Bar -->
<span id="current-mode">{{MODE}}</span>
<span id="mode-hint">{{HINT_TEXT}}</span>
<span id="selection-count">{{COUNT}} parcels</span>
<span id="selection-area">{{AREA}} m²</span>

<!-- Stats Panel -->
<div id="total-parcels">{{COUNT}}</div>
<div id="total-area">{{AREA}} ha</div>
<div id="min-area">{{MIN}} m²</div>
<div id="avg-area">{{AVG}} m²</div>
<div id="median-area">{{MEDIAN}} m²</div>
<div id="max-area">{{MAX}} m²</div>

<!-- Map Container - I'll inject MapLibre here -->
<div id="map-container"></div>
```

---

## What's NOT Implemented (Don't Include)

- ❌ User roles/permissions
- ❌ Approval workflows
- ❌ Notifications/alerts
- ❌ Settings page
- ❌ Edit history log
- ❌ Comments/notes on parcels

---

## Integration Notes

When you send HTML designs:

1. **Map container**: Empty `<div id="map-container">` - I inject MapLibre GL
2. **Sidebar**: Fixed ~280-300px width, scrollable content area
3. **Tabs**: I'll wire up switching logic
4. **Buttons**: Give unique IDs, I'll add handlers
5. **Responsive**: Map fills remaining space

---

## Summary

**Three screens:**
1. **Login** - Simple auth form
2. **Dashboard** - Village selection with progress
3. **Map Editor** - Full editing interface (all features here)

**Core story:** AI auto-detects 12,000+ parcel boundaries. Officers verify, fix mistakes (Merge/Split), classify land types, and export. Transforms weeks of manual work into hours.

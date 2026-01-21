# BoundaryAI - UI/UX Design Specification

> **Design Rationale:** Every design decision is documented with reasoning in [`design-rationale.md`](./design-rationale.md)

## Overview

**Application:** BoundaryAI - AI-Assisted Land Parcel Editor
**Users:** Government Survey Officers (Andhra Pradesh Re-Survey Project)
**Target Audience:** Non-technical government officials (demo jury)
**Core Value:** AI auto-detects 12,000+ parcel boundaries from drone imagery. Officers verify, fix mistakes, and export. 10x faster than manual tracing.

---

## The Problem We Solve

**Without AI:** Officers manually trace every parcel boundary from drone images. Slow, tedious, error-prone.

**With BoundaryAI:** SAM (Segment Anything Model) auto-detects boundaries. Officers review and fix two common AI mistakes:

| Problem | What Happened | Officer Action |
|---------|---------------|----------------|
| **Over-segmentation** | AI saw shadow/channel as boundary, created extra parcels | Select fragments → **Merge (M)** |
| **Under-segmentation** | AI missed a faint bund, merged two parcels | Select parcel → **Split (S)** → draw dividing line |

---

## Demo Flow

```
Login → Dashboard (select village) → Map Editor (verify & edit) → Export
```

---

## Screen 1: Login

**Theme:** Light (government portal convention)

### Purpose
Simple, professional authentication with government branding. Establishes trust and authority.

### Required Elements

| Element | Description | Notes |
|---------|-------------|-------|
| **Government Logo** | AP State emblem/logo | Top-left or centered |
| **Department Logo** | Survey & Land Records logo | Adjacent to govt logo |
| **Application Title** | "BoundaryAI" with tagline "Land Parcel Editor" | Prominent, professional font |
| **Employee ID Input** | Text field with label | Required field |
| **Password Input** | Password field with show/hide toggle | Required field |
| **Sign In Button** | Primary action button | Full-width within form |
| **Language Selector** | Dropdown: English, తెలుగు (Telugu) | Top-right corner |
| **Department Footer** | "Andhra Pradesh Survey & Land Records Department" | Bottom of screen |

### User Actions

| Action | Trigger | Result |
|--------|---------|--------|
| Enter credentials | Type in fields | Enable Sign In when both filled |
| Toggle password visibility | Click eye icon | Show/hide password text |
| Change language | Select from dropdown | UI text changes to selected language |
| Submit login | Click Sign In or press Enter | Validate → Navigate to Dashboard |

### States

| State | Visual Indicator |
|-------|------------------|
| Empty fields | Sign In button disabled (grayed) |
| Valid input | Sign In button enabled (primary blue) |
| Loading | Button shows spinner, fields disabled |
| Error | Red border on field, error message below |
| Success | Navigate to Dashboard |

### Error Messages
- "Employee ID is required"
- "Password is required"
- "Invalid credentials. Please try again."
- "Network error. Please check your connection."

### Accessibility
- Tab order: Language → Employee ID → Password → Sign In
- All inputs have visible labels (not just placeholders)
- Error messages linked to inputs via aria-describedby
- Minimum touch target: 44x44px for all buttons

### Placeholders
```html
<select id="language-selector">
  <option value="en">English</option>
  <option value="te">తెలుగు</option>
</select>
<img id="govt-logo" src="{{GOVT_LOGO_URL}}" alt="Government of Andhra Pradesh" />
<img id="dept-logo" src="{{DEPT_LOGO_URL}}" alt="Survey Department" />
<input id="employee-id" placeholder="Employee ID" aria-required="true" />
<input id="password" type="password" placeholder="Password" aria-required="true" />
<button id="login-btn" type="submit">Sign In</button>
```

---

## Screen 2: Dashboard

**Theme:** Light (government portal convention)

### Purpose
Village selection screen. Shows assigned villages with progress status. Provides at-a-glance overview of workload.

### Required Elements

| Element | Description | Notes |
|---------|-------------|-------|
| **Header Bar** | Logo, app name, user menu | Fixed at top |
| **User Menu** | Officer name + dropdown (Logout) | Top-right |
| **Welcome Section** | "Welcome, [Name]" with role & district | Below header |
| **Summary Cards** | 3 cards: Assigned, Completed, Pending | Horizontal row |
| **Search Box** | Filter villages by name | Above village list |
| **Sort Dropdown** | Sort by: Name, Progress, Parcels | Next to search |
| **Village List** | Cards showing village details | Main content area |
| **Village Card** | Name, mandal, parcels, progress, action | Repeated per village |

### Summary Cards

| Card | Content | Color |
|------|---------|-------|
| **Assigned** | Total villages count | Blue |
| **Completed** | 100% verified count | Green |
| **Pending** | Not started + in-progress count | Amber |

### Village Card Content

Each card displays:
- **Village Name** (primary text, bold)
- **Mandal Name** (secondary text, muted)
- **Parcel Count** (e.g., "12,032 parcels")
- **Progress Bar** (visual percentage)
- **Progress Text** (e.g., "78% verified" or "Not started")
- **Action Button** ("Open →", "Continue →", "Start →", or "View →" for completed)

### User Actions

| Action | Trigger | Result |
|--------|---------|--------|
| Search villages | Type in search box | Filter list in real-time |
| Sort villages | Select sort option | Reorder village list |
| View summary | Glance at cards | Understand workload |
| Open village | Click village card or "Open →" | Navigate to Map Editor |
| Logout | Click user menu → Logout | Return to Login |

### States

| State | Visual Indicator |
|-------|------------------|
| Loading villages | Skeleton cards with shimmer |
| No results | "No villages match your search" message |
| Empty list | "No villages assigned" message |
| Village 100% | Green checkmark, "View →" button |
| Village 0% | Gray progress bar, "Start →" button |
| Village in-progress | Partial progress bar, "Continue →" button |

### Responsive Behavior
- **Desktop (>1200px):** 3 summary cards in row, 2-3 village cards per row
- **Tablet (768-1200px):** 3 summary cards, 2 village cards per row
- **Mobile (<768px):** Summary cards stack vertically, 1 village card per row

### Accessibility
- Tab order: Search → Sort → Summary Cards → Village Cards
- Village cards are keyboard navigable (Enter to open)
- Progress bars have aria-valuenow for screen readers
- Summary card values announced with context ("12 Assigned Villages")

### Placeholders
```html
<!-- Header -->
<span id="user-name">{{USER_DISPLAY_NAME}}</span>
<span id="user-role">Survey Officer</span>
<span id="user-district">{{DISTRICT_NAME}} District</span>

<!-- Summary Cards -->
<div class="summary-card" aria-label="Assigned Villages">
  <span class="count">{{ASSIGNED_COUNT}}</span>
  <span class="label">Assigned</span>
</div>

<!-- Village Card Template -->
<article class="village-card" data-village-id="{{VILLAGE_ID}}" tabindex="0">
  <h3 class="village-name">{{VILLAGE_NAME}}</h3>
  <p class="mandal">{{MANDAL_NAME}}</p>
  <p class="parcels">{{PARCEL_COUNT}} parcels</p>
  <div class="progress-bar" role="progressbar" aria-valuenow="{{PERCENT}}" aria-valuemin="0" aria-valuemax="100">
    <div class="progress-fill" style="width: {{PERCENT}}%"></div>
  </div>
  <span class="progress-text">{{PERCENT}}% verified</span>
  <button class="action-btn">{{ACTION_TEXT}} →</button>
</article>
```

### Integration Notes
- For demo: Only "Nibhanupudi" has real data (12,032 parcels)
- Other villages are mock data for visual completeness
- Progress percentage calculated from classified parcel count

---

## Screen 3: Map Editor (Core Interface)

**Theme:** Dark (GIS application convention - reduces eye strain with satellite imagery)

### Purpose
Full-featured parcel editing interface. This is where all real work happens. Officers verify AI boundaries, fix mistakes, classify land types, and export.

### Layout Structure

```
┌─────────────────────────────────────────────────────────────────────┐
│  HEADER: [← Back] Village Name, Mandal    [Auto-saved ✓] [User ▼]  │
├──────────────────┬──────────────────────────────────────────────────┤
│                  │                                                  │
│     SIDEBAR      │                                                  │
│     (280px)      │                 MAP CANVAS                       │
│                  │              (remaining width)                   │
│  ┌────────────┐  │                                                  │
│  │ Tab Bar    │  │     Drone imagery with parcel boundaries         │
│  ├────────────┤  │                                                  │
│  │            │  │                                                  │
│  │  Active    │  │                                                  │
│  │  Tab       │  │                                                  │
│  │  Content   │  │                                                  │
│  │            │  │                                                  │
│  │            │  │                                                  │
│  └────────────┘  │                                                  │
│                  │                                                  │
│  [Export Button] │                                                  │
│                  │                                                  │
├──────────────────┴──────────────────────────────────────────────────┤
│  BOTTOM BAR: Mode Badge │ Hint Text │ Selection Info │ Actions     │
└─────────────────────────────────────────────────────────────────────┘
```

### Header Bar Elements

| Element | Description | User Action |
|---------|-------------|-------------|
| **Back Button** | "←" icon | Returns to Dashboard |
| **Village Title** | "Nibhanupudi, Pedakurapadu" | Display only |
| **Save Status** | "Saved ✓" or "Saving..." | Auto-updates |
| **User Menu** | Officer name + dropdown | Logout option |

---

## Sidebar: Tab Navigation

Six tabs providing different functionality panels.

| Tab | Label | Purpose |
|-----|-------|---------|
| 1 | **Tools** | Editing tools and actions |
| 2 | **Layers** | Data sources and visibility controls |
| 3 | **Classify** | Land type assignment |
| 4 | **Validate** | Quality checks and accuracy |
| 5 | **ROR** | Record of Rights data |
| 6 | **Stats** | Summary statistics |

### Tab Visual States
- **Inactive:** Gray text
- **Active:** Cyan text with bottom border highlight
- **Hover:** Lighter text color

---

## Tab 1: Tools Panel

### Purpose
Primary editing tools for parcel manipulation.

### Tool Buttons (Mode Selection)

| Tool | Icon | Shortcut | Description | Cursor |
|------|------|----------|-------------|--------|
| **Select** | Arrow | V | Click parcels to select | Default arrow |
| **Draw** | Pen | N | Create new parcel polygon | Crosshair |
| **Edit Vertices** | Dots | E | Reshape selected parcel | Move cursor on vertices |
| **Split** | Scissors | S | Divide parcel with a line | Crosshair |

### Action Buttons

| Action | Icon | Shortcut | Description | Enabled When |
|--------|------|----------|-------------|--------------|
| **Undo** | ↶ | Z or Ctrl+Z | Revert last action | History has items |
| **Redo** | ↷ | Shift+Z | Restore undone action | Redo stack has items |
| **Delete** | Trash | D or Delete | Remove selected parcels | Parcel(s) selected |
| **Merge** | Union | M | Combine selected parcels | 2+ parcels selected |

### Tool States

| State | Visual Indicator |
|-------|------------------|
| Active tool | Button highlighted with cyan background |
| Disabled action | Grayed out, not clickable |
| Hover | Lighter background |

### User Actions in Tool Panel

| Action | Trigger | Result |
|--------|---------|--------|
| Switch tool | Click tool button or press shortcut | Mode changes, cursor updates, hint updates |
| Undo | Click or Ctrl+Z | Last action reverted, "Undone" toast shown |
| Redo | Click or Shift+Z | Undone action restored |
| Delete | Click or D | Selected parcels removed (with confirmation if >5) |
| Merge | Click or M | Selected parcels combined into one |

### Tool Usage Instructions (shown in Bottom Bar)

| Tool | Hint Text |
|------|-----------|
| Select | "Click to select. Shift+click to add. Drag for box select." |
| Draw | "Click to add points. Double-click to finish. Escape to cancel." |
| Edit | "Drag vertices to reshape. Click off to finish." |
| Split | "Draw a line across the parcel. Double-click to split." |

---

## Tab 2: Layers Panel

### Purpose
Control data sources and layer visibility.

### Data Source Section
**Label:** "Data Source"
**Type:** Radio button group (mutually exclusive)

| Option | Description | Parcel Count |
|--------|-------------|--------------|
| **SAM AI Output** | AI-detected boundaries | 12,032 |
| **Ground Truth** | Manually digitized reference | 105 |
| **Working Layer** | Your edits (auto-saved) | Variable |

### Layer Visibility Section
**Label:** "Layer Visibility"
**Type:** Checkbox toggles

| Toggle | Default | Description |
|--------|---------|-------------|
| **Show GT Overlay** | OFF | Dashed red lines showing ground truth boundaries |
| **Conflict Highlighting** | OFF | Color parcels by area mismatch (green/yellow/red) |
| **ORI Tiles** | ON | Drone orthophoto imagery |
| **Google Satellite** | ON | Satellite basemap |
| **Show Polygons** | ON | Parcel boundary lines |

### Min Area Filter Section
**Label:** "Min Area Filter"

| Element | Description |
|---------|-------------|
| **Slider** | Range: 0 to 1000 m² |
| **Value Display** | Current threshold (e.g., "100 m²") |
| **Preset Buttons** | "All", "10m²", "50m²", "100m²", "500m²" |
| **Hiding Count** | "Hiding 2,373 parcels" (when filter active) |
| **Area Stats** | Smallest: X m² | Median: Y m² | Largest: Z m² |

### User Actions in Layers Panel

| Action | Trigger | Result |
|--------|---------|--------|
| Change data source | Click radio button | Map reloads with selected data |
| Toggle layer | Click checkbox | Layer shows/hides immediately |
| Adjust filter | Drag slider or click preset | Small parcels hide/show |
| View area stats | Glance at stats | Understand parcel size distribution |

---

## Tab 3: Classify Panel

### Purpose
Assign land type classification to selected parcels.

### Parcel Type Buttons

| Type | Shortcut | Color | Border |
|------|----------|-------|--------|
| Agricultural | 1 | Orange fill | #ea580c |
| Gramakantam | 2 | Yellow fill | #ca8a04 |
| Building | 3 | Red fill | #dc2626 |
| Road | 4 | Gray fill | #6b7280 |
| Water Body | 5 | Blue fill | #2563eb |
| Open Space | 6 | Green fill | #16a34a |
| Compound | 7 | Purple fill | #9333ea |
| Government Land | 8 | Teal fill | #0d9488 |

### Current Selection Display

| State | Display |
|-------|---------|
| Nothing selected | "Select a parcel to classify" |
| Single parcel | "Current: [Type Name]" with color indicator |
| Multiple same type | "Current: [Type Name] (X parcels)" |
| Multiple different | "Mixed types (X parcels)" |

### User Actions in Classify Panel

| Action | Trigger | Result |
|--------|---------|--------|
| Classify parcel | Click type button or press 1-8 | Selected parcel(s) change color, type saved |
| View current type | Select parcel | Current type highlighted in panel |

---

## Tab 4: Validate Panel

### Purpose
Quality assurance tools - area comparison, topology checks, accuracy metrics.

### Section 1: Area Comparison
**Shown when:** A parcel is selected

| Field | Description |
|-------|-------------|
| **SAM Area** | Calculated area from AI boundary (m²) |
| **ROR Area** | Area from Record of Rights (m²) |
| **Difference** | Absolute difference and percentage |
| **Match Quality** | Badge: Excellent (<5%), Fair (5-15%), Poor (>15%) |

**Colors:**
- Excellent: Green badge
- Fair: Yellow badge
- Poor: Red badge

**No selection state:** "Select a parcel to compare areas"

### Section 2: Topology Validation
**Purpose:** Find overlaps and gaps

| Element | Description |
|---------|-------------|
| **Validate Button** | "Run Topology Check" |
| **Results Summary** | "X overlaps, Y gaps found" or "No errors found ✓" |
| **Error List** | Scrollable list of issues |
| **Error Item** | Type + "Zoom to" link |
| **Fix All Button** | Auto-fix simple errors (shown if fixable) |

### Section 3: Accuracy Metrics
**Purpose:** Compare against ground truth

| Metric | Description |
|--------|-------------|
| **IoU Score** | Overall Intersection over Union (target: 85%) |
| **Matched Parcels** | Count matching GT within threshold |
| **Unmatched Parcels** | Count without GT match |
| **Needs Review List** | Parcels below accuracy threshold |

### User Actions in Validate Panel

| Action | Trigger | Result |
|--------|---------|--------|
| View area comparison | Select a parcel | Comparison data displays |
| Run topology check | Click Validate | Scan runs, results display |
| Zoom to error | Click "Zoom to" | Map centers on issue location |
| Fix errors | Click Fix All | Auto-fixable issues resolved |

---

## Tab 5: ROR Panel

### Purpose
View and search Record of Rights data.

### Elements

| Element | Description |
|---------|-------------|
| **Search Box** | Filter by LP number (e.g., "45") |
| **Record Count** | "Showing X of Y records" |
| **Record List** | Scrollable list of ROR entries |
| **Record Item** | LP Number + Area in m² |
| **Total Area** | Sum of all displayed record areas |

### Record Item Display
```
LP1    ████████████  245.6 m²
LP2    ████████      189.2 m²
LP3    ██████████    215.8 m²
```

### User Actions in ROR Panel

| Action | Trigger | Result |
|--------|---------|--------|
| Search records | Type in search box | Filter list instantly |
| Select record | Click record item | Highlight corresponding parcel (if matched) |
| Clear search | Clear search box | Show all records |

---

## Tab 6: Stats Panel

### Purpose
Summary statistics for current dataset.

### Section 1: Overview Cards

| Card | Value | Label |
|------|-------|-------|
| **Total Parcels** | 12,032 | "Total Parcels" |
| **Total Area** | 78.62 ha | "Total Area" |

### Section 2: Area Distribution

| Stat | Description |
|------|-------------|
| Min | Smallest parcel area |
| Avg | Average parcel area |
| Median | Middle value |
| Max | Largest parcel area |

### Section 3: By Parcel Type
**Type:** Horizontal bar chart

For each parcel type with count > 0:
- Type name with color indicator
- Count and percentage
- Horizontal bar (width = % of max count)
- Area subtotal

---

## Bottom Bar

### Purpose
Persistent status bar showing current mode, contextual hints, and selection info.

### Layout
```
┌──────────────────────────────────────────────────────────────────────┐
│ [MODE]  │  Hint text...                    │ Selection │ [Actions]  │
└──────────────────────────────────────────────────────────────────────┘
```

### Mode Badge
Colored pill showing current tool:
- SELECT (blue)
- DRAW (green)
- EDIT (purple)
- SPLIT (orange)

### Hint Text
Contextual instructions based on current mode and state:

| Mode | State | Hint |
|------|-------|------|
| SELECT | No selection | "Click to select, Shift+click for multi, drag for box" |
| SELECT | Has selection | "Press D to delete, M to merge, E to edit vertices" |
| DRAW | Drawing | "Click to add points, double-click to finish" |
| EDIT | Editing | "Drag vertices to reshape, click outside to finish" |
| SPLIT | Ready | "Click to start split line, double-click to cut" |

### Selection Info
| State | Display |
|-------|---------|
| Nothing selected | "Selected: 0" |
| Parcels selected | "Selected: X parcels • Y.Z m²" |

### Action Buttons
Quick action buttons (shown contextually):
- **Delete** (D) - when selection exists
- **Merge** (M) - when 2+ selected
- **Edit** (E) - when 1 selected
- **Split** (S) - when 1 selected

---

## Map Canvas Interactions

### Mouse Interactions

| Action | How | Result |
|--------|-----|--------|
| Pan | Drag empty area | Move map view |
| Zoom | Scroll wheel | Zoom in/out at cursor |
| Select parcel | Click on parcel | Parcel selected (highlighted) |
| Add to selection | Shift + Click | Add parcel to selection |
| Toggle selection | Ctrl/Cmd + Click | Toggle parcel in/out of selection |
| Box select | Drag from empty area | Select all parcels in box |
| Clear selection | Click empty area | Deselect all |
| Clear selection | Press Escape | Deselect all, cancel current operation |

### Right-Click Context Menu

**On empty space:**
| Option | Action |
|--------|--------|
| Draw New Parcel | Switch to Draw mode |
| Select All | Select all visible parcels |
| Zoom to Extent | Fit all parcels in view |

**On unselected parcel:**
| Option | Action |
|--------|--------|
| Select | Select this parcel |
| Add to Selection | Add to current selection |
| Zoom to Parcel | Center and zoom to parcel |

**On selected parcel:**
| Option | Action |
|--------|--------|
| Edit Vertices | Enter Edit mode |
| Split | Enter Split mode |
| Delete | Delete selected parcel(s) |
| Zoom to Selection | Fit selection in view |

**On multiple selection:**
| Option | Action |
|--------|--------|
| Merge Parcels | Combine into one |
| Delete All | Remove all selected |
| Zoom to Selection | Fit selection in view |

### Visual Feedback

| State | Visual |
|-------|--------|
| Parcel hover | Lighter fill, cursor pointer |
| Parcel selected | Cyan border (3px), lighter fill |
| Parcel multi-selected | Cyan border, all selected highlighted |
| Vertex (edit mode) | White circle handles on boundary |
| Vertex hover | Larger handle, move cursor |
| Drawing in progress | Dashed line following cursor |
| Split line | Red dashed line |

### Keyboard Shortcuts (Global)

| Key | Action |
|-----|--------|
| V | Select mode |
| N | Draw mode |
| E | Edit vertices mode |
| S | Split mode |
| D or Delete | Delete selected |
| M | Merge selected |
| Z or Ctrl+Z | Undo |
| Shift+Z | Redo |
| 1-8 | Classify selected (type 1-8) |
| Escape | Cancel/Clear selection |
| Ctrl/Cmd+A | Select all visible |

---

## Export Dialog

### Purpose
Export edited parcels as Shapefile for use in other GIS systems.

### Elements

| Element | Description |
|---------|-------------|
| **Title** | "Export Shapefile" |
| **Close Button** | X icon top-right |
| **Summary Section** | Key export details |
| **Validation Status** | Topology check result |
| **Warning (if any)** | Issues to resolve |
| **Cancel Button** | Secondary, closes dialog |
| **Export Button** | Primary, triggers download |

### Summary Section Content

| Field | Value |
|-------|-------|
| Total Polygons | 12,032 |
| Output CRS | EPSG:32644 (UTM Zone 44N) |
| Format | .shp, .shx, .dbf, .prj |

### Validation Status

| State | Display |
|-------|---------|
| No errors | Green checkmark "No topology errors" |
| Has errors | Yellow warning "3 overlaps found - export anyway?" |

### User Actions

| Action | Trigger | Result |
|--------|---------|--------|
| Open dialog | Click "Export Shapefile" button | Dialog opens |
| Cancel | Click Cancel or X | Dialog closes |
| Export | Click Export | Download ZIP file |

### Export Output
- Downloads: `nibhanupudi_parcels.zip`
- Contains: `.shp`, `.shx`, `.dbf`, `.prj` files

---

## Restore Session Dialog

### Purpose
On load, offer to restore previous unsaved work.

### Elements

| Element | Description |
|---------|-------------|
| **Title** | "Restore Previous Session?" |
| **Message** | "You have unsaved edits from [timestamp]" |
| **Edit Count** | "X parcels modified" |
| **Restore Button** | Primary action |
| **Discard Button** | Secondary action |

### User Actions

| Action | Result |
|--------|--------|
| Restore | Load previous working state |
| Discard | Start fresh from SAM data |

---

## Color Palette

> **Note:** See `design-rationale.md` for detailed reasoning behind each color choice.

### Login & Dashboard (Light Theme)
Government portal convention - light backgrounds convey trust and transparency.

| Name | Hex | Usage |
|------|-----|-------|
| Background | #ffffff | Page background |
| Surface | #f8fafc | Cards, form containers |
| Border | #e2e8f0 | Input borders, dividers |
| Text Primary | #1e293b | Main text (dark on light) |
| Text Muted | #64748b | Secondary text, labels |
| Primary Blue | #1e40af | Buttons, links |
| Primary Hover | #1d4ed8 | Button hover state |

### Map Editor (Dark Theme)
GIS convention - dark interface reduces eye strain when viewing satellite imagery.

| Name | Hex | Usage |
|------|-----|-------|
| Background | #111827 | Sidebar background |
| Surface | #1f2937 | Panels, cards |
| Border | #374151 | Dividers, borders |
| Text Primary | #f3f4f6 | Main text (light on dark) |
| Text Muted | #9ca3af | Secondary text |
| Accent | #06b6d4 | Selection highlights, active states |

### Semantic Colors (Both Themes)

| Name | Hex | Usage |
|------|-----|-------|
| Success | #059669 | Confirmations, good match, completed |
| Warning | #d97706 | Fair match, attention needed |
| Error | #dc2626 | Poor match, errors, required fields |

### Parcel Type Colors

| Type | Fill | Border |
|------|------|--------|
| Agricultural | rgba(234,88,12,0.3) | #ea580c |
| Gramakantam | rgba(202,138,4,0.3) | #ca8a04 |
| Building | rgba(220,38,38,0.3) | #dc2626 |
| Road | rgba(107,114,128,0.3) | #6b7280 |
| Water Body | rgba(37,99,235,0.3) | #2563eb |
| Open Space | rgba(22,163,74,0.3) | #16a34a |
| Compound | rgba(147,51,234,0.3) | #9333ea |
| Government | rgba(13,148,136,0.3) | #0d9488 |

### Conflict Highlighting Colors

| Quality | Color | Threshold |
|---------|-------|-----------|
| Excellent | Green (#16a34a) | <5% deviation |
| Fair | Yellow (#eab308) | 5-15% deviation |
| Poor | Red (#dc2626) | >15% deviation |

---

## Typography

### Login & Dashboard (Light Theme)

| Element | Size | Weight | Color |
|---------|------|--------|-------|
| Page Title | 24px | 700 | #1e293b |
| Section Header | 18px | 600 | #1e293b |
| Card Title | 16px | 600 | #1e293b |
| Body Text | 14px | 400 | #1e293b |
| Muted Text | 14px | 400 | #64748b |
| Button Text | 14px | 500 | #ffffff |

### Map Editor (Dark Theme)

| Element | Size | Weight | Color |
|---------|------|--------|-------|
| App Title | 18px | 600 | #f3f4f6 |
| Tab Label | 14px | 500 | #9ca3af / #06b6d4 (active) |
| Section Header | 12px | 600 | #9ca3af (uppercase) |
| Body Text | 14px | 400 | #e5e7eb |
| Stat Value | 24px | 700 | #06b6d4 |
| Stat Label | 12px | 400 | #9ca3af |
| Button Text | 14px | 500 | #ffffff |

### Font Stack
```css
/* Latin text */
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;

/* Telugu text */
font-family: 'Noto Sans Telugu', sans-serif;
```

---

## Accessibility Requirements

### Color Contrast
- Text: Minimum 4.5:1 contrast ratio
- Large text (18px+): Minimum 3:1
- UI components: Minimum 3:1

### Keyboard Navigation
- All interactive elements focusable via Tab
- Logical tab order (left→right, top→bottom)
- Visible focus indicators (cyan outline)
- Escape to close dialogs/cancel operations

### Screen Reader Support
- All buttons have accessible names
- Form inputs have labels
- Images have alt text
- Progress bars have aria-valuenow
- Dialogs have aria-labelledby

### Touch Targets
- Minimum 44x44px for all buttons
- Adequate spacing between targets

---

## Loading & Error States

### Loading States

| Context | Display |
|---------|---------|
| Initial map load | "Loading parcels..." with spinner |
| Data source switch | Map dims, spinner overlay |
| Export processing | Button shows spinner, disabled |
| Topology validation | "Checking..." in panel |

### Error States

| Error | Display | Recovery |
|-------|---------|----------|
| Data load failed | "Failed to load parcels" + Retry button | Retry |
| Export failed | Toast: "Export failed" | Try again |
| Network error | Toast: "Connection lost" | Auto-retry |

---

## Responsive Behavior

### Sidebar
- **Desktop:** 280px fixed width
- **Tablet:** Collapsible, icon toggle
- **Mobile:** Full-screen overlay when open

### Map
- Always fills remaining viewport width
- Minimum usable width: 300px

### Bottom Bar
- **Desktop:** Full info display
- **Mobile:** Condensed (mode + selection count only)

---

## What's NOT Implemented

These features are out of scope for the demo:

- ❌ User roles/permissions
- ❌ Multi-user collaboration
- ❌ Approval workflows
- ❌ Notification system
- ❌ Settings/preferences page
- ❌ Edit history log
- ❌ Comments on parcels
- ❌ Parcel search by ID
- ❌ Measurement tools
- ❌ Print/PDF export

---

## Integration Notes

When converting HTML designs to React:

1. **Map Container:** Empty `<div id="map-container">` - MapLibre GL injected here
2. **Sidebar Width:** Fixed 280px, content scrolls independently
3. **Tab Switching:** I'll wire up state management
4. **All Buttons:** Give unique IDs, I'll add click handlers
5. **Shortcuts:** I'll implement keyboard listener
6. **Data Binding:** Placeholders like `{{VILLAGE_NAME}}` will be replaced

---

## Summary

**Three screens, one workflow:**

1. **Login** → Authenticate with government credentials
2. **Dashboard** → Select village to work on
3. **Map Editor** → Verify AI boundaries, fix errors, classify, export

**Core demo story:** AI detected 12,000+ parcel boundaries automatically. Officer reviews, merges over-segmented areas, splits under-segmented areas, classifies land types, and exports clean shapefile. Hours instead of weeks.

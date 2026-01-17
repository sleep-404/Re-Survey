# BoundaryAI - UI/UX Design Document

**Version:** 1.0
**Date:** 2026-01-17

---

## 1. Design Philosophy

### 1.1 Core Principles

1. **Minimal Clicks** - Officers need to correct hundreds of polygons. Every action should be fast.
2. **Always See Context** - ORI imagery must always be visible as reference.
3. **Clear Feedback** - User should always know what's selected, what changed, what's wrong.
4. **Undo Everything** - Any edit can be reversed. No fear of making mistakes.

### 1.2 Key Insight from Transcript

> "there should also be any mechanism to **delete any lines or polygons in a fast manner**"

Speed is critical. The UI must optimize for rapid corrections.

---

## 2. Application States

The application has **one main screen** with different **states**:

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   STATE 1: EMPTY          No ORI loaded                         │
│              ↓                                                  │
│   STATE 2: LOADING        Processing ORI / Running AI           │
│              ↓                                                  │
│   STATE 3: EDITING        Main workspace (most time here)       │
│              ↓                                                  │
│   STATE 4: VALIDATING     Checking topology                     │
│              ↓                                                  │
│   STATE 5: EXPORTING      Generating shapefiles                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Screen Layouts

### 3.1 STATE 1: Empty State

**Purpose:** Prompt user to load ORI file

```
┌─────────────────────────────────────────────────────────────────────────┐
│  BoundaryAI                                                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│                                                                         │
│                                                                         │
│                    ┌─────────────────────────────┐                      │
│                    │                             │                      │
│                    │      📁 Load ORI File       │                      │
│                    │                             │                      │
│                    │   Drag & drop GeoTIFF or    │                      │
│                    │   click to browse           │                      │
│                    │                             │                      │
│                    └─────────────────────────────┘                      │
│                                                                         │
│                    Supported: .tif, .tiff (GeoTIFF)                     │
│                                                                         │
│                                                                         │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**User Actions:**
| Action | Method |
|--------|--------|
| Load file | Click button OR drag-drop |

---

### 3.2 STATE 2: Loading State

**Purpose:** Show progress while AI processes imagery

```
┌─────────────────────────────────────────────────────────────────────────┐
│  BoundaryAI                                                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│                                                                         │
│                                                                         │
│                    ┌─────────────────────────────┐                      │
│                    │                             │                      │
│                    │   ████████████░░░░░  67%    │                      │
│                    │                             │                      │
│                    │   Extracting parcels...     │                      │
│                    │                             │                      │
│                    │   Found 847 polygons        │                      │
│                    │                             │                      │
│                    └─────────────────────────────┘                      │
│                                                                         │
│                    [Cancel]                                             │
│                                                                         │
│                                                                         │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**User Actions:**
| Action | Method |
|--------|--------|
| Cancel processing | Click Cancel button |

---

### 3.3 STATE 3: Editing State (Main Workspace)

**Purpose:** Review and correct AI-extracted polygons

This is where officers spend 95% of their time.

```
┌─────────────────────────────────────────────────────────────────────────┐
│  BoundaryAI - nibhanupudi_ori.tif                    [Export Shapefiles]│
├─────────┬───────────────────────────────────────────────────────────────┤
│         │                                                               │
│ LAYERS  │                                                               │
│ ☑ ORI   │                      MAP CANVAS                               │
│ ☑ Polys │                                                               │
│         │   ┌───────────────────────────────────────────────────────┐   │
│─────────│   │                                                       │   │
│         │   │                                                       │   │
│ TOOLS   │   │     [ORI imagery as background]                       │   │
│         │   │                                                       │   │
│ ● Select│   │     [AI polygons overlaid with yellow borders]        │   │
│ ○ Draw  │   │                                                       │   │
│ ○ Edit  │   │     [Selected polygon highlighted in cyan]            │   │
│         │   │                                                       │   │
│─────────│   │                                                       │   │
│         │   │                                                       │   │
│ STATS   │   └───────────────────────────────────────────────────────┘   │
│         │                                                               │
│ Total:  │   ← ↑ ↓ →  [Zoom: 100%]  [-] [+]  [Fit]                       │
│ 847     │                                                               │
│         ├───────────────────────────────────────────────────────────────┤
│─────────│  SELECTION: 1 polygon                                         │
│         │  Area: 0.52 ac (2,104 sqm)  │  Vertices: 12                   │
│VALIDATE │                                                               │
│[Check]  │  [Delete]  [Merge]  [Split]  [Edit Vertices]     [Undo][Redo] │
│         │                                                               │
└─────────┴───────────────────────────────────────────────────────────────┘
```

#### 3.3.1 Layout Components

| Component | Position | Purpose |
|-----------|----------|---------|
| Header | Top | File name, Export button |
| Layers Panel | Left sidebar, top | Toggle ORI and polygon visibility |
| Tools Panel | Left sidebar, middle | Select active tool |
| Stats Panel | Left sidebar | Polygon count |
| Validate Panel | Left sidebar, bottom | Topology check button |
| Map Canvas | Center | Interactive map view |
| Navigation Bar | Below canvas | Zoom controls, pan |
| Selection Panel | Bottom | Selected polygon info + action buttons |

#### 3.3.2 User Actions in Editing State

**Map Interactions:**
| Action | Method |
|--------|--------|
| Pan map | Click + drag on empty area |
| Zoom in | Scroll up OR click [+] |
| Zoom out | Scroll down OR click [-] |
| Fit to extent | Click [Fit] |
| Select polygon | Click on polygon |
| Multi-select | Shift + click |
| Deselect | Click empty area OR press Escape |

**Tool: Select (default)**
| Action | Method |
|--------|--------|
| Select single | Click polygon |
| Add to selection | Shift + click |
| Box select | Click + drag rectangle |

**Tool: Draw**
| Action | Method |
|--------|--------|
| Start polygon | Click first point |
| Add vertex | Click next point |
| Complete polygon | Double-click OR click first point |
| Cancel drawing | Press Escape |

**Tool: Edit Vertices**
| Action | Method |
|--------|--------|
| Enter edit mode | Select polygon, click "Edit Vertices" |
| Move vertex | Drag vertex |
| Add vertex | Click on edge |
| Delete vertex | Right-click vertex |
| Exit edit mode | Press Escape OR click outside |

**Polygon Actions (when selected):**
| Action | Method | Shortcut |
|--------|--------|----------|
| Delete | Click [Delete] | D or Delete key |
| Merge | Select 2+, click [Merge] | M |
| Split | Click [Split], draw line | S |
| Edit Vertices | Click [Edit Vertices] | E |
| Undo | Click [Undo] | Ctrl+Z |
| Redo | Click [Redo] | Ctrl+Y |

---

### 3.4 STATE 4: Validating State

**Purpose:** Show topology errors that need fixing

```
┌─────────────────────────────────────────────────────────────────────────┐
│  BoundaryAI - nibhanupudi_ori.tif                    [Export Shapefiles]│
├─────────┬───────────────────────────────────────────────────────────────┤
│         │                                                               │
│ LAYERS  │                      MAP CANVAS                               │
│ ☑ ORI   │                                                               │
│ ☑ Polys │   ┌───────────────────────────────────────────────────────┐   │
│ ☑ Errors│   │                                                       │   │
│         │   │     [Overlaps shown in RED]                           │   │
│─────────│   │     [Gaps shown in BLUE]                              │   │
│         │   │                                                       │   │
│ TOOLS   │   │                                                       │   │
│         │   │                                                       │   │
│ ● Select│   │                                                       │   │
│ ○ Draw  │   │                                                       │   │
│ ○ Edit  │   │                                                       │   │
│         │   └───────────────────────────────────────────────────────┘   │
│─────────│                                                               │
│         ├───────────────────────────────────────────────────────────────┤
│VALIDATE │  TOPOLOGY ERRORS: 3 found                                     │
│         │                                                               │
│ ⚠ 2 over│  ┌─────────────────────────────────────────────────────────┐ │
│ ⚠ 1 gap │  │ 1. Overlap between 2 polygons        [View] [Auto-fix]  │ │
│         │  │ 2. Overlap between 2 polygons        [View] [Auto-fix]  │ │
│[Recheck]│  │ 3. Gap (0.02 sqm)                    [View] [Auto-fix]  │ │
│         │  └─────────────────────────────────────────────────────────┘ │
│         │                                           [Fix All]  [Close] │
└─────────┴───────────────────────────────────────────────────────────────┘
```

**User Actions:**
| Action | Method |
|--------|--------|
| View error location | Click [View] - map pans to error |
| Auto-fix single error | Click [Auto-fix] |
| Fix all errors | Click [Fix All] |
| Manually fix | Close panel, use edit tools |
| Re-validate | Click [Recheck] |
| Close validation | Click [Close] |

---

### 3.5 STATE 5: Export Dialog

**Purpose:** Export shapefiles

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│   ┌───────────────────────────────────────────────────────────────┐     │
│   │                                                               │     │
│   │   EXPORT SHAPEFILES                                     [X]   │     │
│   │                                                               │     │
│   │   Output folder:                                              │     │
│   │   ┌─────────────────────────────────────┐ [Browse]            │     │
│   │   │ /Users/surveyor/exports/nibhanupudi │                     │     │
│   │   └─────────────────────────────────────┘                     │     │
│   │                                                               │     │
│   │   File name: nibhanupudi_parcels                              │     │
│   │                                                               │     │
│   │   Summary:                                                    │     │
│   │   • 847 polygons                                              │     │
│   │   • 0 topology errors                                         │     │
│   │                                                               │     │
│   │   ⚠ Warning: 2 topology errors remain                         │     │
│   │     [Fix errors first]  [Export anyway]                       │     │
│   │                                                               │     │
│   │                              [Cancel]  [Export]               │     │
│   │                                                               │     │
│   └───────────────────────────────────────────────────────────────┘     │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**User Actions:**
| Action | Method |
|--------|--------|
| Choose folder | Click [Browse] |
| Change filename | Edit text field |
| Export | Click [Export] |
| Cancel | Click [Cancel] or [X] |
| Fix errors first | Click [Fix errors first] (returns to validation) |

---

## 4. Complete User Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           USER FLOW                                      │
└─────────────────────────────────────────────────────────────────────────┘

     ┌──────────┐
     │  START   │
     └────┬─────┘
          │
          ▼
     ┌──────────┐
     │  Load    │◄─────────────────────────────────────┐
     │  ORI     │                                      │
     └────┬─────┘                                      │
          │                                            │
          ▼                                            │
     ┌──────────┐                                      │
     │   AI     │                                      │
     │ Extract  │                                      │
     └────┬─────┘                                      │
          │                                            │
          ▼                                            │
     ┌──────────┐      ┌──────────┐                    │
     │  Review  │─────►│  Delete  │────┐               │
     │  Output  │      │ Polygon  │    │               │
     └────┬─────┘      └──────────┘    │               │
          │                            │               │
          │            ┌──────────┐    │               │
          ├───────────►│  Merge   │────┤               │
          │            │ Polygons │    │               │
          │            └──────────┘    │               │
          │                            │               │
          │            ┌──────────┐    │               │
          ├───────────►│  Split   │────┤               │
          │            │ Polygon  │    │               │
          │            └──────────┘    │               │
          │                            │               │
          │            ┌──────────┐    │               │
          ├───────────►│  Draw    │────┤               │
          │            │   New    │    │               │
          │            └──────────┘    │               │
          │                            │               │
          │            ┌──────────┐    │               │
          └───────────►│  Edit    │────┘               │
                       │ Vertices │                    │
                       └──────────┘                    │
                            │                         │
                            ▼                         │
                       ┌──────────┐                    │
                       │ Continue │ Yes               │
                       │ Editing? │─────────────────►─┘
                       └────┬─────┘
                            │ No
                            ▼
                       ┌──────────┐
                       │ Validate │◄────────┐
                       │ Topology │         │
                       └────┬─────┘         │
                            │               │
                            ▼               │
                       ┌──────────┐         │
                       │ Errors?  │ Yes     │
                       │          │─────────┘
                       └────┬─────┘   Fix
                            │ No
                            ▼
                       ┌──────────┐
                       │  Export  │
                       │Shapefiles│
                       └────┬─────┘
                            │
                            ▼
                       ┌──────────┐
                       │   END    │
                       └──────────┘
```

---

## 5. Interaction Details

### 5.1 Polygon Selection Behavior

**Visual Feedback:**
| State | Appearance |
|-------|------------|
| Default | Yellow border, transparent fill |
| Hover | Yellow border, light yellow fill |
| Selected | Cyan border (thicker), light cyan fill |
| Multi-selected | Cyan border, dashed |

**Selection Info Display:**
- Single selection: Show area, perimeter, vertex count
- Multi-selection: Show count, combined area

### 5.2 Edit Vertices Mode

When editing vertices:

```
     ○────────○
    /          \
   /            \
  ○              ○───────○
  │                      │
  │    [Polygon fill]    │
  │                      │
  ○──────────────────────○

  ○ = Draggable vertex (larger circle)
  ─ = Edge (click to add vertex)
```

| Vertex State | Appearance |
|--------------|------------|
| Normal | Small white circle, dark border |
| Hover | Larger circle, highlight color |
| Dragging | Dashed lines showing connections |

### 5.3 Split Tool Behavior

1. User clicks [Split]
2. Cursor changes to crosshair
3. User clicks to start split line
4. User clicks to end split line (or more points for curved split)
5. Double-click to complete
6. Polygon splits into two at the line

```
Before:                    After:
┌────────────────┐         ┌────────┬───────┐
│                │         │        │       │
│   Polygon A    │   →     │  A.1   │  A.2  │
│                │         │        │       │
└────────────────┘         └────────┴───────┘
```

### 5.4 Merge Tool Behavior

1. User selects 2+ adjacent polygons (Shift+click)
2. User clicks [Merge]
3. Polygons combine, shared boundary removed

```
Before:                    After:
┌────────┬───────┐         ┌────────────────┐
│        │       │         │                │
│  A.1   │  A.2  │   →     │   Merged A     │
│        │       │         │                │
└────────┴───────┘         └────────────────┘
```

### 5.5 Keyboard Shortcuts

| Key | Action |
|-----|--------|
| D / Delete | Delete selected polygon(s) |
| M | Merge selected polygons |
| S | Activate Split tool |
| E | Edit vertices of selected polygon |
| N | Activate Draw (New polygon) tool |
| V | Activate Select tool |
| Escape | Cancel current action / Deselect |
| Ctrl+Z | Undo |
| Ctrl+Y | Redo |
| Ctrl+A | Select all polygons |
| + / = | Zoom in |
| - | Zoom out |
| F | Fit map to extent |
| Space + drag | Pan map |

---

## 6. Responsive Considerations

### 6.1 Minimum Screen Size

- Minimum: 1280 x 720 px
- Recommended: 1920 x 1080 px

### 6.2 Panel Collapsing

On smaller screens:
- Left sidebar can collapse to icons only
- Bottom panel can minimize to single line

---

## 7. Color Scheme

| Element | Color | Hex |
|---------|-------|-----|
| Polygon border (default) | Yellow | #F59E0B |
| Polygon fill (default) | Transparent | - |
| Polygon border (selected) | Cyan | #06B6D4 |
| Polygon fill (selected) | Light cyan | #CFFAFE (20% opacity) |
| Overlap error | Red | #EF4444 |
| Gap error | Blue | #3B82F6 |
| Vertex point | White with dark border | #FFFFFF / #374151 |
| Background | Light gray | #F3F4F6 |
| Sidebar | White | #FFFFFF |
| Primary button | Blue | #2563EB |
| Danger button | Red | #DC2626 |

---

## 8. Information Hierarchy

### What the user needs to see (priority order):

1. **ORI Imagery** - Always visible as reference
2. **Polygons** - Overlaid on ORI
3. **Selected polygon info** - Area, vertices
4. **Available actions** - Based on selection
5. **Total polygon count** - Progress indicator
6. **Topology status** - Errors or clean

---

## 9. Error States

### 9.1 File Load Error

```
┌─────────────────────────────────┐
│ ❌ Could not load file          │
│                                 │
│ The file may be corrupted or   │
│ not a valid GeoTIFF.           │
│                                 │
│ [Try Another File]             │
└─────────────────────────────────┘
```

### 9.2 Processing Error

```
┌─────────────────────────────────┐
│ ❌ AI extraction failed         │
│                                 │
│ Error: Out of memory            │
│                                 │
│ Try a smaller image area.       │
│                                 │
│ [Retry]  [Load Different File] │
└─────────────────────────────────┘
```

### 9.3 Export Error

```
┌─────────────────────────────────┐
│ ❌ Export failed                │
│                                 │
│ Cannot write to selected       │
│ folder. Check permissions.      │
│                                 │
│ [Choose Different Folder]      │
└─────────────────────────────────┘
```

---

## 10. Summary

| Aspect | Count/Detail |
|--------|--------------|
| Application States | 5 (Empty, Loading, Editing, Validating, Exporting) |
| Main Screens | 1 (with state changes) |
| Tools | 3 (Select, Draw, Edit Vertices) |
| Polygon Actions | 5 (Delete, Merge, Split, Edit, Undo/Redo) |
| Keyboard Shortcuts | 15+ |
| Layer Toggles | 2 (ORI, Polygons) |

**Core Workflow:**
```
Load ORI → AI Extract → Review/Edit → Validate → Export
```

All editing happens in a single workspace. No page navigation required.

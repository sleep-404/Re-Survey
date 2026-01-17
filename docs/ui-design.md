# BoundaryAI - UI/UX Design Document

**Version:** 1.1
**Date:** 2026-01-17

---

## 1. Design Principles

1. **Speed** - Delete/merge/split in minimal clicks (per transcript: "fast manner")
2. **Context** - ORI always visible as reference
3. **Confidence** - Undo everything, auto-save, no fear of mistakes
4. **Clarity** - Always know what's selected, what tool is active

---

## 2. Single Screen, Multiple Modes

One workspace. No page navigation. The interface changes based on **mode**:

| Mode | When Active | Bottom Panel Shows |
|------|-------------|-------------------|
| **Default** | Nothing selected | Instructions: "Click polygon to select" |
| **Selection** | 1+ polygons selected | Selection info + action buttons |
| **Drawing** | Draw tool active | "Click to place vertices. Double-click to finish." |
| **Editing** | Editing vertices | "Drag vertices. Click edge to add. Right-click to delete." |
| **Validation** | After clicking Validate | Error list with fix options |

---

## 3. Screen Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│  BoundaryAI                                              [Export]       │
├────────────┬────────────────────────────────────────────────────────────┤
│            │                                                            │
│  LAYERS    │                                                            │
│  ☑ Imagery │                                                            │
│  ☑ Polygons│                        MAP CANVAS                          │
│            │                                                            │
│────────────│         ┌────────────────────────────────────────┐         │
│            │         │                                        │         │
│  TOOLS     │         │   • ORI imagery as background          │         │
│  ┌──────┐  │         │   • Polygons overlaid                  │         │
│  │Select│  │         │   • Click to select                    │         │
│  └──────┘  │         │   • Scroll to zoom                     │         │
│  ┌──────┐  │         │   • Drag to pan                        │         │
│  │ Draw │  │         │                                        │         │
│  └──────┘  │         └────────────────────────────────────────┘         │
│            │                                                            │
│────────────│    [−]  [+]  [Fit]                    Polygons: 847        │
│            │                                                            │
│  TOPOLOGY  ├────────────────────────────────────────────────────────────┤
│  [Validate]│                                                            │
│  ✓ Clean   │   Click a polygon to select it                             │
│            │                                                            │
└────────────┴────────────────────────────────────────────────────────────┘
```

---

## 4. Modes in Detail

### 4.1 Default Mode (Nothing Selected)

**Bottom Panel:**
```
┌─────────────────────────────────────────────────────────────────────────┐
│  Click a polygon to select it. Shift+click to select multiple.          │
└─────────────────────────────────────────────────────────────────────────┘
```

**User can:**
- Click polygon → enters Selection mode
- Click Draw tool → enters Drawing mode
- Click Validate → enters Validation mode
- Pan/zoom the map

---

### 4.2 Selection Mode (1+ Polygons Selected)

**Visual:** Selected polygons highlighted with thick cyan border + light fill

**Bottom Panel (single selection):**
```
┌─────────────────────────────────────────────────────────────────────────┐
│  SELECTED: 1 polygon                                                    │
│  Area: 0.52 acres (2,104 sqm)   Vertices: 12                            │
│                                                                         │
│  [Delete]  [Split]  [Edit Vertices]                      [Undo] [Redo]  │
└─────────────────────────────────────────────────────────────────────────┘
```

**Bottom Panel (multiple selection):**
```
┌─────────────────────────────────────────────────────────────────────────┐
│  SELECTED: 3 polygons                                                   │
│  Combined area: 1.47 acres                                              │
│                                                                         │
│  [Delete All]  [Merge]                                   [Undo] [Redo]  │
└─────────────────────────────────────────────────────────────────────────┘
```

**Actions:**

| Action | Button | Shortcut | Requires |
|--------|--------|----------|----------|
| Delete | [Delete] | D | 1+ selected |
| Split | [Split] | S | 1 selected |
| Edit Vertices | [Edit Vertices] | E | 1 selected |
| Merge | [Merge] | M | 2+ adjacent selected |

**To exit:** Click empty area or press Escape

---

### 4.3 Drawing Mode (Creating New Polygon)

**Activated by:** Click [Draw] tool in sidebar

**Cursor:** Crosshair

**Bottom Panel:**
```
┌─────────────────────────────────────────────────────────────────────────┐
│  DRAWING: Click to place vertices. Double-click to finish.             │
│  Vertices placed: 4                                         [Cancel]    │
└─────────────────────────────────────────────────────────────────────────┘
```

**Behavior:**
1. Each click adds a vertex
2. Line shows from last vertex to cursor
3. Double-click or click first vertex to complete
4. New polygon created
5. Returns to Selection mode with new polygon selected

**To cancel:** Press Escape or click [Cancel]

---

### 4.4 Vertex Editing Mode

**Activated by:** Select polygon → click [Edit Vertices]

**Visual:**
```
     ●────────●          ● = Vertex (draggable)
    /          \         ─ = Edge (click to add vertex)
   /            \
  ●              ●───────●
  │                      │
  │                      │
  ●──────────────────────●
```

**Bottom Panel:**
```
┌─────────────────────────────────────────────────────────────────────────┐
│  EDITING VERTICES: Drag to move. Click edge to add. Right-click to     │
│  delete vertex.                                            [Done]       │
└─────────────────────────────────────────────────────────────────────────┘
```

**Interactions:**
| Action | Method |
|--------|--------|
| Move vertex | Drag it |
| Add vertex | Click on edge |
| Delete vertex | Right-click on vertex |
| Finish editing | Click [Done] or press Escape |

**Snapping:** When dragging vertex near another polygon's vertex/edge, it snaps to align (prevents gaps)

---

### 4.5 Split Mode

**Activated by:** Select polygon → click [Split]

**Cursor:** Crosshair with scissors icon

**Bottom Panel:**
```
┌─────────────────────────────────────────────────────────────────────────┐
│  SPLIT: Draw a line across the polygon. Double-click to split.         │
│                                                            [Cancel]     │
└─────────────────────────────────────────────────────────────────────────┘
```

**Behavior:**
1. Click to start split line
2. Click to add bend points (optional)
3. Double-click to end and execute split
4. Polygon divides into two along the line

```
Before:              Split line:           After:
┌──────────┐        ┌──────────┐         ┌─────┬────┐
│          │        │    /     │         │     │    │
│          │   →    │   /      │    →    │     │    │
│          │        │  /       │         │     │    │
└──────────┘        └──────────┘         └─────┴────┘
```

---

### 4.6 Validation Mode

**Activated by:** Click [Validate] in sidebar

**Sidebar updates:**
```
┌────────────┐
│  TOPOLOGY  │
│            │
│  ⚠ 2 errors│
│            │
│  [Validate]│
└────────────┘
```

**Bottom Panel (replaces selection panel):**
```
┌─────────────────────────────────────────────────────────────────────────┐
│  TOPOLOGY ERRORS: 2 found                                               │
│                                                                         │
│  1. Overlap (12 sqm)                              [Zoom To] [Auto-fix]  │
│  2. Gap (0.3 sqm)                                 [Zoom To] [Auto-fix]  │
│                                                                         │
│                                            [Fix All]           [Close]  │
└─────────────────────────────────────────────────────────────────────────┘
```

**Visual on map:**
- Overlaps: Red semi-transparent fill
- Gaps: Blue semi-transparent fill

**Actions:**
| Action | Result |
|--------|--------|
| [Zoom To] | Map pans/zooms to error location |
| [Auto-fix] | System attempts automatic repair |
| [Fix All] | Auto-fix all errors |
| [Close] | Return to default mode, keep error highlighting |

---

## 5. Map Interactions

### 5.1 Navigation

| Action | Method |
|--------|--------|
| Pan | Click + drag on empty area |
| Zoom in | Scroll up OR click [+] |
| Zoom out | Scroll down OR click [−] |
| Fit all | Click [Fit] |

### 5.2 Selection

| Action | Method |
|--------|--------|
| Select polygon | Click on it |
| Add to selection | Shift + click |
| Deselect | Click empty area OR Escape |
| Select obscured polygon | Right-click → "Select polygon underneath" |

### 5.3 Context Menu (Right-Click)

On polygon:
```
┌─────────────────────┐
│ Delete              │
│ Edit Vertices       │
│ Split               │
│ ─────────────────── │
│ Zoom to Polygon     │
│ Select Underneath   │
└─────────────────────┘
```

On empty area:
```
┌─────────────────────┐
│ Draw New Polygon    │
│ Fit to All          │
│ ─────────────────── │
│ Validate Topology   │
└─────────────────────┘
```

---

## 6. Keyboard Shortcuts

| Key | Action |
|-----|--------|
| **Selection** | |
| Escape | Deselect / Cancel current action |
| Ctrl+A | Select all polygons |
| **Editing** | |
| D | Delete selected |
| M | Merge selected (if 2+) |
| S | Split selected (if 1) |
| E | Edit vertices (if 1) |
| N | Activate Draw tool |
| **History** | |
| Ctrl+Z | Undo |
| Ctrl+Shift+Z | Redo |
| **View** | |
| + | Zoom in |
| − | Zoom out |
| F | Fit to extent |

---

## 7. Visual Design

### 7.1 Polygon States

| State | Border | Fill |
|-------|--------|------|
| Default | Orange #F97316, 2px | None |
| Hover | Orange #F97316, 3px | Orange 10% |
| Selected | Cyan #06B6D4, 3px | Cyan 15% |
| Error (overlap) | Red #EF4444, 2px | Red 30% |
| Error (gap) | Blue #3B82F6, 2px | Blue 30% |

*Note: Orange chosen over yellow for better visibility on varied terrain*

### 7.2 Cursors

| Mode | Cursor |
|------|--------|
| Default | Arrow |
| Over polygon | Pointer (hand) |
| Drawing | Crosshair |
| Splitting | Crosshair + scissors |
| Dragging vertex | Grabbing hand |
| Panning | Grabbing hand |

---

## 8. Data Safety

### 8.1 Auto-Save

- Changes auto-saved every 30 seconds
- Saved to browser local storage
- On reload: "Restore unsaved work?" prompt

### 8.2 Confirmations

| Action | Confirmation? |
|--------|---------------|
| Delete 1 polygon | No (can undo) |
| Delete 5+ polygons | Yes: "Delete 7 polygons?" |
| Close with unsaved changes | Yes: "Export before closing?" |
| Auto-fix all | Yes: "Auto-fix 12 errors?" |

### 8.3 Undo History

- Unlimited undo within session
- Undo stack cleared on export

---

## 9. Export Flow

**Triggered by:** Click [Export] button

**Dialog:**
```
┌───────────────────────────────────────────────────────────────┐
│  EXPORT SHAPEFILES                                       [X]  │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  Filename: nibhanupudi_parcels                                │
│                                                               │
│  Location: ~/Downloads                        [Change]        │
│                                                               │
│  ───────────────────────────────────────────────────────────  │
│                                                               │
│  Summary:                                                     │
│  • 847 polygons                                               │
│  • 0 topology errors  ✓                                       │
│                                                               │
│                                     [Cancel]     [Export]     │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

**If topology errors exist:**
```
│  • 847 polygons                                               │
│  • 2 topology errors  ⚠                                       │
│                                                               │
│  [Fix Errors First]              [Cancel]  [Export Anyway]    │
```

---

## 10. Initial Load Flow

### 10.1 Empty State (First Launch)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  BoundaryAI                                                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│                                                                         │
│                    ┌─────────────────────────────┐                      │
│                    │                             │                      │
│                    │     Load ORI Image          │                      │
│                    │                             │                      │
│                    │  Drag & drop GeoTIFF here   │                      │
│                    │  or click to browse         │                      │
│                    │                             │                      │
│                    └─────────────────────────────┘                      │
│                                                                         │
│                    Supported: .tif, .tiff                               │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 10.2 Processing State

```
┌─────────────────────────────────────────────────────────────────────────┐
│  BoundaryAI                                                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│                                                                         │
│                    ┌─────────────────────────────┐                      │
│                    │                             │                      │
│                    │   ████████████░░░░  72%     │                      │
│                    │                             │                      │
│                    │   Extracting parcels...     │                      │
│                    │   Found: 612 polygons       │                      │
│                    │                             │                      │
│                    │         [Cancel]            │                      │
│                    │                             │                      │
│                    └─────────────────────────────┘                      │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 10.3 Restore Prompt (If Previous Session Exists)

```
┌───────────────────────────────────────────────────────────────┐
│  Restore Previous Session?                               [X]  │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  Found unsaved work from: Jan 17, 2026 at 3:45 PM             │
│  File: nibhanupudi_ori.tif                                    │
│  Polygons: 847 (23 edits)                                     │
│                                                               │
│                        [Discard]          [Restore]           │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

---

## 11. Summary

| Component | Details |
|-----------|---------|
| Screens | 1 main workspace |
| Modes | 6 (Default, Selection, Drawing, Editing, Split, Validation) |
| Tools | 2 in sidebar (Select, Draw) |
| Actions | 5 (Delete, Merge, Split, Edit Vertices, Validate) |
| Shortcuts | 12 |

**Core Flow:**
```
Load ORI → AI Extracts → Review/Edit → Validate → Export
            (auto)        (manual)     (check)    (done)
```

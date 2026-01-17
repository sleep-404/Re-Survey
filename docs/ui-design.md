# BoundaryAI - UI/UX Design Document

**Version:** 2.0
**Date:** 2026-01-17
**Based on:** Research from QGIS, ArcGIS Pro, iD Editor, and cognitive load studies

---

## 1. Design Principles (Research-Backed)

### 1.1 From Cognitive Load Research

> "When interfaces demand too much mental effort, users make more errors, work more slowly, and experience reduced satisfaction"

**Applied principles:**
1. **Map dominates** - Interface chrome recedes. The ORI imagery is the work surface.
2. **Context-specific panels** - Show tools only when relevant (not all at once)
3. **Consistent terminology** - Same action = same name everywhere
4. **Direct manipulation** - Click and drag, not menus and dialogs

### 1.2 From iD Editor (OpenStreetMap)

> "Streamlined, in-browser editing experience with subtle guidance from the moment they first open"

**Applied principles:**
1. **No tutorials on launch** - Contextual hints at point of need
2. **Tooltips with shortcuts** - Learn as you work
3. **Forgiving** - Easy undo, hard to make permanent mistakes

### 1.3 From Transcript

> "delete any lines or polygons in a **fast manner**"

**Applied principle:** Every action should take ≤ 2 clicks OR have a single-key shortcut.

---

## 2. Screen Layout

**Single workspace. The map is 80% of screen.**

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ BoundaryAI  │  nibhanupudi.tif  │  847 polygons        │ [Validate] [Export] │
├─────────────┼────────────────────────────────────────────────────────────────┤
│             │                                                                │
│   TOOLS     │                                                                │
│   ┌─────┐   │                                                                │
│   │  ➤  │ V │                                                                │
│   └─────┘   │                                                                │
│   ┌─────┐   │                         MAP                                    │
│   │  ✎  │ N │                                                                │
│   └─────┘   │                    (ORI + Polygons)                            │
│             │                                                                │
│   ─────────│                                                                │
│             │                                                                │
│   LAYERS    │                                                                │
│   ☑ Imagery │                                                                │
│   ☑ Polygons│                                                                │
│             │                                                                │
│   ─────────│                                                                │
│             │                                                                │
│   TOPO      │                                                                │
│   ✓ Clean   │                                                                │
│             │                                                                │
├─────────────┴────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Click polygon to select  •  Shift+click to add  •  D delete  •  M merge    │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 2.1 Key Layout Decisions

| Decision | Rationale (from research) |
|----------|---------------------------|
| Narrow left sidebar | Map dominates per cognitive load research |
| Tools show shortcuts | Learn by doing (iD Editor pattern) |
| Bottom bar = contextual hints | "Pull revelations" - help when needed |
| No floating palettes | Reduce visual clutter |

---

## 3. Selection (The Most Critical Interaction)

Selection is the gateway to ALL editing. Research shows multiple selection methods needed.

### 3.1 Selection Methods

| Method | How | When to Use |
|--------|-----|-------------|
| **Click** | Click on polygon | Single polygon |
| **Shift+Click** | Hold Shift, click more | Add to selection |
| **Ctrl+Click** | Hold Ctrl, click | Remove from selection |
| **Box** | Click+drag rectangle | Multiple nearby polygons |
| **Lasso** | Hold Alt+drag freehand | Irregular groups |

### 3.2 Visual Feedback (Critical for Confidence)

| State | Border | Fill | Why |
|-------|--------|------|-----|
| Default | Orange 2px | None | Visible on varied terrain |
| Hover | Orange 3px | 10% orange | Shows clickable |
| Selected | Cyan 3px | 15% cyan | High contrast, distinct |
| Multi-selected | Cyan 2px dashed | 10% cyan | Distinguish from single |

### 3.3 Selection Persistence (from ArcGIS research)

> "With ArcGIS Pro you can move and resize the selection rectangle after drawing it"

**Implemented:** After box/lasso select, the selection shape stays visible. User can:
- Drag to reposition
- Drag corners to resize
- Press Enter to confirm, Escape to cancel

This prevents re-drawing when slightly off target.

---

## 4. Editing Modes

### 4.1 Mode Indicator

Current mode always visible in bottom bar:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ ● SELECT MODE   Click polygon to select  •  D delete  •  M merge  •  E edit │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ ● DRAW MODE     Click to place vertices  •  Double-click to finish  •  Esc  │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ ● EDIT VERTICES   Drag vertex  •  A add  •  D delete  •  Esc when done      │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Mode: Select (Default)

**Enter:** Press V or click Select tool
**Purpose:** Select polygons for actions

**When polygon(s) selected, bottom bar changes:**

```
Single selected:
┌──────────────────────────────────────────────────────────────────────────────┐
│ SELECTED: 1  │  0.52 ac  │  12 vertices  │  [Delete D] [Split S] [Edit E]   │
└──────────────────────────────────────────────────────────────────────────────┘

Multiple selected:
┌──────────────────────────────────────────────────────────────────────────────┐
│ SELECTED: 3  │  1.47 ac total  │  [Delete D]  [Merge M]                      │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Actions available:**

| Selection | Actions | Shortcuts |
|-----------|---------|-----------|
| 1 polygon | Delete, Split, Edit Vertices | D, S, E |
| 2+ adjacent | Delete, Merge | D, M |
| 2+ non-adjacent | Delete only | D |

### 4.3 Mode: Draw

**Enter:** Press N or click Draw tool
**Purpose:** Create new polygon

**Behavior:**
1. Click to place first vertex (small dot appears)
2. Move cursor - line follows from last vertex
3. Click to place more vertices
4. Snap indicator shows when near existing vertex/edge
5. Double-click OR click first vertex to complete
6. Escape to cancel

**Snapping (Critical for Topology):**

> Research: "When dragging vertex near another polygon's vertex/edge, it snaps to align (prevents gaps)"

Visual feedback:
- Cursor changes to magnet icon when in snap range
- Target vertex/edge highlights
- Snap happens on click, preview shows before

### 4.4 Mode: Edit Vertices

**Enter:** Select polygon, press E
**Purpose:** Adjust polygon boundary

**Visual:**
```
       ●───────────●
      /             \
     /               \
    ●                 ●────●
    │                      │
    │    (polygon)         │
    ●──────────────────────●

    ● = Vertex (drag to move)
    ─ = Edge (click to add vertex)
```

**Interactions:**

| Action | Method | Shortcut |
|--------|--------|----------|
| Move vertex | Drag it | - |
| Add vertex | Click on edge | A + click |
| Delete vertex | Right-click OR | D + click |
| Delete multiple | Hold D + drag across | D + drag |
| Finish | Click outside OR | Escape |

**Snapping:** Vertices snap to nearby vertices of adjacent polygons.

### 4.5 Mode: Split

**Enter:** Select 1 polygon, press S
**Purpose:** Divide polygon into two

**Behavior:**
1. Cursor becomes crosshair ✂
2. Click to start split line (must be on polygon edge)
3. Click more points for curved split (optional)
4. Double-click to end (must be on polygon edge)
5. Polygon divides into two

```
 Before          During           After
┌────────┐     ┌────────┐      ┌───┬────┐
│        │     │   /    │      │   │    │
│        │  →  │  /     │  →   │   │    │
│        │     │ /      │      │   │    │
└────────┘     └────────┘      └───┴────┘
```

---

## 5. Keyboard Shortcuts (Speed is Everything)

### 5.1 Single-Key Actions (No Modifier)

| Key | Action | Context |
|-----|--------|---------|
| V | Select tool | Always |
| N | Draw (New) tool | Always |
| E | Edit vertices | 1 selected |
| S | Split | 1 selected |
| D | Delete | Any selected |
| M | Merge | 2+ selected |
| A | Add vertex | Edit mode |
| Escape | Cancel / Deselect | Always |
| Z | Undo | Always |

### 5.2 Navigation (While Working)

| Key | Action |
|-----|--------|
| Scroll | Zoom in/out |
| Click+drag (empty) | Pan |
| F | Fit to all |
| Space+drag | Pan (any context) |
| + / - | Zoom in/out |

### 5.3 Modifier Keys

| Key | Action |
|-----|--------|
| Shift+click | Add to selection |
| Ctrl+click | Remove from selection |
| Alt+drag | Lasso select |
| Ctrl+Z | Undo |
| Ctrl+Shift+Z | Redo |
| Ctrl+A | Select all |

---

## 6. Contextual Help (Not Tutorials)

### 6.1 Research Finding

> "Intrusive tutorials typically interrupt users, fail to be memorable, don't improve task performance... Pull revelations triggered when users would benefit are more effective"

### 6.2 Implementation

**Bottom bar always shows relevant hints for current mode/selection.**

**Tooltips on hover (with shortcuts):**
```
┌─────────────────────────┐
│ Delete                  │
│ Remove selected polygon │
│ Shortcut: D             │
└─────────────────────────┘
```

**First-time hints (shown once, dismissible):**
- First load: "Drag to pan, scroll to zoom"
- First selection: "Press D to delete, E to edit vertices"
- First draw: "Double-click to finish polygon"

These are saved to localStorage so they only appear once per user.

---

## 7. Topology Validation

### 7.1 When to Validate

- Manual: Click [Validate] button
- Auto: Before export (required)

### 7.2 Error Display

Errors shown inline on map AND in list:

```
Map: Red fill for overlaps, blue fill for gaps

Bottom bar (replaces normal content):
┌──────────────────────────────────────────────────────────────────────────────┐
│ ⚠ 3 TOPOLOGY ERRORS  │  1. Overlap [→]  2. Overlap [→]  3. Gap [→]  [Fix All]│
└──────────────────────────────────────────────────────────────────────────────┘

[→] = Click to zoom to error
```

### 7.3 Fix Options

| Error | Auto-fix Behavior |
|-------|-------------------|
| Small overlap (<1 sqm) | Subtract from larger polygon |
| Large overlap | Highlight, manual fix required |
| Small gap (<0.5 sqm) | Expand adjacent polygons to fill |
| Large gap | Highlight, manual fix required |

---

## 8. Data Safety

### 8.1 Auto-Save

> Research emphasizes: "Users with good undo support can rapidly try approaches and revert if unsatisfactory"

- Auto-save to browser localStorage every 30 seconds
- On page reload: "Restore previous session?" prompt
- Shows: timestamp, filename, polygon count, edit count

### 8.2 Undo/Redo

**Research insight:**
> "Group related changes into single undo operation... users should predict what disappears"

| Operation | Undo Granularity |
|-----------|------------------|
| Delete 1 polygon | 1 undo restores it |
| Delete 5 polygons | 1 undo restores all 5 |
| Merge 3 polygons | 1 undo restores all 3 |
| Edit 4 vertices | 1 undo per vertex move |
| Split polygon | 1 undo restores original |

**Unlimited undo within session.**

### 8.3 Confirmations

| Action | Confirm? | Why |
|--------|----------|-----|
| Delete 1-4 polygons | No | Can undo |
| Delete 5+ polygons | Yes | Significant action |
| Merge | No | Can undo |
| Export | No | Not destructive |
| Close with unsaved | Yes | Prevents data loss |

---

## 9. Export Flow

**Trigger:** Click [Export] button

### 9.1 Pre-Export Validation

If topology errors exist:
```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  ⚠ 2 topology errors found                                      │
│                                                                 │
│  Shapefiles with topology errors may cause issues in other      │
│  GIS software.                                                  │
│                                                                 │
│  [Fix Errors]                    [Export Anyway]                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 9.2 Export Dialog (Clean)

```
┌─────────────────────────────────────────────────────────────────┐
│  EXPORT SHAPEFILES                                         [X]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Filename: nibhanupudi_parcels                                  │
│                                                                 │
│  847 polygons  •  0 errors  ✓                                   │
│                                                                 │
│                                        [Cancel]    [Export]     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

Files downloaded: `nibhanupudi_parcels.shp`, `.shx`, `.dbf`, `.prj`

---

## 10. Initial Load

### 10.1 Empty State

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ BoundaryAI                                                                   │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│                                                                              │
│                                                                              │
│                      ┌──────────────────────────────┐                        │
│                      │                              │                        │
│                      │     Load ORI Image           │                        │
│                      │                              │                        │
│                      │   Drop .tif file here        │                        │
│                      │   or click to browse         │                        │
│                      │                              │                        │
│                      └──────────────────────────────┘                        │
│                                                                              │
│                                                                              │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 10.2 Processing State

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ BoundaryAI                                                                   │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│                                                                              │
│                      ┌──────────────────────────────┐                        │
│                      │                              │                        │
│                      │   ████████████░░░░░  68%     │                        │
│                      │                              │                        │
│                      │   Extracting polygons...     │                        │
│                      │   Found: 612                 │                        │
│                      │                              │                        │
│                      │          [Cancel]            │                        │
│                      │                              │                        │
│                      └──────────────────────────────┘                        │
│                                                                              │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 10.3 Session Restore (if previous session exists)

```
┌─────────────────────────────────────────────────────────────────┐
│  Previous session found                                    [X]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  nibhanupudi.tif                                                │
│  847 polygons • 23 edits • Jan 17, 3:45 PM                      │
│                                                                 │
│                            [Discard]        [Restore]           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 11. Accessibility

### 11.1 Color

> Research: "Color vision deficiency affects ~8% of men... use color IN ADDITION to shape/pattern"

| Element | Color | Additional Indicator |
|---------|-------|---------------------|
| Selected polygon | Cyan border | Thicker border (3px vs 2px) |
| Error: overlap | Red fill | Cross-hatch pattern |
| Error: gap | Blue fill | Diagonal lines pattern |

### 11.2 Keyboard Navigation

All actions accessible via keyboard (no mouse required):
- Tab to move between UI elements
- Enter to activate buttons
- All editing via shortcuts

### 11.3 Screen Reader

- All buttons have aria-labels
- Mode changes announced
- Selection count announced

---

## 12. Context Menu (Right-Click)

### 12.1 On Polygon

```
┌────────────────────┐
│ Delete         D   │
│ Edit Vertices  E   │
│ Split          S   │
├────────────────────┤
│ Zoom to            │
│ Properties...      │
└────────────────────┘
```

### 12.2 On Empty Area

```
┌────────────────────┐
│ Draw Polygon   N   │
│ Select All     ⌘A  │
├────────────────────┤
│ Fit to Extent  F   │
│ Validate           │
└────────────────────┘
```

### 12.3 On Multiple Selected

```
┌────────────────────┐
│ Delete All     D   │
│ Merge          M   │
├────────────────────┤
│ Zoom to            │
└────────────────────┘
```

---

## 13. Summary

| Aspect | Details |
|--------|---------|
| Layout | Single screen, map dominates (80%), narrow sidebar |
| Modes | 4: Select, Draw, Edit Vertices, Split |
| Selection methods | 5: Click, Shift+click, Ctrl+click, Box, Lasso |
| Single-key shortcuts | 10: V, N, E, S, D, M, A, Z, F, Escape |
| Help approach | Contextual hints, not tutorials |
| Auto-save | Every 30 seconds to localStorage |
| Undo | Unlimited, grouped by user action |

**Core interaction pattern:**
```
Select → Act → Repeat
   ↓       ↓
 Click    D/M/S/E
```

**Speed optimizations (per transcript requirement):**
1. Single-key shortcuts for all common actions
2. No dialogs for reversible actions
3. Box select with resizable selection
4. Bottom bar shows relevant actions for current context

# BoundaryAI - UI/UX Design Specification

## Overview

**Application:** BoundaryAI - AI-Assisted Land Parcel Editor
**Users:** Government Survey Officers (Andhra Pradesh Re-Survey Project)
**Core Value:** Supercharge officers by letting AI do the heavy lifting - auto-detect boundaries, officers just verify and correct.

---

## The Problem We Solve

**Without AI:** Officers manually trace every parcel boundary from drone images. Slow, tedious, error-prone.

**With BoundaryAI:** AI (SAM) auto-detects 12,000+ parcel boundaries. Officers review, fix mistakes, and move on. 10x faster.

### Two Common AI Mistakes Officers Fix:

| Problem | What Happened | Officer Action |
|---------|---------------|----------------|
| **Over-segmentation** | AI saw a shadow/channel as boundary, split one parcel into many | Select fragments → **Merge (M)** |
| **Under-segmentation** | AI missed a faint bund, merged two parcels into one | Select parcel → **Split (S)** → draw dividing line |

---

## Demo Flow (10-15 minutes)

```
Login → Map Editor (all functionality here)
```

**That's it. Two screens.**

---

## Screen 1: Login (Simple)

Just for authentication. Keep it minimal with government branding.

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
│        AP Survey & Land Records Department              │
└─────────────────────────────────────────────────────────┘
```

### Placeholders
```html
<input id="employee-id" placeholder="Employee ID" />
<input id="password" type="password" placeholder="Password" />
<button id="login-btn">Sign In</button>
```

**Integration:** On login, navigate to Map Editor. (No actual auth needed for demo - just button click.)

---

## Screen 2: Map Editor (Main Interface)

This is where ALL the action happens. Everything we've built lives here.

### Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│  BoundaryAI    Nibhanupudi Village                    [Saved ✓] [User] │
├──────────────────────┬──────────────────────────────────────────────────┤
│                      │                                                  │
│  [Tools] [Layers]    │                                                  │
│  [Classify][Validate]│              INTERACTIVE MAP                     │
│  [ROR] [Stats]       │                                                  │
│                      │         (Drone imagery + AI boundaries)          │
│  ┌────────────────┐  │                                                  │
│  │                │  │                                                  │
│  │   Active Tab   │  │                                                  │
│  │    Content     │  │                                                  │
│  │                │  │                                                  │
│  │                │  │                                                  │
│  │                │  │                                                  │
│  └────────────────┘  │                                                  │
│                      │                                                  │
│  [Export Shapefile]  │                                                  │
│                      │                                                  │
├──────────────────────┴──────────────────────────────────────────────────┤
│  Mode: SELECT  │  "Click parcels to select"  │  Selected: 3 (456 m²)   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Sidebar Tabs (Already Implemented)

### Tab 1: Tools
| Tool | Shortcut | What It Does |
|------|----------|--------------|
| Select | V | Click/drag to select parcels |
| Draw | N | Draw new parcel boundary |
| Edit Vertices | E | Adjust boundary shape |
| Split | S | Divide one parcel into two |
| Undo/Redo | Z / Shift+Z | Undo/redo actions |

### Tab 2: Layers
- **Data Source** (radio buttons):
  - SAM AI Output (12,032 parcels) ← AI-detected
  - Ground Truth (105 parcels) ← Manually digitized reference
  - Working Layer ← Officer's edits
- **Toggles**:
  - Show GT Overlay (dashed red lines)
  - Conflict Highlighting (color by area mismatch)
  - ORI Tiles (drone imagery)
  - Google Satellite
  - Polygons (show/hide boundaries)
- **Min Area Filter**: Slider + presets to hide tiny fragments

### Tab 3: Classify
- Shows current parcel type
- Buttons to assign type (1-8 shortcuts):
  - Agricultural, Gramakantam, Building, Road
  - Water Body, Open Space, Compound, Government Land

### Tab 4: Validate
- **Area Comparison**: Selected parcel area vs ROR record
- **Topology Validation**: Check for overlaps/gaps, auto-fix button
- **Accuracy Metrics**: IoU score against ground truth (85% target)

### Tab 5: ROR
- List of Record of Rights entries
- Search by LP number
- Shows area for each record

### Tab 6: Stats
- Total parcels and area
- Area distribution (min/avg/median/max)
- Bar chart by parcel type

---

## Bottom Bar (Already Implemented)

Shows current state and quick actions:
- **Mode**: SELECT / DRAW / EDIT / SPLIT
- **Hint**: Contextual help ("Click to select, Shift+click for multi")
- **Selection**: Count and total area
- **Actions**: Delete (D), Merge (M), Split (S), Edit (E)

---

## Key Interactions (Already Implemented)

| Action | How |
|--------|-----|
| Select parcel | Click on it |
| Multi-select | Shift+click or drag box |
| Delete | Select → press D |
| Merge | Select 2+ parcels → press M |
| Split | Select 1 parcel → press S → draw line |
| Change type | Select → press 1-8 |
| Undo | Press Z or Ctrl+Z |
| Right-click menu | Context actions |

---

## Color Palette (Government-Appropriate)

```
Primary:      #1e40af (Government blue)
Success:      #059669 (Green - good match)
Warning:      #d97706 (Amber - needs review)
Error:        #dc2626 (Red - conflict)
Background:   #f8fafc (Light gray)
Surface:      #ffffff (White cards)
Text:         #1e293b (Dark slate)

Parcel Types:
- Agricultural:    #ea580c (Orange)
- Gramakantam:     #ca8a04 (Yellow)
- Building:        #dc2626 (Red)
- Road:            #6b7280 (Gray)
- Water Body:      #2563eb (Blue)
- Open Space:      #16a34a (Green)
- Compound:        #9333ea (Purple)
- Government Land: #0d9488 (Teal)
```

---

## Data Placeholders

Use these placeholder patterns. I will replace with real data.

```html
<!-- Header -->
<span id="village-name">{{VILLAGE_NAME}}</span>
<span id="save-status">Saved ✓</span>

<!-- Data source counts -->
<span id="sam-count">12,032</span>
<span id="gt-count">105</span>

<!-- Selected parcel info -->
<div id="selected-count">{{COUNT}} selected</div>
<div id="selected-area">{{AREA}} m²</div>
<div id="parcel-type">{{TYPE}}</div>

<!-- Stats -->
<div id="total-parcels">{{TOTAL}}</div>
<div id="total-area">{{AREA}} ha</div>

<!-- Map container - leave empty, I'll inject the map -->
<div id="map-container"></div>
```

---

## What NOT to Include

These are NOT implemented - don't design for them:
- ❌ Dashboard with village list
- ❌ Multiple villages
- ❌ User roles/permissions
- ❌ Approval workflows
- ❌ Notifications
- ❌ Settings page

---

## Integration Notes

When you send me the HTML:

1. **Map container**: Just an empty `<div id="map-container">` - I'll inject MapLibre GL
2. **Sidebar tabs**: I'll wire up the tab switching and content
3. **Buttons/inputs**: Give them IDs, I'll add event handlers
4. **Keep it responsive**: Sidebar should be ~280px fixed, map fills the rest

---

## Summary

**Two screens only:**
1. Login (simple form)
2. Map Editor (everything else)

**Core message:** AI detects boundaries automatically. Officers verify and fix mistakes using Merge/Split/Edit. 10x productivity boost for the resurvey project.

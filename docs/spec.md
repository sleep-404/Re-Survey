# BoundaryAI - Land Parcel Extraction Tool

## Software Specification Document

**Version:** 2.0
**Date:** 2026-01-17
**Project:** AI Tools for Accelerating Land Resurvey
**Department:** Lands & Revenue Department, Government of Andhra Pradesh

---

## 1. Executive Summary

### 1.1 Problem Statement

The Government of Andhra Pradesh is executing a large-scale Resurvey initiative covering 16,816 villages. Currently, parcel identification relies heavily on **manual delineation** from drone imagery (ORI), resulting in significant delays and high manual effort.

> "manual digitalization creation of land parcel... manually using the software"
> — *Orientation Session, Jan 6, 2026*

### 1.2 What the Department Wants

> "So first thing you do on the imaginary. What are the bunds you have shown in the ORI, it should be drawn. **That is the basic task we have.**"
> — *Orientation Session*

> "whatever solution we provide the **input will be the orthorectified image and output will be the shapefiles** which you can visualize"
> — *Orientation Session*

**Simply put:**
- **Input:** ORI image
- **Output:** Shapefiles with polygons drawn along visible bunds

### 1.3 Expected Outcome

> "lot of majority of the work of doing this polygonization vectorization would be saved, minimized"
> — *Orientation Session*

### 1.4 Key Constraint

**Ground truth shapefiles cannot be used in the algorithm** - only for final evaluation.

> "providing the Land Parcel shapefile or any derivative output to the participants in advance would materially compromise the objectivity and integrity of the solution validation process"
> — *WhatsApp, Jan 12, 2026*

---

## 2. Overall Resurvey Workflow

Understanding where our tool fits in the overall process (from Orientation Session):

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     OVERALL RESURVEY WORKFLOW                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1. Section 5 Notification (announce resurvey for state)                │
│                              ↓                                          │
│  2. Drone Flight → Capture aerial images                                │
│                              ↓                                          │
│  3. Generate ORI (Orthorectified Images)                                │
│                              ↓                                          │
│  4. Quality Check ORI in lab                                            │
│                              ↓                                          │
│  5. Submit ORI to field staff                                           │
│                              ↓                                          │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  6. FIX BOUNDARIES (Manual - before polygonization)               │  │
│  │     • Fix village boundaries using cadastral maps                 │  │
│  │     • Fix block boundaries                                        │  │
│  │     • Fix government land boundaries using FMB records            │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                              ↓                                          │
│  ╔═══════════════════════════════════════════════════════════════════╗  │
│  ║  7. POLYGONIZATION / VECTORIZATION  ◄── OUR AI TOOL FITS HERE     ║  │
│  ║     • Extract polygons along visible bunds from ORI               ║  │
│  ║     • Create building footprints in Abadi areas                   ║  │
│  ║     • Detect water bodies                                         ║  │
│  ║     • Output: Draft shapefiles (geometry only, no LP numbers)     ║  │
│  ╚═══════════════════════════════════════════════════════════════════╝  │
│                              ↓                                          │
│  8. FPOLR (Field Level Purification of Land Records)                    │
│                              ↓                                          │
│  9. Ground Truthing with GNSS Rovers                                    │
│     • Officers go to field with draft polygons                          │
│     • Collect corner coordinates                                        │
│     • Correct any errors (false bunds, missing parcels)                 │
│                              ↓                                          │
│  10. LP Number Assignment & Correlation Statement                       │
│      • Assign LP numbers to each polygon                                │
│      • Create correlation: Old Survey Number → New LP Number            │
│                              ↓                                          │
│  11. Merge with ROR Data                                                │
│      • Link polygons to owner records                                   │
│      • Add land classification, extent, etc.                            │
│                              ↓                                          │
│  12. Upload to WebLand / VS Login                                       │
│                              ↓                                          │
│  13. Approval Chain: VRO → Tahsildar → RDO → Joint Collector            │
│                              ↓                                          │
│  14. Draft Land Register → Final Land Register                          │
│                              ↓                                          │
│  15. Section 30 Notification (completion of resurvey)                   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Key Insight:** Our tool operates at Step 7. LP numbers are assigned LATER at Step 10.

---

## 3. Tool Requirements

### 3.1 Core Deliverables (from challenge.json)

| # | Deliverable | Description |
|---|-------------|-------------|
| 1 | **AI-Based Parcel Extraction** | Automate parcel boundary extraction from ORI |
| 2 | **Conflict Detection** | Detect discrepancies between extracted areas and ROR |
| 3 | **AI-Assisted Field Validation** | Mobile-ready tools for survey inspectors |
| 4 | **Visualization Dashboard** | View progress, conflicts, verification status |

### 3.2 Primary Function: Automatic Polygon Extraction

> "The AI tool should extract the land parcels for along this bunds from here to here... **all bunds should be captured**"
> — *Orientation Session*

> "we should draw the lines in according to the **middle of the middle of the bund**"
> — *Orientation Session*

**Requirements:**
- Detect visible bunds (raised earth boundaries) in ORI
- Draw polygon boundaries through the CENTER of bunds
- Capture every corner where bund direction changes
- Cover the entire village area

### 3.3 Agricultural Land Parcels

| Requirement | Description |
|-------------|-------------|
| Boundary detection | Along visible bunds |
| Line placement | Through center of bund (not edges) |
| Corner capture | Every direction change |
| Coverage | All fields in village |

### 3.4 Gramakantam/Abadi Areas (Habitations)

> "we have to extract the outer boundary of the Gramakantam and individual parcel boundaries along with the built-up for buildings... compound polygon... open spaces... roads"
> — *Orientation Session*

> "all the above the areas and the structures and the compounds and the houses... they're all handled under the **Swamitva** program"
> — *Orientation Session*

| Feature | Requirement | Color Code |
|---------|-------------|------------|
| Outer boundary | Polygon for entire habitation area | Black |
| Building footprints | Individual polygons for structures | Blue |
| Compounds | Property boundary polygons | Blue |
| Roads | Double-line polygon representation | Red |
| Open spaces | Polygons for vacant areas | Green |

> "the red lines, which shown is a drawn for road, and the blue, blue lines were shown property boundaries"
> — *Orientation Session*

### 3.5 Water Bodies

> "any water body is there then it should be detected automatically from the imagery"
> — *Orientation Session*

- Detect ponds, tanks, canals
- Create polygon boundaries

### 3.6 Topology Rules

> "those polygons whichever have been created **should not overlap** among each other and also **there should not be any gaps** between each other"
> — *Orientation Session*

> "there should be a **common boundary** between the two parcels suppose there are two parcel A and B so like for A and B there is a common boundary"
> — *Orientation Session*

| Rule | Description |
|------|-------------|
| No overlaps | Adjacent parcels share ONE boundary line, not two |
| No gaps | No slivers or empty space between parcels |
| Common boundary | Parcel A and B share exactly one edge |
| Auto-fix | Tool should automatically detect and fix topology errors |

### 3.7 Over-Segmentation Handling

> "there might be then **over creation of parcels**... **that is expected**... those things will be **corrected during the ground truthing phase**"
> — *Orientation Session*

- Over-segmentation is acceptable
- Tool must provide mechanism to merge segments
- False bunds will be corrected by officers during review

### 3.8 Edit Operations

> "there should also be any mechanism to **delete any lines or polygons in a fast manner**... **addition of lines of polygons**, if that is also can be done"
> — *Orientation Session*

| Operation | Purpose |
|-----------|---------|
| Delete | Remove false bunds / unwanted polygons |
| Merge | Combine over-segmented areas into one parcel |
| Split | Divide a polygon that should be multiple parcels |
| Add | Draw new polygon where AI missed |
| Edit | Adjust boundary vertices |

### 3.9 Area Tolerance

> "**permissible limit is 5%** between the ground and this thing"
> — *Orientation Session*

After polygons are matched with ROR data (later in workflow), area difference should be ≤ 5%.

### 3.10 Output Format

> "output will be the **shapefiles** which you can visualize"
> — *Orientation Session*

| Output | Format | Contents |
|--------|--------|----------|
| Land parcels | Shapefile (.shp) | Polygon geometries |
| Gramakantam features | Shapefile (.shp) | Buildings, roads, compounds |
| Water bodies | Shapefile (.shp) | Ponds, tanks, canals |

**Note:** Shapefiles at this stage contain geometry only. LP numbers are assigned later during ground truthing.

---

## 4. User Workflow in Our Tool

### 4.1 Actors

| Actor | Role in Our Tool |
|-------|------------------|
| Survey Inspector | Reviews AI output, corrects polygons |
| Mandal Surveyor | 20% quality check |
| DIA | 10% quality review |
| DSL | 5% quality review |

### 4.2 Workflow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        TOOL WORKFLOW                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1. LOAD DATA                                                           │
│     • Load ORI image (GeoTIFF)                                          │
│     • AI automatically processes and extracts polygons                  │
│                                                                         │
│  2. REVIEW AI OUTPUT                                                    │
│     • View extracted polygons overlaid on ORI                           │
│     • Polygons colored by type:                                         │
│       - Agricultural parcels                                            │
│       - Buildings (blue)                                                │
│       - Roads (red)                                                     │
│       - Water bodies                                                    │
│                                                                         │
│  3. CORRECT ERRORS                                                      │
│     • Delete false bunds (over-segmentation)                            │
│     • Merge polygons that should be one parcel                          │
│     • Add missing polygons                                              │
│     • Adjust boundaries that don't align with visible bunds             │
│                                                                         │
│  4. VALIDATE TOPOLOGY                                                   │
│     • Run topology check                                                │
│     • Tool highlights overlaps (red) and gaps (blue)                    │
│     • Fix any topology errors                                           │
│                                                                         │
│  5. EXPORT                                                              │
│     • Export shapefiles (geometry only)                                 │
│     • Ready for ground truthing phase                                   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 4.3 What Happens After Export (Not Our Tool)

```
After exporting from our tool:

1. Officers take shapefiles to field
2. Ground truthing with GNSS rovers
3. Correct any remaining errors
4. Assign LP numbers to each polygon
5. Create correlation statement (old survey → new LP)
6. Merge with ROR data
7. Upload to WebLand
```

---

## 5. User Interface Specification

### 5.1 Main Screen Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│  HEADER: BoundaryAI - Village: Nibanupudi                               │
│  [Load ORI] [Run AI Extraction] [Export Shapefiles] [Settings]          │
├─────────────────┬───────────────────────────────────────────────────────┤
│                 │                                                       │
│  SIDEBAR        │                    MAP VIEW                           │
│                 │                                                       │
│  ─────────────  │   ┌───────────────────────────────────────────────┐  │
│  Layer Controls │   │                                               │  │
│  ☑ ORI Imagery  │   │      [Interactive Map]                        │  │
│  ☑ AI Polygons  │   │                                               │  │
│  ☐ Buildings    │   │      - ORI as basemap                         │  │
│  ☐ Roads        │   │      - AI-extracted polygons overlaid         │  │
│  ☐ Water Bodies │   │      - Click to select polygons               │  │
│                 │   │      - Zoom/pan navigation                    │  │
│  ─────────────  │   │                                               │  │
│                 │   └───────────────────────────────────────────────┘  │
│  Statistics     │                                                       │
│  ┌───────────┐  │   TOOLS: [Select] [Merge] [Split] [Draw] [Delete]    │
│  │Polygons:  │  │          [Edit Vertices] [Undo] [Redo]               │
│  │  1,247    │  │                                                       │
│  │           │  ├───────────────────────────────────────────────────────┤
│  │Buildings: │  │  PROPERTIES PANEL (when polygon selected)            │
│  │  342      │  │                                                       │
│  │           │  │  Type: Agricultural Parcel                            │
│  │Roads:     │  │  Area: 0.52 acres (2,104 sqm)                         │
│  │  28       │  │  Perimeter: 184 m                                     │
│  │           │  │  Vertices: 12                                         │
│  │Water:     │  │                                                       │
│  │  5        │  │  [Delete] [Merge with Adjacent] [Edit Boundary]       │
│  └───────────┘  │                                                       │
│                 │                                                       │
│  ─────────────  │                                                       │
│                 │                                                       │
│  Topology       │                                                       │
│  [Validate]     │                                                       │
│  Overlaps: 0    │                                                       │
│  Gaps: 0        │                                                       │
│                 │                                                       │
└─────────────────┴───────────────────────────────────────────────────────┘
```

### 5.2 Layer Controls

| Layer | Description | Default |
|-------|-------------|---------|
| ORI Imagery | Drone/aerial basemap | ON |
| AI Polygons | All extracted polygons | ON |
| Buildings | Building footprints (blue) | OFF |
| Roads | Road polygons (red) | OFF |
| Water Bodies | Ponds, tanks, canals | OFF |

### 5.3 Tools

| Tool | Function |
|------|----------|
| **Select** | Click to select polygon; Shift+click for multi-select |
| **Merge** | Combine selected polygons into one |
| **Split** | Draw line to divide a polygon |
| **Draw** | Manually draw new polygon |
| **Delete** | Remove selected polygon |
| **Edit Vertices** | Drag vertices to adjust boundary |
| **Undo/Redo** | Undo or redo last action |

### 5.4 Properties Panel

When polygon selected:
```
┌─────────────────────────────────────┐
│ POLYGON PROPERTIES                  │
├─────────────────────────────────────┤
│ Type: Agricultural Parcel           │
│                                     │
│ Area: 0.52 acres                    │
│       2,104 sqm                     │
│                                     │
│ Perimeter: 184 m                    │
│                                     │
│ Vertices: 12                        │
│                                     │
│ Centroid: 16.2814°N, 80.9851°E      │
│                                     │
│ ─────────────────────────────────── │
│                                     │
│ [Delete] [Merge] [Edit Boundary]    │
└─────────────────────────────────────┘
```

When multiple polygons selected:
```
┌─────────────────────────────────────┐
│ SELECTION: 3 polygons               │
├─────────────────────────────────────┤
│ Combined Area: 1.42 acres           │
│                                     │
│ [Merge All] [Delete All] [Clear]    │
└─────────────────────────────────────┘
```

### 5.5 Topology Validation View

```
┌─────────────────────────────────────────────────────────────────────────┐
│ TOPOLOGY VALIDATION                                                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Status: ⚠️ 2 issues found                                              │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ OVERLAPS (1)                                                    │   │
│  │ • Polygon 234 overlaps with Polygon 235 [View] [Auto-fix]       │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ GAPS (1)                                                        │   │
│  │ • Gap between Polygon 456 and Polygon 457 [View] [Auto-fix]     │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  [Fix All Automatically] [Re-validate]                                  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 6. User Actions

### 6.1 Action: Load ORI and Run Extraction

**Trigger:** Officer starts working on a new village

**Steps:**
1. Click "Load ORI"
2. Select GeoTIFF file
3. ORI displays on map
4. Click "Run AI Extraction"
5. AI processes image and extracts polygons
6. Polygons display overlaid on ORI

**Result:** Village polygons ready for review

---

### 6.2 Action: Review AI Output

**Trigger:** AI extraction complete

**Steps:**
1. Pan/zoom around the map
2. Compare AI polygons with visible bunds in ORI
3. Identify issues:
   - Over-segmentation (too many polygons)
   - Under-segmentation (missed bunds)
   - Misaligned boundaries

**Result:** Issues identified for correction

---

### 6.3 Action: Delete False Polygon

**Trigger:** AI created polygon where there's no real bund

**Steps:**
1. Click on the false polygon to select it
2. Click "Delete" tool
3. Polygon removed

**Result:** False polygon deleted

---

### 6.4 Action: Merge Over-Segmented Polygons

**Trigger:** AI split one parcel into multiple polygons

**Steps:**
1. Shift+click to select multiple polygons
2. Click "Merge" tool
3. Polygons combined into one

**Result:** Single polygon created from merged pieces

---

### 6.5 Action: Split Under-Segmented Polygon

**Trigger:** AI missed a bund, combining two parcels into one

**Steps:**
1. Click on the polygon to select it
2. Click "Split" tool
3. Draw a line along the missing bund
4. Polygon split into two

**Result:** Two separate polygons created

---

### 6.6 Action: Add Missing Polygon

**Trigger:** AI completely missed a parcel

**Steps:**
1. Click "Draw" tool
2. Click to place vertices along the bund
3. Double-click to complete polygon

**Result:** New polygon added

---

### 6.7 Action: Edit Polygon Boundary

**Trigger:** Boundary doesn't align with visible bund

**Steps:**
1. Click on polygon to select it
2. Click "Edit Vertices" tool
3. Drag vertices to align with bund center
4. Double-click to add new vertex
5. Right-click to delete vertex
6. Click outside to finish editing

**Result:** Boundary adjusted to match bund

---

### 6.8 Action: Validate Topology

**Trigger:** Before export, check for errors

**Steps:**
1. Click "Validate Topology"
2. System scans all polygons
3. Highlights overlaps (red) and gaps (blue)
4. Click "View" to navigate to each issue
5. Click "Auto-fix" or manually correct

**Result:** Topology errors fixed

---

### 6.9 Action: Export Shapefiles

**Trigger:** Review complete, ready for field work

**Steps:**
1. Click "Export Shapefiles"
2. Select output folder
3. Choose layers to export:
   - ☑ Agricultural parcels
   - ☑ Buildings
   - ☑ Roads
   - ☑ Water bodies
4. Click "Export"

**Result:** Shapefiles created for ground truthing phase

---

## 7. Conflict Detection (Post-Extraction)

> "Conflict Detection: Automatically detect and highlight discrepancies between WebLand 1.0 (textual land records) and resurvey-derived parcel areas"
> — *challenge.json*

This is a **secondary feature** that operates after polygons are created and matched with ROR data.

### 7.1 When Conflict Detection Happens

```
1. AI extracts polygons (our tool)
2. Ground truthing (field work)
3. LP numbers assigned
4. ROR data merged with polygons
5. CONFLICT DETECTION ◄── Compare areas
```

### 7.2 Conflict Detection Feature

If ROR data is available and LP numbers have been assigned:

| Conflict Type | Description | Threshold |
|---------------|-------------|-----------|
| Area mismatch | Extracted area vs ROR recorded area | > 5% |
| Classification mismatch | Land type doesn't match ROR | Any |
| Missing parcel | LP in ROR but no matching polygon | - |

### 7.3 Conflict Detection UI

```
┌─────────────────────────────────────────────────────────────────────────┐
│ CONFLICT DETECTION (Optional - requires ROR data)                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  [Load ROR Data]  Status: ✓ Loaded (857 records)                        │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Area Mismatches (> 5%)                                          │   │
│  │                                                                 │   │
│  │ LP 335:  ROR: 1.35 ac  |  Extracted: 1.52 ac  |  +12.6% ⚠️      │   │
│  │ LP 412:  ROR: 0.50 ac  |  Extracted: 0.38 ac  |  -24.0% 🔴      │   │
│  │ LP 508:  ROR: 2.00 ac  |  Extracted: 1.89 ac  |   -5.5% ⚠️      │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  [Export Conflict Report]                                               │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 8. Field Validation Tools (Mobile)

> "Provide mobile-ready tools for survey inspectors to verify boundaries, prioritize field checks"
> — *challenge.json*

### 8.1 Mobile Requirements

- Responsive design for tablets/phones
- Offline capability (field areas may have poor connectivity)
- GPS integration to show officer's location
- Touch-friendly interface

### 8.2 Field Validation Workflow

```
1. Officer downloads shapefiles to mobile device
2. Goes to field location
3. GPS shows current position on map
4. Compares AI polygons with actual ground features
5. Marks parcels as:
   - ✓ Verified (correct)
   - ⚠️ Needs correction
   - ❌ Rejected
6. Syncs feedback when back online
```

---

## 9. Quality Check Workflow

> "manually expert review by Mandal survey has 20% check on the data created by the surveyor and DIA was 10% and DSL was 5% review"
> — *Orientation Session*

### 9.1 Review Hierarchy

| Role | Review Percentage | Action |
|------|------------------|--------|
| Surveyor | Creates 100% | Full editing |
| Mandal Surveyor | Reviews 20% | Approve/reject |
| DIA | Reviews 10% | Approve/reject |
| DSL | Reviews 5% | Approve/reject |

### 9.2 Review Mode

Supervisor can:
- View polygons created by surveyor
- Approve individual polygons
- Reject with comments
- Make corrections directly

---

## 10. Technical Specifications

### 10.1 Coordinate System

| Datum | EPSG | Use |
|-------|------|-----|
| UTM Zone 44N | EPSG:32644 | Source data (ORI, SAM segments) |
| WGS84 | EPSG:4326 | Web display (Lat/Long) |

### 10.2 Supported Input Formats

| Format | Extension | Description |
|--------|-----------|-------------|
| GeoTIFF | .tif | Orthorectified imagery |
| JPEG2000 | .jp2 | Compressed imagery |

### 10.3 Output Formats

| Format | Extension | Description |
|--------|-----------|-------------|
| Shapefile | .shp | Standard GIS format |
| GeoJSON | .geojson | Web-friendly format |
| GeoPackage | .gpkg | Modern GIS format |

### 10.4 Technology Stack

| Component | Technology |
|-----------|------------|
| Frontend | Streamlit / React |
| Mapping | Folium / Leaflet |
| Backend | Python |
| GIS Operations | GeoPandas, Shapely |
| AI Segmentation | SAM (Segment Anything Model) |

---

## 11. Success Criteria

> "Parcel extraction precision **greater than 80%** relative to expert-labelled references"
> — *challenge.json*

> "At least **70% positive feedback** from survey teams during field testing"
> — *challenge.json*

| Metric | Target |
|--------|--------|
| Extraction precision | > 80% |
| Survey team satisfaction | > 70% positive |
| Topology errors | 0 (after validation) |
| Processing time | < manual time |

---

## 12. Glossary

| Term | Definition |
|------|------------|
| **ORI** | Ortho Rectified Image - geometrically corrected aerial/drone imagery |
| **Bund** | Raised earth boundary between agricultural fields |
| **LP Number** | Land Parcel Number - unique identifier (assigned during ground truthing) |
| **ROR** | Record of Rights - official land ownership records |
| **Gramakantam/Abadi** | Habitation area within village |
| **FMB** | Field Measurement Book - legacy survey records |
| **ULPIN** | Unique Land Parcel Identification Number |
| **WebLand** | AP Government's land records management system |
| **Swamitva** | Program for Abadi/habitation area surveying |
| **Topology** | Spatial relationships between polygons |
| **Ground Truthing** | Field verification with GNSS rovers |

---

## 13. Source References

| Document | Key Information |
|----------|-----------------|
| `challenge.json` | Official requirements, success criteria |
| `Land Resurvey orientation session.txt` | Workflow, specific requirements, quotes |
| `WhatsApp Chat with Re_Survey.txt` | Data constraints |

---

## 14. Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-17 | Initial specification |
| 2.0 | 2026-01-17 | Corrected workflow based on transcript review. Removed incorrect LP number assignment. Clarified tool's role in overall process. |

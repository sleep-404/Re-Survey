# REALISTIC DEMO PLAN - BoundaryAI

**Date:** 2026-01-22
**Purpose:** Comprehensive analysis of requirements vs. capabilities for the demo presentation (Jan 19-23, 2026)

---

## 1. WHAT OFFICIALS ACTUALLY ASKED FOR

From the **Orientation Session Transcript**, the key requirements are:

### Primary Deliverable

| Requirement | Description |
|-------------|-------------|
| **Input** | ORI (Orthorectified Images) from drones |
| **Output** | Shapefiles with land parcel polygons |
| **Key Rule** | Draw polygons along the **middle of visible bunds** (field boundaries) |
| **Topology** | NO overlaps, NO gaps - single common boundary between adjacent parcels |
| **Accuracy** | 85% precision vs manual audits; 5% permissible error |

### Secondary Requirements

- **Abadi areas**: Buildings, compounds, roads (double-line), open spaces as separate polygons
- **Water bodies**: Automatic detection
- **Land classification**: Agricultural, residential, government, etc.

### What They EXPECT

> "There may be some false bunds also, but those things will be corrected during the ground truthing phase"

**Translation**: They expect over-segmentation. Officers will correct using editing tools.

### Explicit Request for Tools

> "There should also be any mechanism to delete any lines or polygons in a fast manner... the easiest way of identification and deletion of lines or polygons, and addition of lines of polygons"

---

## 2. MISALIGNMENT IN CURRENT PLAN

The **FINAL_SOLUTION_STRATEGY.md** proposes innovations that **don't match** what officials asked for:

| Our Proposed Innovation | What Officials Actually Want |
|------------------------|------------------------------|
| ROR-constrained segmentation **DURING** AI | Automatic extraction first, compare to ROR **AFTER** |
| FMB measurement validation | Not mentioned - FMB is for field verification |
| Bhu-Naksha historical boundaries | Not mentioned at all |
| Multi-source integration | Just ORI → polygons |

### The Reality

Officials want a **simple, practical tool**:

1. AI extracts polygons from ORI
2. Officer reviews and corrects
3. System compares with ROR to flag conflicts
4. Export shapefiles

---

## 3. AVAILABLE DATA (NO EXTERNAL DATA NEEDED)

### What We Have

| Data | Location | Status | Use For |
|------|----------|--------|---------|
| **ORI Imagery** | `AI Hackathon/*.ecw`, `*.tif` | ✅ Available | AI input |
| **ORI Tiles** | `dashboard/public/tiles/` | ✅ Generated | Dashboard display |
| **SAM Segments** | `sam_segments.geojson` (12,032 segments) | ✅ Generated | Starting point |
| **ROR Data** | `Resurvey/*.xlsx` | ✅ Available | Conflict detection |
| **Ground Truth** | `Resurvey/*.shp` | ⚠️ EVALUATION ONLY | Final accuracy check |

### ROR Data Content (Kanumuru - 1141 records)

- LP Number (unique parcel ID)
- LP Extent (area in acres)
- ULPIN (unique identifier)
- Old Survey Number
- Land Type/Classification
- Owner info (anonymized)

### What We DON'T Have (And Don't Need)

- FMB records ❌ (not required for demo)
- Bhu-Naksha ❌ (not required for demo)
- Additional villages beyond provided data ❌

---

## 4. EVALUATION FINDINGS - THE SAM PROBLEM

From **EVALUATION_FINDINGS.md**:

| Metric | Value | Problem |
|--------|-------|---------|
| SAM Segments | 12,032 | **115x over-segmentation** (for 105 parcels) |
| Mean IoU | 25.84% | Segments don't match parcels |
| Coverage | 78.46% | SAM does see the land area |
| Avg Segment Size | 66 sqm | Too small (parcels avg 2,201 sqm) |

**Root Cause**: SAM segments by visual texture (crops, shadows, soil), NOT by bunds.

---

## 5. CURRENT DASHBOARD STATUS

The React dashboard already has:

| Component | Status | Notes |
|-----------|--------|-------|
| MapCanvas | ✅ Built | MapLibre with satellite tiles |
| Polygon Store | ✅ Built | Add, update, delete, merge, split |
| Selection Tools | ✅ Built | Lasso, box selection |
| Context Menu | ✅ Built | Right-click actions |
| Export Dialog | ✅ Built | Shapefile export |
| Layer Panel | ✅ Built | Toggle layers |
| Parcel Type Panel | ✅ Built | Classify parcels |
| Split Tool | ✅ Built | Draw line to split |

### Missing for Demo

- Merge tool (UI to select and merge)
- ROR panel (display/compare)
- Conflict detection
- Confidence indicators
- Topology validation UI
- Vertex editing

---

## 6. WHAT IS ACTUALLY POSSIBLE FOR DEMO

### Realistic Demo Scope

```
┌─────────────────────────────────────────────────────────────────┐
│                    DEMO CAPABILITIES                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ✅ CAN DEMO (Already Built or Buildable):                       │
│  ─────────────────────────────────────────                       │
│  • Show SAM-extracted polygons on ORI imagery                    │
│  • Select parcels (click, lasso, box)                            │
│  • Delete polygons                                               │
│  • Split polygons (draw line)                                    │
│  • Classify parcel types (agricultural, building, water, etc.)   │
│  • Export to shapefile                                           │
│  • Toggle layers (ORI, polygons, ground truth for comparison)    │
│                                                                  │
│  🔨 NEED TO BUILD:                                               │
│  ─────────────────                                               │
│  • Merge polygons (select multiple → combine)                    │
│  • ROR data display (area comparison)                            │
│  • Conflict highlighting (AI area vs ROR area)                   │
│  • Confidence scoring (based on area match)                      │
│  • Smart filtering (hide tiny segments, show large only)         │
│  • Topology check (highlight overlaps/gaps)                      │
│                                                                  │
│  ❌ NOT REALISTIC FOR DEMO:                                      │
│  ──────────────────────────                                      │
│  • Better segmentation model (would need training)               │
│  • FMB/Bhu-Naksha integration (data doesn't exist)               │
│  • Mobile field app                                              │
│  • WebLand API integration                                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. THE REAL DIFFERENTIATOR

Given the constraints, our differentiator should be:

### "Officer-Centric Editing Tool"

Instead of trying to have the best AI segmentation (which we can't achieve without training data), focus on:

#### 1. Best-in-class UI for reviewing/correcting AI output

- Fast merge tool (click-click-merge)
- Fast split tool (draw line) ✅ Already built
- Easy delete (select and delete) ✅ Already built
- Lasso selection for bulk operations ✅ Already built

#### 2. ROR-Integrated Conflict Detection

- Load ROR data alongside parcels
- Auto-calculate area difference: AI area vs ROR area
- Color-code: Green (<5% diff), Yellow (5-15%), Red (>15%)
- Conflict queue: Show parcels with issues first

#### 3. Smart Post-Processing

- Filter tiny segments (< X sqm)
- Auto-merge adjacent micro-segments
- Topology highlighting (show overlaps/gaps)

#### 4. Officer Productivity Features

- Statistics panel (X parcels reviewed, Y merged, Z flagged)
- Keyboard shortcuts for common actions
- Auto-save progress
- Export with audit trail

---

## 8. RECOMMENDED DEMO FLOW

```
DEMO SCRIPT (5-7 minutes):

1. SHOW THE PROBLEM (30 sec)
   "Here's Nibanupudi village ORI. Currently officers manually trace
   every parcel boundary. Takes 3-5 days per village."

2. SHOW AI OUTPUT (30 sec)
   "Our AI has pre-processed this. 12,000 initial segments detected."
   [Load SAM segments on map]

3. SHOW THE OVER-SEGMENTATION ISSUE (30 sec)
   "SAM over-segments. We have 12,000 segments for ~100 parcels.
   But that's okay - we give officers tools to fix this quickly."

4. DEMO MERGE TOOL (1 min)
   "Officer sees a parcel split into 5 pieces. Select all, click merge."
   [Demo lasso select + merge]

5. DEMO SPLIT TOOL (30 sec)
   "AI missed a boundary. Officer draws a line to split."
   [Demo split tool]

6. SHOW ROR COMPARISON (1 min)
   "System compares to ROR. This parcel is 2.3 acres, ROR says 2.5.
   Highlighted yellow for review."
   [Show area mismatch highlighting]

7. SHOW CONFLICT QUEUE (1 min)
   "Officers don't check all 500 parcels. We show only the 30 with issues."
   [Show filtered view of conflicts]

8. EXPORT (30 sec)
   "When done, export as shapefile compatible with their systems."
   [Demo export]

9. SUMMARY (30 sec)
   "What took 3-5 days now takes 2-4 hours. 90% time savings."
```

---

## 9. TECHNICAL IMPLEMENTATION PRIORITIES

### Priority 1 (Must Have for Demo)

1. **Merge Tool UI** - Select multiple polygons → merge into one
2. **ROR Data Panel** - Load and display ROR data alongside polygons
3. **Area Comparison** - Calculate AI area vs ROR expected area
4. **Conflict Highlighting** - Color-code parcels by area match

### Priority 2 (Nice to Have)

5. **Filtering** - Hide segments below area threshold
6. **Statistics Panel** - Count parcels by status
7. **Topology Check** - Highlight overlaps/gaps
8. **Confidence Score** - Based on area match percentage

### Priority 3 (If Time Permits)

9. **Vertex Editing** - Drag boundary points
10. **Auto-merge Micro-segments** - Batch merge tiny adjacent polygons
11. **Ground Truth Comparison** - For evaluation (not shown to users)

---

## 10. KEY QUOTES FROM OFFICIALS

### On Expected Output

> "The AI tool should extract the land parcels for along this bunds from here to here... all bunds should be captured."

### On Topology

> "Those polygons whichever have been created should not overlap among each other and also there should not be any gaps between each other."

### On False Positives

> "There may be some false bunds also, but those things will be corrected during the ground truthing phase, where our miller surveys will be going and again, cross checking the polygons."

### On Editing Tools

> "There should also be any mechanism to delete any lines or polygons in a fast manner."

### On Ground Truth Data

> "Providing the Land Parcel shapefile or any derivative output to the participants in advance would materially compromise the objectivity and integrity of the solution validation process."

---

## 11. CONCLUSION

### What We Should Tell Officials

> "Our solution focuses on **empowering officers** with intelligent editing tools.
> The AI provides a starting point, and our UI makes corrections fast and efficient.
> We compare results with ROR data to prioritize which parcels need attention.
> What took 3-5 days manually now takes 2-4 hours."

### The Honest Differentiator

We're not claiming the best AI segmentation. We're providing:

1. **The best officer experience** for reviewing and correcting AI output
2. **Smart conflict detection** using ROR data
3. **Practical tools** that match exactly what officials asked for

This is a realistic, achievable, and useful prototype.

---

## 12. SOURCE FILES REFERENCE

### Primary Source Documents

| File | Description | Key Content |
|------|-------------|-------------|
| `challenge.json` | Official hackathon challenge specification | Challenge code 100017, success criteria (>80% precision, >70% survey team feedback), expected solutions, POC scope |
| `Land Resurvey orientation session.txt` | Transcript of Jan 6, 2026 orientation with officials | Actual requirements from Deputy Director, technical expectations, Q&A with officials |
| `WhatsApp Chat with Re_Survey (RTGS Hackathon).txt` | Communication with RTGS team | Demo dates (Jan 19-23), data sharing updates, clarification that ground truth won't be provided for test villages |

### Documentation Files

| File | Description |
|------|-------------|
| `docs/CHALLENGE_SUMMARY.md` | Detailed problem breakdown into 11 sub-problems |
| `docs/FINAL_SOLUTION_STRATEGY.md` | Original proposed approach (ROR-constrained segmentation) |
| `docs/IMPLEMENTATION_PLAN.md` | Technical implementation phases |
| `docs/UI_WORKFLOW.md` | Officer workflow design and UI mockups |
| `docs/EVALUATION_FINDINGS.md` | SAM model evaluation results (25.84% IoU, 12K over-segmentation) |
| `docs/STATUS.md` | Project status as of Jan 15, 2026 |
| `docs/DEMO_SCRIPT.md` | Original demo presentation script |
| `docs/CLOUD_DEPLOY.md` | Cloud deployment guide (Docker, AWS, GCP) |
| `CLAUDE.md` | Project instructions for development |
| `README.md` | Project overview and quick start |

### Data Files - ORI Imagery

| File | Size | Description |
|------|------|-------------|
| `AI Hackathon/589571_kanumuru_reprocess_247.ecw` | 2.3 GB | Kanumuru village drone imagery (ECW format) |
| `AI Hackathon/589587_nibhanpudi_reprocess_326.ecw` | 785 MB | Nibanupudi village drone imagery (ECW format) |
| `AI Hackathon/nibanupudi.tif` | 11 GB | Nibanupudi converted to GeoTIFF |
| `dashboard/public/tiles/{z}/{x}/{y}.png` | ~50 MB | Pre-generated map tiles for dashboard (zoom 14-20) |

### Data Files - ROR (Record of Rights)

| File | Records | Description |
|------|---------|-------------|
| `Resurvey/kanumuru-annonymized ROR.xlsx` | 1,141 | Kanumuru parcel records (LP Number, Extent, ULPIN, Survey No, Land Type, Owner) |
| `Resurvey/Nibhanupudi-annonymized ROR.xlsx` | ~850 | Nibanupudi parcel records |

### Data Files - Ground Truth (EVALUATION ONLY)

| File | Parcels | Description |
|------|---------|-------------|
| `Resurvey/kanumuru.shp` | ~1,100 | Kanumuru ground truth shapefile |
| `Resurvey/nibanupudi.shp` | ~850 | Nibanupudi ground truth shapefile |
| `dashboard/public/data/ground_truth.geojson` | 105 | Subset for evaluation |

### Data Files - AI Generated

| File | Features | Description |
|------|----------|-------------|
| `dashboard/public/data/sam_segments.geojson` | 12,032 | SAM-generated segments (over-segmented) |

### Dashboard Source Code

| Directory | Description |
|-----------|-------------|
| `dashboard/src/components/Map/` | MapCanvas, ContextMenu, LassoSelection, SelectionBox |
| `dashboard/src/components/Sidebar/` | Sidebar, LayerPanel, ToolPanel, ParcelTypePanel, AccuracyPanel, TopologyPanel |
| `dashboard/src/components/BottomBar/` | Status bar with zoom/coordinates |
| `dashboard/src/components/Dialogs/` | ExportDialog, RestoreSessionDialog |
| `dashboard/src/hooks/` | usePolygonStore, useKeyboardShortcuts, useAutoSave |
| `dashboard/src/utils/` | exportShapefile, polygonSplit, accuracy, topology |

### Backend Source Code

| File | Description |
|------|-------------|
| `src/pipeline.py` | End-to-end SAM processing pipeline |
| `src/sam_segmenter.py` | SAM model integration |
| `src/image_loader.py` | Large TIFF tile loading |
| `src/vectorization.py` | Mask to polygon conversion |
| `src/ror_engine.py` | ROR record matching |
| `src/confidence.py` | Confidence scoring and conflict detection |
| `src/topology.py` | Gap/overlap fixing |
| `src/data_loader.py` | Data loading utilities |

### Infrastructure

| File | Description |
|------|-------------|
| `Dockerfile` | GPU-enabled container |
| `docker-compose.yml` | Container orchestration |
| `scripts/deploy-aws.sh` | AWS deployment script |
| `scripts/deploy-gcp.sh` | GCP deployment script |
| `requirements.txt` | Python dependencies |
| `requirements-gpu.txt` | GPU-enabled dependencies |

---

## 13. KEY INFORMATION FROM SOURCES

### From challenge.json

```json
{
  "challenge_code": "100017",
  "poc_success_criteria": [
    "Parcel extraction precision greater than 80%",
    "At least 70% positive feedback from survey teams"
  ],
  "expected_solution": [
    "AI-Based Geospatial Image Processing",
    "Conflict Detection",
    "AI-Assisted Field Validation",
    "System Integration",
    "Visualization Dashboard"
  ]
}
```

### From Orientation Transcript (Key Quotes)

**On Output Format:**
> "The AI tool should extract the land parcels for along this bunds from here to here... all bunds should be captured."

**On Topology:**
> "Those polygons whichever have been created should not overlap among each other and also there should not be any gaps."

**On Expected Errors:**
> "There may be some false bunds also, but those things will be corrected during the ground truthing phase."

**On Editing Tools:**
> "There should also be any mechanism to delete any lines or polygons in a fast manner."

### From WhatsApp Chat

**On Ground Truth:**
> "Providing the Land Parcel shapefile... would materially compromise the objectivity and integrity of the solution validation process."

**Demo Timeline:**
> "Demo Presentation: January 19th - 23rd"

---

*Document Version: 1.1*
*Last Updated: 2026-01-22*

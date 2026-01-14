# Challenge Summary: Land Re-Survey AI Tools (Andhra Pradesh)

**Challenge Code:** 100017
**Challenge Name:** Land Re-Survey
**Department:** Lands & Revenue Department, Government of Andhra Pradesh

---

## What It's About

The Government of Andhra Pradesh is conducting a massive land resurvey to create dispute-free land records. Currently, the process of extracting land parcel boundaries from drone/aerial imagery is **manual and time-consuming**. This hackathon seeks AI solutions to automate this workflow.

---

## Core Problem to Solve

**Input:** Orthorectified Images (ORI) captured by drones/aircraft
**Output:** Shapefiles with polygons for all land parcels, linked to existing records

---

## Expected AI Solutions

| Component | Description |
|-----------|-------------|
| **Parcel Extraction** | Automatically detect and draw polygon boundaries along visible field bunds (boundaries) in agricultural land |
| **Abadi/Gramakantam Areas** | Extract building footprints, property boundaries, roads (as double-line polygons), compounds, and open spaces |
| **Land Use Classification** | Classify each parcel by type (agricultural, residential, government, water body, etc.) |
| **Conflict Detection** | Detect discrepancies between WebLand 1.0 textual records and resurvey-derived parcel areas |
| **Topology Validation** | Ensure no overlapping polygons and no gaps between adjacent parcels |
| **Water Body Detection** | Automatically identify water bodies |
| **ROR/FMB Alignment** | Link generated parcels to existing Record of Rights and FMB control points |
| **Field Validation Tool** | Mobile-ready tools for inspectors to verify boundaries with audit trails |
| **WebLand 1.0 Integration** | API/batch export compatible with existing systems |
| **Dashboard** | Visualization of conflicts, verification status, and survey progress |

---

## Technical Requirements

- **Output Format:** Shapefiles (GIS format)
- **Topology Rules:** Adjacent polygons must share a common boundary (no overlaps, no gaps)
- **Accuracy Target:** >80% precision vs. expert-labeled references
- **Permissible Error:** 5% deviation from ground truth is acceptable
- **Multi-spectral Support:** Leverage multi-spectral imagery for classification

---

## Data Provided

1. **ORI images** for villages (Kanumuru, Nibanupudi + 2-3 more)
2. **Sample shapefiles** (ground truth for training) for initial villages
3. **ROR (Record of Rights)** data, parcel IDs, FMB records
4. **Multi-spectral drone/aerial imagery** for feature extraction
5. **Unique parcel identifiers** for validation and ground-truth comparison

---

## Key Timeline

| Milestone | Date |
|-----------|------|
| Launch Date | 20/10/2025 |
| Submission Deadline | 08/12/2025 |
| Shortlisting | 11/12/2025 |
| Presentation | 15/12/2025 |
| Winner Announcement | 18/12/2025 |
| POC Deployment | 31/12/2025 |
| **Demo Presentation** | January 19-23, 2026 |

---

## POC Scope & Success Criteria

**Scope:** One mandal with varied land types, involving 3 survey inspector units and 10 field teams

**Success Criteria:**
- Parcel extraction precision > 80% relative to expert-labeled references
- At least 70% positive feedback from survey teams during field testing

---

## Important Notes from Orientation Session

1. The AI should draw lines along the **middle of visible bunds**
2. **False bunds** (internal divisions that aren't actual boundaries) may be detected - field teams will correct these later
3. For Abadi areas: need separate polygons for **roads, buildings, compounds, open spaces**
4. Land encroachment detection was discussed but is **not confirmed** as part of this scope
5. Final shapefiles **will not be provided** for new villages - participants must generate them (that's the test)
6. Solution must comply with state data protection guidelines for geospatial and citizen-linked datasets

---

## Expected Outcomes

- Accelerated generation of verified parcel maps for publication and objection handling
- Significant reduction in manual delineation and field survey turnaround time
- Early detection and prioritization of high-risk parcels to minimize litigation and re-surveys
- Standardized, AI-assisted validation processes improving transparency and auditability

---

# Problem Breakdown

## Problem 1: Agricultural Land Parcel Boundary Detection

**Input:** Orthorectified Image (ORI) of agricultural land
**Output:** Polygon boundaries along field bunds (earthen boundaries between fields)

**Key Challenges:**
- Detecting subtle bund lines in varying terrain
- Drawing along the middle of the bund
- Handling partial/broken bunds
- Distinguishing actual boundaries from internal farm divisions (false bunds)

---

## Problem 2: Abadi (Settlement) Area Segmentation

**Input:** ORI of Gramakantam/Abadi (habitation) areas
**Output:** Multiple polygon layers:
- Outer boundary of the settlement
- Individual property/compound boundaries
- Building footprints
- Road polygons (double-line representation)
- Open spaces

**Key Challenges:**
- Dense, irregular layouts
- Distinguishing buildings from compounds
- Continuous road network extraction

---

## Problem 3: Water Body Detection

**Input:** ORI containing water features
**Output:** Polygons for ponds, tanks, canals, rivers

**Key Challenges:**
- Varying water colors (seasonal changes)
- Distinguishing from shadows or dark soil

---

## Problem 4: Land Use Classification

**Input:** ORI + extracted parcels
**Output:** Classification label for each parcel:
- Agricultural (crop type if possible)
- Residential/Habitation
- Government land
- Water body
- Barren/Waste land
- Road/Infrastructure

**Key Challenges:**
- Multi-spectral image analysis
- Seasonal variations in appearance

---

## Problem 5: Vectorization & Shapefile Generation

**Input:** Raster segmentation masks from AI models
**Output:** Clean vector shapefiles (.shp) with proper geometry

**Key Challenges:**
- Raster-to-vector conversion with smooth boundaries
- Simplifying jagged edges without losing accuracy
- Proper coordinate reference system (CRS) alignment

---

## Problem 6: Topology Validation & Correction

**Input:** Generated polygon shapefiles
**Output:** Validated polygons with:
- No overlaps between adjacent parcels
- No gaps between adjacent parcels
- Shared boundaries (common edge between neighbors)

**Key Challenges:**
- Automatic gap/overlap detection
- Automatic correction/snapping
- Maintaining geometric accuracy

---

## Problem 7: ROR Data Matching & Conflict Detection

**Input:**
- Generated parcel polygons with calculated areas
- Existing ROR data (textual records from WebLand 1.0)
- FMB records

**Output:**
- Parcel-to-ROR linkage (correlation)
- Conflict flags:
  - Area mismatch (generated vs. recorded)
  - Boundary discrepancy
  - Missing parcels
  - Extra parcels
- Correlation statement (old survey number → new LP number)

**Key Challenges:**
- Matching without exact spatial alignment
- Handling split/merged parcels
- Threshold-based mismatch detection (5% tolerance)

---

## Problem 8: Risk Scoring & Prioritization

**Input:** Conflict detection results + parcel metadata
**Output:** Risk score per parcel for field verification priority
- High risk: Large area mismatch, multiple conflicts
- Medium risk: Minor discrepancies
- Low risk: Clean match

**Key Challenges:**
- Defining appropriate thresholds
- Weighting different conflict types

---

## Problem 9: WebLand 1.0 Integration

**Input:** Validated parcel data
**Output:** API/batch export compatible with WebLand 1.0
- Secure data transfer
- Format compliance
- Audit logging

**Key Challenges:**
- Understanding WebLand 1.0 schema
- API authentication and security

---

## Problem 10: Field Validation Mobile Tool

**Input:** Generated parcel maps + ORI imagery
**Output:** Mobile interface for field inspectors to:
- View parcels overlaid on imagery
- Mark corrections/feedback
- Prioritize areas needing field verification (risk-based)
- Log audit trails
- GPS navigation to parcels

**Key Challenges:**
- Offline capability
- GPS integration for field navigation
- Easy edit/annotation interface
- Sync with central system

---

## Problem 11: Dashboard & Visualization

**Input:** All generated data + validation status
**Output:** Web dashboard showing:
- Survey progress per village/mandal
- Conflict hotspots
- Verification status
- ROR mismatch reports
- Export capabilities

**Key Challenges:**
- Handling large geospatial datasets
- Real-time updates
- User-friendly interface

---

## Dependency Graph

```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  Problem 1   │  │  Problem 2   │  │  Problem 3   │
│ Agri Parcels │  │ Abadi Areas  │  │ Water Bodies │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       │                 │                 │
       └────────┬────────┴────────┬────────┘
                │                 │
                ▼                 ▼
       ┌──────────────┐  ┌──────────────┐
       │  Problem 5   │  │  Problem 4   │
       │ Vectorization│  │  Land Use    │
       └──────┬───────┘  │Classification│
              │          └──────┬───────┘
              │                 │
              ▼                 │
       ┌──────────────┐         │
       │  Problem 6   │◄────────┘
       │  Topology    │
       └──────┬───────┘
              │
              ▼
       ┌──────────────┐
       │  Problem 7   │◄──── ROR/FMB Data
       │ ROR Matching │
       │ & Conflicts  │
       └──────┬───────┘
              │
              ▼
       ┌──────────────┐
       │  Problem 8   │
       │ Risk Scoring │
       └──────┬───────┘
              │
     ┌────────┼────────┐
     ▼        ▼        ▼
┌─────────┐┌─────────┐┌─────────┐
│Problem 9││Problem10││Problem11│
│ WebLand ││ Mobile  ││Dashboard│
│   API   ││  Tool   ││         │
└─────────┘└─────────┘└─────────┘
```

---

## Priority Matrix (MVP for Demo)

| Priority | Problem | Reason |
|----------|---------|--------|
| **P0** | 1 - Agri Parcels | Core deliverable, largest volume |
| **P0** | 5 - Vectorization | Required for any output |
| **P0** | 6 - Topology | Required for valid output |
| **P0** | 7 - ROR Matching & Conflicts | Explicitly required in challenge |
| **P1** | 4 - Land Use Classification | Mentioned in challenge requirements |
| **P1** | 2 - Abadi Areas | Second major use case (Swamitva) |
| **P1** | 3 - Water Bodies | Part of classification |
| **P1** | 8 - Risk Scoring | For prioritization of field work |
| **P2** | 11 - Dashboard | High demo value |
| **P2** | 10 - Mobile Tool | High demo value |
| **P3** | 9 - WebLand API | Post-POC integration |

---

## Data Files Reference

| File | Description |
|------|-------------|
| `challenge.json` | Official challenge specification |
| `Land Resurvey orientation session.txt` | Transcript of orientation session |
| `WhatsApp Chat with Re_Survey (RTGS Hackathon).txt` | Team communication and updates |
| `Resurvey/` | Sample data folder (Kanumuru, Nibanupudi) |
| `Sample2/` | Additional sample data |

---

## Glossary

| Term | Definition |
|------|------------|
| **ORI** | Orthorectified Image - geometrically corrected aerial/drone image |
| **ROR** | Record of Rights - textual land ownership records |
| **FMB** | Field Measurement Book - traditional survey records with measurements |
| **WebLand 1.0** | Existing AP government land records database |
| **LP Number** | Land Parcel Number - new identifier assigned during resurvey |
| **Bund** | Earthen boundary/ridge between agricultural fields |
| **Abadi/Gramakantam** | Habitation/settlement area within a village |
| **CORS** | Continuously Operating Reference Station - GPS base station network |
| **Swamitva** | Government scheme for property cards in rural habitations |
| **Correlation Statement** | Document mapping old survey numbers to new LP numbers |

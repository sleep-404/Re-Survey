# Final Solution Strategy: Land Re-Survey AI System

**Team:** Re-Survey
**Challenge:** 100017 - Land Re-Survey
**Version:** 2.0 (January 2025)

---

## Executive Summary

We propose **"BoundaryAI"** - an intelligent land parcel extraction system that goes beyond simple image segmentation by combining:
1. **Multi-source data integration** (ORI + ROR + FMB + Bhu-Naksha)
2. **Uncertainty-aware processing** with intelligent work routing
3. **ROR-constrained optimization** using existing records as priors

**Key Differentiator:** While competitors will use SAM on ORI images and compare results with ROR afterward, we use ROR/FMB data DURING segmentation and provide confidence scores that prioritize human effort where it matters most.

**Data Requirement:** Uses ONLY provided data and existing AP government portal data - no external satellite/third-party data needed.

---

## Data Sources (All Within Scope)

| Data Source | Type | Availability | Usage |
|-------------|------|--------------|-------|
| **ORI Images** | Imagery | Provided by department | Primary input for AI |
| **ROR Data** | Textual records | WebLand 1.0 portal | Parcel count, areas, owners |
| **FMB Records** | Measurements | Department records | Boundary measurements |
| **Bhu-Naksha** | Old cadastral maps | bhunaksha.ap.nic.in | Historical boundaries |
| **Sample Shapefiles** | Ground truth | Provided (Kanumuru, etc.) | Training/validation |
| **Multi-spectral ORI** | Imagery | If provided | Water/vegetation detection |

---

## Part 1: Core Problems & Solutions

### Problem 1: Agricultural Land Parcel Boundary Detection (P0 - CRITICAL)

**Challenge:** Detect field bunds (earthen ridges) in ORI images and draw polygons along their center.

**Standard Approach (What Everyone Will Do):**
```
ORI Image → SAM Segmentation → Vectorize → Compare with ROR → Output
```

**Our Approach (Record-Guided Segmentation):**
```
┌─────────────────────────────────────────────────────────────┐
│              MULTI-SOURCE INTEGRATION                        │
├─────────────┬─────────────┬─────────────┬──────────────────┤
│ ORI (Drone) │ ROR Data    │ FMB Records │ Bhu-Naksha       │
│ High-res    │ Parcel info │ Measurements│ Old boundaries   │
│ imagery     │ & areas     │ & distances │ as reference     │
└──────┬──────┴──────┬──────┴──────┬──────┴────────┬─────────┘
       │             │             │               │
       │             └──────┬──────┴───────────────┘
       │                    │
       │             ┌──────▼──────┐
       │             │   PRIOR     │
       │             │ CONSTRAINTS │
       │             │ (count,area)│
       │             └──────┬──────┘
       │                    │
       ▼                    ▼
┌─────────────┐      ┌─────────────┐
│ Edge-First  │      │ Region      │
│ Detection   │      │ Segmentation│
│ (bund lines)│      │ (SAM)       │
└──────┬──────┘      └──────┬──────┘
       │                    │
       └────────┬───────────┘
                │
         ┌──────▼──────┐
         │  CONSENSUS  │
         │   MERGE     │
         └──────┬──────┘
                │
         ┌──────▼──────┐
         │ ROR-AWARE   │
         │ OPTIMIZATION│
         │ (fit to     │
         │  constraints)│
         └──────┬──────┘
                │
         ┌──────▼──────┐
         │  CONFIDENCE │
         │   SCORING   │
         └─────────────┘
```

**Technical Implementation:**

| Component | Tool | Purpose |
|-----------|------|---------|
| Primary Segmentation | SamGeo (HQ-SAM) | Zero-shot field detection from ORI |
| Edge Detection | Canny/HED on ORI | Detect bund lines directly |
| Constraint Engine | Custom Python | Apply ROR count/area priors |
| Historical Reference | Bhu-Naksha overlay | Guide uncertain boundaries |
| Topology | Mapshaper | Gap/overlap fixing |

**Innovation:** Boundary detection is GUIDED by known information:
- ROR says 47 parcels → optimize for ~47 segments
- FMB says parcel is 2.3 acres → validate area
- Bhu-Naksha shows old boundary → use as reference for uncertain edges

---

### Problem 2: Abadi (Settlement) Area Segmentation (P1)

**Challenge:** Extract buildings, roads, compounds, open spaces in habitation areas.

**Solution (Using ORI + ROR):**

| Feature | Detection Method | Validation |
|---------|------------------|------------|
| Buildings | SAM with "building" prompts on ORI | ROR land type = residential |
| Roads | SAM with "road" prompts + linear detection | Connectivity analysis |
| Compounds | Edge detection for walls/fences | Encloses buildings |
| Open spaces | Remaining area after above | ROR land type tags |

**Implementation:**
```python
from samgeo import SamGeo

# Building extraction from ORI
sam = SamGeo(model_type="vit_h")
sam.generate(
    abadi_ori_image,
    building_mask,
    text_prompt="buildings, houses, structures"
)

# Road extraction
sam.generate(
    abadi_ori_image,
    road_mask,
    text_prompt="roads, paths, streets"
)
```

---

### Problem 3: Water Body Detection (P1)

**Challenge:** Identify ponds, tanks, canals, rivers.

**Solution (Using ORI):**

**Option A: If multi-spectral ORI available:**
```python
# Calculate water index from multi-spectral bands
NDWI = (Green - NIR) / (Green + NIR)
water_mask = NDWI > 0.3
```

**Option B: Using RGB ORI:**
```python
# SAM with water prompts
sam.generate(
    ori_image,
    water_mask,
    text_prompt="water bodies, ponds, tanks, canals"
)

# OR: Color-based detection (water appears dark blue/green)
water_mask = detect_water_by_color(ori_image,
    hue_range=(90, 130),  # Blue-green hues
    saturation_min=0.2
)
```

**Validation:** Cross-check with ROR records tagged as "water body" or "tank".

---

### Problem 4: Land Use Classification (P1)

**Challenge:** Classify each parcel (agricultural, residential, government, water, etc.)

**Solution (ROR-First Approach):**

The ROR data already contains land type information. Use this as primary classification:

```python
def classify_parcel(parcel, ror_record):
    # Primary: Use ROR land type
    if ror_record:
        return ror_record['land_type']  # Wet, Dry, Residential, etc.

    # Fallback: Visual analysis of ORI
    visual_features = analyze_ori(parcel, ori_image)

    if visual_features['has_buildings']:
        return 'Residential'
    elif visual_features['has_water']:
        return 'Water Body'
    elif visual_features['has_bunds']:
        return 'Agricultural'
    else:
        return 'Barren/Other'
```

**Land Type Mapping (from ROR):**

| ROR Code | Land Type | Visual Confirmation |
|----------|-----------|---------------------|
| Wet | Irrigated agricultural | Bunds visible, green |
| Dry | Rain-fed agricultural | Bunds visible, brown |
| Jareebu | Garden/Orchard | Tree patterns |
| Abadi | Residential | Buildings visible |
| Poramboke | Government | Large, uniform area |

---

### Problem 5: Vectorization & Shapefile Generation (P0)

**Challenge:** Convert raster masks to clean vector shapefiles.

**Solution:**
```python
import rasterio
from rasterio import features
import geopandas as gpd
from shapely.geometry import shape

def vectorize_mask(mask_path, output_path, simplify_tolerance=0.5):
    with rasterio.open(mask_path) as src:
        mask = src.read(1)
        results = features.shapes(mask, transform=src.transform)

        geoms = []
        values = []
        for geom, val in results:
            if val > 0:  # Skip background
                polygon = shape(geom)
                # Simplify to reduce jaggedness
                polygon = polygon.simplify(simplify_tolerance)
                geoms.append(polygon)
                values.append(val)

        gdf = gpd.GeoDataFrame({
            'parcel_id': range(len(geoms)),
            'geometry': geoms
        }, crs=src.crs)

        gdf.to_file(output_path)
    return gdf
```

---

### Problem 6: Topology Validation & Correction (P0)

**Challenge:** No overlaps, no gaps, shared boundaries.

**Solution:**
```bash
# Mapshaper - single command fixes all topology issues
mapshaper parcels.shp \
    -clean gap-fill-area=10 \
    -simplify 0.5 keep-shapes \
    -o clean_parcels.shp
```

**Python validation:**
```python
from shapely.validation import make_valid
from shapely.ops import unary_union

def validate_topology(gdf):
    issues = []

    # Check for invalid geometries
    for idx, row in gdf.iterrows():
        if not row.geometry.is_valid:
            gdf.at[idx, 'geometry'] = make_valid(row.geometry)
            issues.append(f"Fixed invalid geometry: parcel {idx}")

    # Check for overlaps
    for i, row1 in gdf.iterrows():
        for j, row2 in gdf.iterrows():
            if i < j and row1.geometry.intersects(row2.geometry):
                overlap_area = row1.geometry.intersection(row2.geometry).area
                if overlap_area > 1:  # More than 1 sq meter
                    issues.append(f"Overlap: parcels {i} and {j}")

    return gdf, issues
```

---

### Problem 7: ROR Data Matching & Conflict Detection (P0 - CRITICAL)

**Challenge:** Link generated parcels to ROR records, flag mismatches.

**Standard Approach:**
```
Generate parcels → Calculate areas → Compare with ROR → Flag differences
```

**Our Approach (ROR-Constrained):**
```
ROR data (count, areas) → GUIDE segmentation → Generate parcels → Validate
```

**Implementation:**
```python
def ror_constrained_segmentation(ori_image, ror_data, village_boundary):
    """
    Use ROR records to guide and constrain segmentation
    """
    # Extract ROR constraints
    expected_count = len(ror_data)
    expected_areas = [r['extent_acres'] * 4046.86 for r in ror_data]  # Convert to sq meters
    total_expected_area = sum(expected_areas)

    # Initial segmentation with SAM
    raw_segments = samgeo_segment(ori_image, village_boundary)

    # Constraint 1: Count adjustment
    if len(raw_segments) > expected_count * 1.3:
        # Too many segments - merge small/spurious ones
        raw_segments = merge_segments_by_area(
            raw_segments,
            min_area=min(expected_areas) * 0.5
        )

    if len(raw_segments) < expected_count * 0.7:
        # Too few segments - look for missed boundaries
        raw_segments = split_by_edge_detection(
            raw_segments,
            ori_image,
            target_count=expected_count
        )

    # Constraint 2: Area optimization
    # Try to match segments to ROR records by area similarity
    matched = match_segments_to_ror(raw_segments, ror_data)

    # Constraint 3: Use Bhu-Naksha for uncertain boundaries
    for seg in matched:
        if seg.confidence < 0.7:
            seg = refine_with_bhunaksha(seg, bhunaksha_boundary)

    return matched

def match_segments_to_ror(segments, ror_records):
    """
    Match generated segments to ROR records using Hungarian algorithm
    """
    from scipy.optimize import linear_sum_assignment

    # Build cost matrix based on area difference
    cost_matrix = np.zeros((len(segments), len(ror_records)))
    for i, seg in enumerate(segments):
        for j, ror in enumerate(ror_records):
            area_diff = abs(seg.area - ror['extent_sqm']) / ror['extent_sqm']
            cost_matrix[i, j] = area_diff

    # Find optimal assignment
    row_ind, col_ind = linear_sum_assignment(cost_matrix)

    # Create matched pairs
    matched = []
    for i, j in zip(row_ind, col_ind):
        segments[i].ror_record = ror_records[j]
        segments[i].area_mismatch = cost_matrix[i, j]
        matched.append(segments[i])

    return matched
```

**Conflict Detection:**
```python
def detect_conflicts(matched_parcels):
    conflicts = []

    for parcel in matched_parcels:
        # Area mismatch
        if parcel.area_mismatch > 0.20:
            conflicts.append({
                'parcel_id': parcel.id,
                'type': 'AREA_MISMATCH_HIGH',
                'severity': 'HIGH',
                'generated_area': parcel.area,
                'ror_area': parcel.ror_record['extent_sqm'],
                'difference_pct': parcel.area_mismatch * 100
            })
        elif parcel.area_mismatch > 0.05:
            conflicts.append({
                'parcel_id': parcel.id,
                'type': 'AREA_MISMATCH_MEDIUM',
                'severity': 'MEDIUM',
                'difference_pct': parcel.area_mismatch * 100
            })

        # Missing ROR link
        if parcel.ror_record is None:
            conflicts.append({
                'parcel_id': parcel.id,
                'type': 'NO_ROR_MATCH',
                'severity': 'HIGH'
            })

        # FMB measurement mismatch
        if parcel.fmb_record:
            if not validate_fmb_measurements(parcel, parcel.fmb_record):
                conflicts.append({
                    'parcel_id': parcel.id,
                    'type': 'FMB_MISMATCH',
                    'severity': 'MEDIUM'
                })

    return conflicts
```

---

### Problem 8: Risk Scoring & Prioritization (P1)

**Challenge:** Prioritize field verification for high-risk parcels.

**Our Innovation - Uncertainty-Based Routing:**

```python
def calculate_parcel_confidence(parcel):
    """
    Multi-factor confidence scoring using ONLY provided/portal data
    """

    confidence_factors = {
        # AI model confidence (from SAM)
        'segmentation_score': parcel.sam_confidence,

        # ROR alignment
        'area_match': 1.0 - min(parcel.area_mismatch, 1.0),
        'has_ror_link': 1.0 if parcel.ror_record else 0.0,

        # FMB alignment
        'fmb_match': parcel.fmb_alignment_score if parcel.fmb_record else 0.5,

        # Bhu-Naksha alignment
        'bhunaksha_match': parcel.bhunaksha_overlap_score,

        # Visual clarity (from ORI analysis)
        'boundary_clarity': parcel.edge_gradient_score,
        'bund_visibility': parcel.bund_detection_score,

        # Village-level consistency
        'count_consistency': parcel.village_count_ratio  # actual/expected
    }

    # Weighted combination
    weights = {
        'segmentation_score': 0.15,
        'area_match': 0.25,           # High weight - ROR is authoritative
        'has_ror_link': 0.10,
        'fmb_match': 0.15,
        'bhunaksha_match': 0.10,
        'boundary_clarity': 0.10,
        'bund_visibility': 0.10,
        'count_consistency': 0.05
    }

    confidence = sum(
        confidence_factors[k] * weights[k]
        for k in confidence_factors
    )

    return confidence

def route_for_review(parcel):
    """
    Route parcels based on confidence score
    """
    confidence = calculate_parcel_confidence(parcel)

    if confidence > 0.85:
        return 'AUTO_APPROVE'       # ~60% of parcels - clear boundaries, good ROR match
    elif confidence > 0.60:
        return 'DESKTOP_REVIEW'     # ~25% of parcels - minor issues, quick check
    else:
        return 'FIELD_VERIFICATION' # ~15% of parcels - needs ground truthing

def prioritize_field_work(parcels):
    """
    Sort parcels for field verification by priority
    """
    field_parcels = [p for p in parcels if route_for_review(p) == 'FIELD_VERIFICATION']

    # Sort by: severity of issues, then by confidence (lowest first)
    field_parcels.sort(key=lambda p: (
        -len(p.conflicts),           # More conflicts = higher priority
        calculate_parcel_confidence(p)  # Lower confidence = higher priority
    ))

    return field_parcels
```

**Impact:**
- **Auto-approve ~60%** of parcels → Significant time savings
- **Desktop review ~25%** → Quick validation by supervisor
- **Field verification ~15%** → Focus ground work on truly uncertain parcels

---

### Problems 9-11: Integration, Mobile, Dashboard (P2-P3)

| Problem | Solution | Tool |
|---------|----------|------|
| WebLand API | REST API + batch export | FastAPI + GeoPandas |
| Mobile Tool | QGIS-compatible mobile | QField (free, offline capable) |
| Dashboard | Interactive web UI | Streamlit + Folium |

---

## Part 2: Our AI Innovations

### Innovation 1: Multi-Source Integration (Using Available Data)

**What competitors will do:** Use only ORI images, ignore textual records until validation.

**What we do:** Integrate 4 available data sources DURING processing:

```
┌─────────────────────────────────────────────────────────────┐
│                    DATA INTEGRATION                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ORI Images (Provided)                                       │
│  ─────────────────────                                       │
│  • Primary visual input for AI segmentation                  │
│  • Edge detection for bund lines                             │
│  • Building/road detection for Abadi                         │
│                                                              │
│  ROR Data (WebLand Portal)                                   │
│  ─────────────────────────                                   │
│  • Expected parcel count per village                         │
│  • Expected area per parcel (in acres/guntas)                │
│  • Owner information for linkage                             │
│  • Land type for classification                              │
│  → USED AS CONSTRAINTS DURING SEGMENTATION                   │
│                                                              │
│  FMB Records (Department)                                    │
│  ────────────────────────                                    │
│  • Boundary measurements (N-S, E-W distances)                │
│  • Corner coordinates/bearings                               │
│  • Adjacent parcel references                                │
│  → USED FOR VALIDATION AND REFINEMENT                        │
│                                                              │
│  Bhu-Naksha (Portal)                                         │
│  ───────────────────                                         │
│  • Historical boundary shapes                                │
│  • Relative parcel positions                                 │
│  • Topology (which parcels are neighbors)                    │
│  → USED AS REFERENCE FOR UNCERTAIN BOUNDARIES                │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Why it's better:**
- ROR count prevents over/under-segmentation
- FMB measurements validate boundary accuracy
- Bhu-Naksha guides uncertain edge placement

---

### Innovation 2: ROR-Constrained Segmentation (Use What You Know)

**What competitors will do:**
```
Segment blindly → Compare with ROR after → Flag many differences
```

**What we do:**
```
Read ROR first → Set expectations → Guide segmentation → Fewer errors
```

**Example:**
```
Village: Kanumuru
ROR says: 47 agricultural parcels
         Total area: 156.3 acres
         Sizes range: 0.5 to 8.2 acres

AI without constraints:
  → SAM finds 83 segments (includes internal paths, shadows, etc.)
  → 36 false positives to manually review

AI with ROR constraints:
  → SAM finds 83 initial segments
  → Constraint engine: "Expected ~47, merge small/spurious"
  → After optimization: 49 segments
  → Only 2-3 need review
```

**Unique advantage:** This challenge provides ROR + FMB data that most cadastral AI systems don't have access to. Not using it would be leaving value on the table.

---

### Innovation 3: Uncertainty Quantification (Know What You Don't Know)

**What competitors will do:** Output parcels with no confidence indication.

**What we do:** Every parcel gets a confidence score based on:
- SAM segmentation confidence
- ROR area match (within 5%?)
- FMB measurement alignment
- Bhu-Naksha boundary overlap
- Visual boundary clarity

**Routing decisions:**
| Confidence | Action | Expected % |
|------------|--------|------------|
| > 0.85 | Auto-approve | ~60% |
| 0.60 - 0.85 | Desktop review | ~25% |
| < 0.60 | Field verification | ~15% |

**Research backing:** Meta-classification for segmentation quality achieves AUROC 0.915. Can reduce wrong predictions by 77%.

---

### Innovation 4: Edge-First Detection (Bunds are Lines, Not Regions)

**What competitors will do:** Use region-based segmentation (SAM treats bunds as region boundaries).

**What we do:** Detect bunds as **edges first**, then convert to polygons.

**Why it's better for bunds:**
- Bunds are thin LINEAR features (earthen ridges 30-50cm wide)
- Edge detectors are designed for linear features
- Can handle broken/partial bunds with edge completion
- Complementary to region segmentation (ensemble approach)

**Implementation:**
```python
import cv2
import numpy as np

def detect_bunds_edge_first(ori_image):
    # Convert to grayscale
    gray = cv2.cvtColor(ori_image, cv2.COLOR_BGR2GRAY)

    # Edge detection (Canny)
    edges = cv2.Canny(gray, 50, 150)

    # Line detection (Hough)
    lines = cv2.HoughLinesP(edges, 1, np.pi/180,
                            threshold=50, minLineLength=30, maxLineGap=10)

    # Connect broken edges
    connected = connect_broken_edges(lines, max_gap=20)

    # Convert closed contours to polygons
    contours, _ = cv2.findContours(connected, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    return contours
```

---

### Innovation 5: Explainable Decisions

**What competitors will do:** "AI detected this boundary"

**What we do:** "Boundary detected because:
- Visible bund edge in ORI imagery ✓
- Area matches ROR record (2.3 acres, within 3%) ✓
- FMB measurements align (N-S: 125m matches) ✓
- Aligns with old Bhu-Naksha boundary ✓
- Confidence score: 0.87"

**Why it matters:**
- Survey teams can validate reasoning
- Disputes can be resolved with evidence
- Audit trail for legal purposes
- Builds trust in AI output

---

## Part 3: Why Our Solution is the Best

### Comparison with Standard Approach

| Aspect | Standard Approach | Our Approach |
|--------|-------------------|--------------|
| **Data Used** | ORI only | ORI + ROR + FMB + Bhu-Naksha |
| **ROR Usage** | Compare after | Guide during segmentation |
| **Confidence** | None | Per-parcel scoring |
| **Work Routing** | Manual prioritization | Automated by confidence |
| **Explainability** | "AI detected it" | Multi-factor evidence |
| **False Positives** | Many (paths, shadows) | Filtered by ROR constraints |

### Key Differentiators

```
┌────────────────────────────────────────────────────────────────┐
│                    COMPETITIVE LANDSCAPE                        │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Standard Solutions          Our Solution (BoundaryAI)          │
│  ─────────────────          ─────────────────────────          │
│                                                                 │
│  • ORI images only          • ORI + ROR + FMB + Bhu-Naksha     │
│                               (all available data)              │
│                                                                 │
│  • ROR as validation        • ROR as optimization constraint   │
│    (post-hoc comparison)      (guides segmentation)            │
│                                                                 │
│  • Binary output            • Confidence-scored output         │
│    (parcel / no parcel)       (with uncertainty routing)       │
│                                                                 │
│  • "AI says so"             • Explainable decisions            │
│    (black box)                (multi-factor evidence)          │
│                                                                 │
│  • All parcels need         • Smart prioritization             │
│    equal verification         (auto-approve 60%)               │
│                                                                 │
│  • Generic AI model         • AP-specific constraints          │
│                               (uses local ROR/FMB format)      │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

### Quantified Benefits

| Benefit | Estimate | How |
|---------|----------|-----|
| Reduced false positives | 50-70% fewer | ROR count constraints |
| Auto-approved parcels | ~60% | High confidence routing |
| Reduced field verification | 40-50% | Focus on uncertain only |
| Processing time | <2 hours/village | Automated pipeline |

---

## Part 4: Implementation Roadmap

### Phase 1: Core Pipeline
- [ ] Set up SamGeo with HQ-SAM for ORI segmentation
- [ ] Implement vectorization pipeline (rasterio + shapely)
- [ ] Integrate Mapshaper for topology fixing
- [ ] Build ROR data parser (WebLand format)

### Phase 2: Constraint Engine
- [ ] Implement ROR-constrained segmentation
- [ ] Add FMB measurement validation
- [ ] Integrate Bhu-Naksha overlay for reference
- [ ] Build segment-to-ROR matching (Hungarian algorithm)

### Phase 3: Intelligence Layer
- [ ] Build confidence scoring system
- [ ] Create routing logic (auto/desktop/field)
- [ ] Generate explainable output reports
- [ ] Implement conflict detection

### Phase 4: Interface & Polish
- [ ] Build Streamlit dashboard
- [ ] Configure QField for mobile
- [ ] Create sample outputs for demo
- [ ] Write documentation

---

## Part 5: Success Metrics

| Metric | Target | Our Expected |
|--------|--------|--------------|
| Parcel extraction precision | >80% | 85%+ (ROR-constrained) |
| Survey team satisfaction | >70% | >80% (smart routing) |
| Field verification reduction | - | 40-50% (auto-approve) |
| Processing time per village | - | <2 hours |
| False positive rate | - | <10% (vs 30%+ standard) |

---

## Appendix: Technology Stack

```
┌─────────────────────────────────────────────────────────────┐
│                     TECHNOLOGY STACK                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  AI/ML Layer                                                 │
│  ───────────                                                 │
│  • SamGeo (HQ-SAM) - Zero-shot segmentation                 │
│  • OpenCV - Edge detection for bund lines                   │
│  • Scikit-learn - Confidence scoring                        │
│  • SciPy - Hungarian algorithm for matching                 │
│                                                              │
│  Geospatial Processing                                       │
│  ────────────────────                                        │
│  • GDAL/Rasterio - Raster operations                        │
│  • GeoPandas/Shapely - Vector operations                    │
│  • Mapshaper - Topology fixing                              │
│  • PyProj - Coordinate transformations                      │
│                                                              │
│  Data Sources (All Within Scope)                             │
│  ───────────────────────────────                             │
│  • ORI Images - Provided by department                      │
│  • ROR Data - WebLand 1.0 portal                            │
│  • FMB Records - Department records                         │
│  • Bhu-Naksha - bhunaksha.ap.nic.in                         │
│                                                              │
│  Interface                                                   │
│  ─────────                                                   │
│  • Streamlit + Folium - Web dashboard                       │
│  • QField - Mobile field app (free, offline)                │
│  • FastAPI - API layer (if needed)                          │
│                                                              │
│  Database (Optional)                                         │
│  ────────                                                    │
│  • SQLite/GeoPackage - Simple file-based                    │
│  • PostgreSQL + PostGIS - If scaling needed                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Conclusion

Our solution stands out because we don't just apply AI to images - we build an **intelligent system** that:

1. **Uses all available information** (ORI + ROR + FMB + Bhu-Naksha)
2. **Leverages existing records as constraints** (not just for comparison)
3. **Knows its limitations** (uncertainty quantification)
4. **Optimizes human effort** (smart routing - auto-approve 60%)
5. **Explains its decisions** (transparent and auditable)

**No external data required** - works entirely with provided data and AP government portals.

This is not just a better AI model - it's a **better approach to the problem**.

---

*Document Version: 2.0*
*Last Updated: January 2025*
*Change: Removed external data dependencies, focused on provided/portal data only*

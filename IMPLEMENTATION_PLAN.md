# Implementation Plan: BoundaryAI Prototype

**Version:** 1.0
**Date:** January 2025
**Status:** AWAITING APPROVAL

---

## Available Data Summary

| Data | Location | Size/Count |
|------|----------|------------|
| **ORI Images** | Sample2/NTR/Nandigama/RAGHAVAPURAM_ORTHO_435_cog.tif | 2.8 GB |
| | Sample2/Guntur/Kollipora/14722_590274_MUNNANGI_ORTHO_COG.tif | 2.2 GB |
| **Ground Truth Shapefiles** | Resurvey/kanumuru.shp | ~1100 parcels (est.) |
| | Resurvey/nibanupudi.shp | ~850 parcels (est.) |
| **ROR Data** | Resurvey/kanumuru-annonymized ROR.xlsx | Excel with parcel records |
| | Resurvey/Nibhanupudi-annonymized ROR.xlsx | Excel with parcel records |

---

## Implementation Phases

```
┌─────────────────────────────────────────────────────────────────┐
│                    IMPLEMENTATION ROADMAP                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Phase 0: Environment Setup                    [~30 mins]       │
│  ─────────────────────────                                      │
│  • Install Python packages                                       │
│  • Verify GDAL/rasterio working                                 │
│  • Test data loading                                            │
│                                                                  │
│  Phase 1: Data Pipeline                        [~2 hours]       │
│  ──────────────────────                                         │
│  • Load and validate ORI images                                 │
│  • Parse ROR Excel data                                         │
│  • Load ground truth shapefiles                                 │
│  • Create data models                                           │
│                                                                  │
│  Phase 2: AI Segmentation                      [~2 hours]       │
│  ────────────────────────                                       │
│  • Set up SamGeo/SAM                                            │
│  • Run segmentation on sample area                              │
│  • Vectorize results                                            │
│  • Topology cleaning                                            │
│                                                                  │
│  Phase 3: Intelligence Layer                   [~2 hours]       │
│  ───────────────────────                                        │
│  • ROR constraint engine                                        │
│  • Segment-to-ROR matching                                      │
│  • Confidence scoring                                           │
│  • Conflict detection                                           │
│                                                                  │
│  Phase 4: Dashboard UI                         [~3 hours]       │
│  ─────────────────────                                          │
│  • Design clean, demo-ready interface                           │
│  • Interactive map with parcels                                 │
│  • Confidence visualization                                     │
│  • Summary statistics                                           │
│                                                                  │
│  Phase 5: Polish & Demo Prep                   [~2 hours]       │
│  ───────────────────────                                        │
│  • End-to-end testing                                           │
│  • Performance optimization                                     │
│  • Demo script preparation                                      │
│                                                                  │
│  TOTAL ESTIMATED TIME: ~11-12 hours                             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 0: Environment Setup

### Required Packages

```bash
# Core geospatial
pip install geopandas rasterio shapely pyproj fiona

# AI/ML
pip install segment-geospatial torch torchvision
pip install opencv-python scikit-learn scipy

# Data handling
pip install pandas openpyxl numpy

# Visualization & UI
pip install streamlit folium streamlit-folium
pip install plotly altair

# Utilities
pip install mapshaper  # May need npm install -g mapshaper
pip install tqdm pillow
```

### Directory Structure

```
Re-Survey/
├── src/
│   ├── __init__.py
│   ├── data_loader.py      # Load ORI, ROR, shapefiles
│   ├── segmentation.py     # SamGeo wrapper
│   ├── vectorization.py    # Raster to vector
│   ├── topology.py         # Gap/overlap fixing
│   ├── ror_engine.py       # ROR constraint matching
│   ├── confidence.py       # Scoring & routing
│   └── utils.py            # Helper functions
├── ui/
│   ├── app.py              # Main Streamlit app
│   ├── components/
│   │   ├── map_view.py     # Interactive map
│   │   ├── stats_panel.py  # Statistics dashboard
│   │   ├── parcel_detail.py # Single parcel view
│   │   └── sidebar.py      # Navigation & filters
│   └── styles/
│       └── custom.css      # Custom styling
├── data/
│   ├── processed/          # Generated outputs
│   └── cache/              # Cached computations
├── tests/
│   └── test_pipeline.py
└── requirements.txt
```

---

## Phase 1: Data Pipeline

### 1.1 ORI Image Handler

```python
# src/data_loader.py

class ORILoader:
    """Load and handle large ORI images efficiently"""

    def __init__(self, image_path: str):
        self.path = image_path
        self.dataset = None

    def load_metadata(self) -> dict:
        """Load image metadata without loading full image"""
        with rasterio.open(self.path) as src:
            return {
                'width': src.width,
                'height': src.height,
                'crs': src.crs,
                'bounds': src.bounds,
                'resolution': src.res,
                'bands': src.count
            }

    def load_window(self, bounds: tuple, max_size: int = 4096) -> np.ndarray:
        """Load a specific window/region for processing"""
        # Efficient windowed reading for large images
        pass

    def load_thumbnail(self, max_dim: int = 1024) -> np.ndarray:
        """Load downsampled version for preview"""
        pass
```

### 1.2 ROR Data Parser

```python
# src/data_loader.py

class RORLoader:
    """Parse ROR Excel data into structured format"""

    def __init__(self, excel_path: str):
        self.path = excel_path
        self.data = None

    def load(self) -> pd.DataFrame:
        """Load and standardize ROR data"""
        df = pd.read_excel(self.path)
        # Standardize column names
        # Parse area fields (acres, guntas)
        # Extract parcel identifiers
        return df

    def get_village_summary(self) -> dict:
        """Get summary statistics for constraint engine"""
        return {
            'total_parcels': len(self.data),
            'total_area_acres': self.data['extent_acres'].sum(),
            'area_distribution': self.data['extent_acres'].describe(),
            'land_types': self.data['land_type'].value_counts()
        }

    def get_parcel_constraints(self) -> list:
        """Get list of expected parcels with areas"""
        return [
            {
                'survey_no': row['survey_no'],
                'expected_area_sqm': row['extent_acres'] * 4046.86,
                'land_type': row['land_type'],
                'owner': row['owner_name']
            }
            for _, row in self.data.iterrows()
        ]
```

### 1.3 Shapefile Handler

```python
# src/data_loader.py

class ShapefileLoader:
    """Load and handle ground truth shapefiles"""

    def __init__(self, shp_path: str):
        self.path = shp_path
        self.gdf = None

    def load(self) -> gpd.GeoDataFrame:
        """Load shapefile into GeoDataFrame"""
        self.gdf = gpd.read_file(self.path)
        # Calculate areas
        self.gdf['area_sqm'] = self.gdf.geometry.area
        self.gdf['area_acres'] = self.gdf['area_sqm'] / 4046.86
        return self.gdf

    def get_bounds(self) -> tuple:
        """Get bounding box for the village"""
        return self.gdf.total_bounds

    def get_summary(self) -> dict:
        """Get summary statistics"""
        return {
            'total_parcels': len(self.gdf),
            'total_area_sqm': self.gdf['area_sqm'].sum(),
            'crs': self.gdf.crs
        }
```

---

## Phase 2: AI Segmentation

### 2.1 SamGeo Wrapper

```python
# src/segmentation.py

class ParcelSegmenter:
    """Wrapper for SAM-based segmentation"""

    def __init__(self, model_type: str = "vit_h"):
        self.model_type = model_type
        self.sam = None

    def initialize(self):
        """Initialize SamGeo model"""
        from samgeo import SamGeo
        self.sam = SamGeo(
            model_type=self.model_type,
            automatic=True,
            device='cuda' if torch.cuda.is_available() else 'cpu'
        )

    def segment_image(self, image_path: str, output_path: str) -> str:
        """Run segmentation on image"""
        self.sam.generate(
            source=image_path,
            output=output_path,
            batch=True,
            foreground=True,
            erosion_kernel=(3, 3),
            mask_multiplier=255
        )
        return output_path

    def segment_with_prompts(self, image_path: str, prompts: list) -> np.ndarray:
        """Segment with text/point prompts"""
        pass
```

### 2.2 Edge Detection (Complementary)

```python
# src/segmentation.py

class EdgeDetector:
    """Edge-first bund detection"""

    def detect_edges(self, image: np.ndarray) -> np.ndarray:
        """Detect potential bund edges"""
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

        # Multi-scale edge detection
        edges_fine = cv2.Canny(gray, 30, 100)
        edges_coarse = cv2.Canny(gray, 50, 150)

        # Combine
        edges = cv2.bitwise_or(edges_fine, edges_coarse)

        # Connect broken edges
        kernel = np.ones((3, 3), np.uint8)
        edges = cv2.morphologyEx(edges, cv2.MORPH_CLOSE, kernel)

        return edges

    def edges_to_polygons(self, edges: np.ndarray, transform) -> list:
        """Convert edge mask to polygons"""
        pass
```

### 2.3 Vectorization

```python
# src/vectorization.py

class Vectorizer:
    """Convert raster masks to vector polygons"""

    def vectorize(self, mask_path: str, simplify_tolerance: float = 0.5) -> gpd.GeoDataFrame:
        """Convert mask to GeoDataFrame"""
        with rasterio.open(mask_path) as src:
            mask = src.read(1)
            transform = src.transform
            crs = src.crs

            # Extract shapes
            shapes = list(rasterio.features.shapes(mask, transform=transform))

            # Build geometries
            geometries = []
            values = []
            for geom, val in shapes:
                if val > 0:  # Skip background
                    poly = shape(geom).simplify(simplify_tolerance)
                    if poly.is_valid and poly.area > 10:  # Min area threshold
                        geometries.append(poly)
                        values.append(val)

            gdf = gpd.GeoDataFrame({
                'segment_id': range(len(geometries)),
                'geometry': geometries
            }, crs=crs)

            return gdf
```

### 2.4 Topology Fixer

```python
# src/topology.py

class TopologyFixer:
    """Fix gaps and overlaps in polygon layer"""

    def fix_topology(self, gdf: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
        """Fix all topology issues"""
        # Fix invalid geometries
        gdf['geometry'] = gdf['geometry'].apply(make_valid)

        # Remove tiny polygons
        gdf = gdf[gdf.geometry.area > 10]

        # Fix overlaps (could use mapshaper externally)
        # Fix gaps

        return gdf

    def validate(self, gdf: gpd.GeoDataFrame) -> dict:
        """Check for remaining issues"""
        issues = {
            'invalid_geometries': (~gdf.is_valid).sum(),
            'overlaps': self._count_overlaps(gdf),
            'gaps': self._detect_gaps(gdf)
        }
        return issues
```

---

## Phase 3: Intelligence Layer

### 3.1 ROR Constraint Engine

```python
# src/ror_engine.py

class RORConstraintEngine:
    """Apply ROR constraints to segmentation"""

    def __init__(self, ror_data: list):
        self.expected_parcels = ror_data
        self.expected_count = len(ror_data)
        self.expected_areas = [p['expected_area_sqm'] for p in ror_data]

    def apply_count_constraint(self, segments: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
        """Merge/split to match expected count"""
        current_count = len(segments)

        if current_count > self.expected_count * 1.3:
            # Too many - merge small segments
            segments = self._merge_small_segments(segments)

        elif current_count < self.expected_count * 0.7:
            # Too few - flag for edge detection split
            segments['needs_split'] = True

        return segments

    def _merge_small_segments(self, gdf: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
        """Merge segments smaller than minimum expected"""
        min_area = min(self.expected_areas) * 0.5
        small = gdf[gdf.geometry.area < min_area]
        large = gdf[gdf.geometry.area >= min_area]

        # Merge small segments into adjacent large ones
        for idx, small_seg in small.iterrows():
            # Find nearest large segment
            # Merge into it
            pass

        return large
```

### 3.2 Segment-to-ROR Matching

```python
# src/ror_engine.py

class SegmentMatcher:
    """Match generated segments to ROR records"""

    def match(self, segments: gpd.GeoDataFrame, ror_records: list) -> gpd.GeoDataFrame:
        """Optimal assignment using Hungarian algorithm"""
        from scipy.optimize import linear_sum_assignment

        n_segments = len(segments)
        n_ror = len(ror_records)

        # Build cost matrix (area difference)
        cost_matrix = np.zeros((n_segments, n_ror))
        for i, (_, seg) in enumerate(segments.iterrows()):
            for j, ror in enumerate(ror_records):
                area_diff = abs(seg.geometry.area - ror['expected_area_sqm'])
                cost_matrix[i, j] = area_diff / ror['expected_area_sqm']

        # Solve assignment
        row_ind, col_ind = linear_sum_assignment(cost_matrix)

        # Add ROR info to segments
        segments['ror_survey_no'] = None
        segments['ror_area'] = None
        segments['area_mismatch'] = None
        segments['ror_owner'] = None

        for i, j in zip(row_ind, col_ind):
            segments.iloc[i, segments.columns.get_loc('ror_survey_no')] = ror_records[j]['survey_no']
            segments.iloc[i, segments.columns.get_loc('ror_area')] = ror_records[j]['expected_area_sqm']
            segments.iloc[i, segments.columns.get_loc('area_mismatch')] = cost_matrix[i, j]
            segments.iloc[i, segments.columns.get_loc('ror_owner')] = ror_records[j]['owner']

        return segments
```

### 3.3 Confidence Scorer

```python
# src/confidence.py

class ConfidenceScorer:
    """Calculate confidence scores for parcels"""

    WEIGHTS = {
        'area_match': 0.30,
        'has_ror_link': 0.15,
        'boundary_clarity': 0.20,
        'shape_regularity': 0.10,
        'count_consistency': 0.10,
        'size_reasonable': 0.15
    }

    def score_parcel(self, parcel: dict, village_stats: dict) -> float:
        """Calculate confidence score for a single parcel"""
        factors = {}

        # Area match with ROR
        if parcel.get('area_mismatch') is not None:
            factors['area_match'] = max(0, 1 - parcel['area_mismatch'])
        else:
            factors['area_match'] = 0.5

        # Has ROR link
        factors['has_ror_link'] = 1.0 if parcel.get('ror_survey_no') else 0.0

        # Boundary clarity (edge gradient)
        factors['boundary_clarity'] = parcel.get('edge_score', 0.5)

        # Shape regularity (compact shapes score higher)
        factors['shape_regularity'] = self._shape_regularity(parcel['geometry'])

        # Count consistency with village
        actual_count = village_stats['actual_count']
        expected_count = village_stats['expected_count']
        factors['count_consistency'] = min(actual_count, expected_count) / max(actual_count, expected_count)

        # Size is reasonable (not too small or too large)
        factors['size_reasonable'] = self._size_reasonability(parcel, village_stats)

        # Weighted sum
        score = sum(factors[k] * self.WEIGHTS[k] for k in factors)
        return round(score, 3)

    def _shape_regularity(self, geometry) -> float:
        """Calculate shape regularity (isoperimetric quotient)"""
        area = geometry.area
        perimeter = geometry.length
        # Perfect circle = 1, irregular = lower
        return (4 * np.pi * area) / (perimeter ** 2)

    def _size_reasonability(self, parcel, stats) -> float:
        """Check if size is within reasonable range"""
        area = parcel['geometry'].area
        min_expected = stats['min_area'] * 0.5
        max_expected = stats['max_area'] * 1.5
        if min_expected <= area <= max_expected:
            return 1.0
        else:
            return 0.5

    def route_parcel(self, confidence: float) -> str:
        """Determine routing based on confidence"""
        if confidence >= 0.85:
            return 'AUTO_APPROVE'
        elif confidence >= 0.60:
            return 'DESKTOP_REVIEW'
        else:
            return 'FIELD_VERIFICATION'
```

### 3.4 Conflict Detector

```python
# src/confidence.py

class ConflictDetector:
    """Detect conflicts between generated parcels and ROR"""

    def detect_all(self, parcels: gpd.GeoDataFrame, ror_data: list) -> list:
        """Detect all types of conflicts"""
        conflicts = []

        for idx, parcel in parcels.iterrows():
            parcel_conflicts = self._check_parcel(parcel, ror_data)
            conflicts.extend(parcel_conflicts)

        # Check for unmatched ROR records
        matched_ror = set(parcels['ror_survey_no'].dropna())
        all_ror = set(r['survey_no'] for r in ror_data)
        unmatched = all_ror - matched_ror

        for survey_no in unmatched:
            conflicts.append({
                'type': 'MISSING_PARCEL',
                'severity': 'HIGH',
                'survey_no': survey_no,
                'message': f'ROR record {survey_no} has no matching parcel'
            })

        return conflicts

    def _check_parcel(self, parcel, ror_data) -> list:
        """Check single parcel for conflicts"""
        conflicts = []

        # Area mismatch
        if parcel.get('area_mismatch'):
            if parcel['area_mismatch'] > 0.20:
                conflicts.append({
                    'type': 'AREA_MISMATCH',
                    'severity': 'HIGH',
                    'parcel_id': parcel.name,
                    'survey_no': parcel.get('ror_survey_no'),
                    'generated_area': parcel.geometry.area,
                    'ror_area': parcel.get('ror_area'),
                    'mismatch_pct': parcel['area_mismatch'] * 100
                })
            elif parcel['area_mismatch'] > 0.05:
                conflicts.append({
                    'type': 'AREA_MISMATCH',
                    'severity': 'MEDIUM',
                    'parcel_id': parcel.name,
                    'mismatch_pct': parcel['area_mismatch'] * 100
                })

        # No ROR match
        if parcel.get('ror_survey_no') is None:
            conflicts.append({
                'type': 'EXTRA_PARCEL',
                'severity': 'HIGH',
                'parcel_id': parcel.name,
                'message': 'Generated parcel has no ROR match'
            })

        return conflicts
```

---

## Phase 4: Dashboard UI (HIGH PRIORITY)

### Design Philosophy

```
┌─────────────────────────────────────────────────────────────────┐
│                    UI DESIGN PRINCIPLES                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. CLEAN & MINIMAL                                             │
│     • White/light background                                    │
│     • Maximum 3 colors for data visualization                   │
│     • No clutter - every element has purpose                    │
│                                                                  │
│  2. DEMO-READY                                                  │
│     • Key metrics visible immediately                           │
│     • Impressive visuals (map with colored parcels)             │
│     • Smooth interactions (no lag)                              │
│                                                                  │
│  3. TELLS A STORY                                               │
│     • Before/After comparison                                   │
│     • Progress indicators                                       │
│     • Clear workflow visualization                              │
│                                                                  │
│  4. INTUITIVE                                                   │
│     • No training needed to understand                          │
│     • Obvious what each element means                           │
│     • Consistent color coding                                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Color Scheme

```
PRIMARY COLORS:
├── Green (#22C55E)  → Auto-Approve / High Confidence
├── Yellow (#EAB308) → Desktop Review / Medium Confidence
├── Red (#EF4444)    → Field Verification / Low Confidence
└── Blue (#3B82F6)   → Neutral / Selected

BACKGROUND:
├── White (#FFFFFF)  → Main background
├── Gray (#F8FAFC)   → Cards/panels
└── Dark (#1E293B)   → Text
```

### UI Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  🏛️ BoundaryAI - Land Parcel Analysis                    [⚙️]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────────────────────────────────┐ │
│  │              │  │                                          │ │
│  │   SIDEBAR    │  │              MAIN MAP VIEW               │ │
│  │              │  │                                          │ │
│  │  Village:    │  │     [Interactive map with parcels       │ │
│  │  [Dropdown]  │  │      colored by confidence]             │ │
│  │              │  │                                          │ │
│  │  ──────────  │  │                                          │ │
│  │              │  │                                          │ │
│  │  SUMMARY     │  │                                          │ │
│  │  ┌────────┐  │  │                                          │ │
│  │  │ 1,124  │  │  │                                          │ │
│  │  │Parcels │  │  │                                          │ │
│  │  └────────┘  │  │                                          │ │
│  │              │  │                                          │ │
│  │  ROUTING     │  └──────────────────────────────────────────┘ │
│  │  ┌────────┐  │                                               │
│  │  │●  673  │  │  ┌──────────────────────────────────────────┐ │
│  │  │ Auto   │  │  │         STATISTICS PANEL                 │ │
│  │  ├────────┤  │  │                                          │ │
│  │  │●  281  │  │  │  [Confidence distribution chart]         │ │
│  │  │Desktop │  │  │  [Area comparison chart]                 │ │
│  │  ├────────┤  │  │  [Conflict summary]                      │ │
│  │  │●  170  │  │  │                                          │ │
│  │  │ Field  │  │  └──────────────────────────────────────────┘ │
│  │  └────────┘  │                                               │
│  │              │                                               │
│  └──────────────┘                                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Streamlit App Structure

```python
# ui/app.py

import streamlit as st
import folium
from streamlit_folium import st_folium

# Page config
st.set_page_config(
    page_title="BoundaryAI - Land Parcel Analysis",
    page_icon="🏛️",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS for clean design
st.markdown("""
<style>
    .main-header {
        font-size: 2rem;
        font-weight: 600;
        color: #1E293B;
        margin-bottom: 1rem;
    }
    .metric-card {
        background: #F8FAFC;
        border-radius: 12px;
        padding: 1.5rem;
        text-align: center;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .metric-value {
        font-size: 2.5rem;
        font-weight: 700;
        color: #1E293B;
    }
    .metric-label {
        font-size: 0.9rem;
        color: #64748B;
        text-transform: uppercase;
    }
    .confidence-high { color: #22C55E; }
    .confidence-medium { color: #EAB308; }
    .confidence-low { color: #EF4444; }
    .stSelectbox > div > div {
        background-color: #F8FAFC;
    }
</style>
""", unsafe_allow_html=True)

def main():
    # Sidebar
    with st.sidebar:
        st.image("logo.png", width=200)  # Add logo
        st.markdown("### Village Selection")
        village = st.selectbox(
            "Select Village",
            ["Kanumuru", "Nibanupudi", "Raghavapuram", "Munnangi"]
        )

        st.markdown("---")

        # Summary metrics
        st.markdown("### Summary")
        col1, col2 = st.columns(2)
        with col1:
            st.metric("Total Parcels", "1,124")
        with col2:
            st.metric("Accuracy", "87%")

        st.markdown("---")

        # Routing breakdown
        st.markdown("### Work Routing")
        st.markdown("""
        <div style='display: flex; align-items: center; margin: 0.5rem 0;'>
            <span style='color: #22C55E; font-size: 1.5rem;'>●</span>
            <span style='margin-left: 0.5rem;'>Auto-Approve: <b>673</b> (60%)</span>
        </div>
        <div style='display: flex; align-items: center; margin: 0.5rem 0;'>
            <span style='color: #EAB308; font-size: 1.5rem;'>●</span>
            <span style='margin-left: 0.5rem;'>Desktop Review: <b>281</b> (25%)</span>
        </div>
        <div style='display: flex; align-items: center; margin: 0.5rem 0;'>
            <span style='color: #EF4444; font-size: 1.5rem;'>●</span>
            <span style='margin-left: 0.5rem;'>Field Verify: <b>170</b> (15%)</span>
        </div>
        """, unsafe_allow_html=True)

    # Main content
    st.markdown('<h1 class="main-header">🏛️ BoundaryAI - Land Parcel Analysis</h1>', unsafe_allow_html=True)

    # Tabs for different views
    tab1, tab2, tab3 = st.tabs(["📍 Map View", "📊 Statistics", "⚠️ Conflicts"])

    with tab1:
        render_map_view()

    with tab2:
        render_statistics()

    with tab3:
        render_conflicts()

def render_map_view():
    """Render interactive map with parcels"""
    # Create map centered on village
    m = folium.Map(
        location=[16.5, 80.6],  # AP coordinates
        zoom_start=15,
        tiles='CartoDB positron'  # Clean, minimal tiles
    )

    # Add parcels with color coding
    # Green = high confidence, Yellow = medium, Red = low

    # Display map
    st_folium(m, width=None, height=600)

def render_statistics():
    """Render statistics dashboard"""
    col1, col2, col3, col4 = st.columns(4)

    with col1:
        st.markdown("""
        <div class="metric-card">
            <div class="metric-value">1,124</div>
            <div class="metric-label">Total Parcels</div>
        </div>
        """, unsafe_allow_html=True)

    with col2:
        st.markdown("""
        <div class="metric-card">
            <div class="metric-value confidence-high">87%</div>
            <div class="metric-label">Avg Confidence</div>
        </div>
        """, unsafe_allow_html=True)

    with col3:
        st.markdown("""
        <div class="metric-card">
            <div class="metric-value">1,089</div>
            <div class="metric-label">ROR Matched</div>
        </div>
        """, unsafe_allow_html=True)

    with col4:
        st.markdown("""
        <div class="metric-card">
            <div class="metric-value confidence-low">47</div>
            <div class="metric-label">Conflicts</div>
        </div>
        """, unsafe_allow_html=True)

    # Charts
    st.markdown("### Confidence Distribution")
    # Add histogram/bar chart of confidence scores

    st.markdown("### Area Comparison (Generated vs ROR)")
    # Add scatter plot comparing areas

def render_conflicts():
    """Render conflict list"""
    st.markdown("### Detected Conflicts")

    # Filter options
    severity = st.multiselect(
        "Filter by Severity",
        ["HIGH", "MEDIUM", "LOW"],
        default=["HIGH"]
    )

    # Conflict table
    # Display interactive table of conflicts

if __name__ == "__main__":
    main()
```

### Key UI Components

#### 4.1 Interactive Map with Confidence Colors

```python
# ui/components/map_view.py

def create_parcel_map(parcels_gdf: gpd.GeoDataFrame, center: tuple) -> folium.Map:
    """Create interactive map with colored parcels"""

    m = folium.Map(
        location=center,
        zoom_start=16,
        tiles='CartoDB positron'
    )

    # Color function based on confidence
    def get_color(confidence):
        if confidence >= 0.85:
            return '#22C55E'  # Green
        elif confidence >= 0.60:
            return '#EAB308'  # Yellow
        else:
            return '#EF4444'  # Red

    # Add parcels
    for idx, row in parcels_gdf.iterrows():
        color = get_color(row['confidence'])

        folium.GeoJson(
            row['geometry'].__geo_interface__,
            style_function=lambda x, color=color: {
                'fillColor': color,
                'color': '#1E293B',
                'weight': 1,
                'fillOpacity': 0.6
            },
            tooltip=folium.Tooltip(f"""
                <b>Parcel ID:</b> {row['parcel_id']}<br>
                <b>Survey No:</b> {row.get('ror_survey_no', 'N/A')}<br>
                <b>Area:</b> {row['area_acres']:.2f} acres<br>
                <b>Confidence:</b> {row['confidence']:.0%}<br>
                <b>Status:</b> {row['routing']}
            """)
        ).add_to(m)

    # Add legend
    legend_html = """
    <div style="position: fixed; bottom: 50px; right: 50px; z-index: 1000;
                background: white; padding: 15px; border-radius: 8px;
                box-shadow: 0 2px 6px rgba(0,0,0,0.15);">
        <p style="margin: 0 0 10px 0; font-weight: 600;">Confidence Level</p>
        <p style="margin: 5px 0;"><span style="color: #22C55E;">●</span> High (Auto-Approve)</p>
        <p style="margin: 5px 0;"><span style="color: #EAB308;">●</span> Medium (Desktop Review)</p>
        <p style="margin: 5px 0;"><span style="color: #EF4444;">●</span> Low (Field Verify)</p>
    </div>
    """
    m.get_root().html.add_child(folium.Element(legend_html))

    return m
```

#### 4.2 Statistics Charts

```python
# ui/components/stats_panel.py

import plotly.express as px
import plotly.graph_objects as go

def confidence_histogram(parcels_gdf: gpd.GeoDataFrame):
    """Create confidence distribution histogram"""

    fig = px.histogram(
        parcels_gdf,
        x='confidence',
        nbins=20,
        color_discrete_sequence=['#3B82F6'],
        labels={'confidence': 'Confidence Score', 'count': 'Number of Parcels'}
    )

    fig.update_layout(
        title='Confidence Score Distribution',
        xaxis_title='Confidence',
        yaxis_title='Count',
        showlegend=False,
        height=300,
        margin=dict(l=20, r=20, t=40, b=20)
    )

    # Add threshold lines
    fig.add_vline(x=0.85, line_dash="dash", line_color="#22C55E",
                  annotation_text="Auto-Approve")
    fig.add_vline(x=0.60, line_dash="dash", line_color="#EAB308",
                  annotation_text="Desktop Review")

    return fig

def area_comparison_scatter(parcels_gdf: gpd.GeoDataFrame):
    """Create scatter plot comparing generated vs ROR areas"""

    df = parcels_gdf[parcels_gdf['ror_area'].notna()].copy()
    df['generated_acres'] = df['area_sqm'] / 4046.86
    df['ror_acres'] = df['ror_area'] / 4046.86

    fig = px.scatter(
        df,
        x='ror_acres',
        y='generated_acres',
        color='routing',
        color_discrete_map={
            'AUTO_APPROVE': '#22C55E',
            'DESKTOP_REVIEW': '#EAB308',
            'FIELD_VERIFICATION': '#EF4444'
        },
        labels={
            'ror_acres': 'ROR Area (acres)',
            'generated_acres': 'Generated Area (acres)'
        }
    )

    # Add perfect match line
    max_val = max(df['ror_acres'].max(), df['generated_acres'].max())
    fig.add_trace(go.Scatter(
        x=[0, max_val],
        y=[0, max_val],
        mode='lines',
        line=dict(dash='dash', color='gray'),
        name='Perfect Match'
    ))

    fig.update_layout(
        title='Generated vs ROR Area Comparison',
        height=400,
        margin=dict(l=20, r=20, t=40, b=20)
    )

    return fig

def routing_pie_chart(parcels_gdf: gpd.GeoDataFrame):
    """Create pie chart of routing distribution"""

    routing_counts = parcels_gdf['routing'].value_counts()

    fig = px.pie(
        values=routing_counts.values,
        names=routing_counts.index,
        color=routing_counts.index,
        color_discrete_map={
            'AUTO_APPROVE': '#22C55E',
            'DESKTOP_REVIEW': '#EAB308',
            'FIELD_VERIFICATION': '#EF4444'
        },
        hole=0.4  # Donut chart
    )

    fig.update_layout(
        title='Work Routing Distribution',
        height=300,
        margin=dict(l=20, r=20, t=40, b=20)
    )

    return fig
```

#### 4.3 Parcel Detail Panel

```python
# ui/components/parcel_detail.py

def render_parcel_detail(parcel: dict):
    """Render detailed view for a selected parcel"""

    st.markdown(f"""
    <div style="background: #F8FAFC; border-radius: 12px; padding: 1.5rem;">
        <h3 style="margin-top: 0;">Parcel Details</h3>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
            <div>
                <p style="color: #64748B; margin-bottom: 0.25rem;">Parcel ID</p>
                <p style="font-weight: 600; margin-top: 0;">{parcel['parcel_id']}</p>
            </div>
            <div>
                <p style="color: #64748B; margin-bottom: 0.25rem;">Survey Number</p>
                <p style="font-weight: 600; margin-top: 0;">{parcel.get('ror_survey_no', 'N/A')}</p>
            </div>
            <div>
                <p style="color: #64748B; margin-bottom: 0.25rem;">Generated Area</p>
                <p style="font-weight: 600; margin-top: 0;">{parcel['area_acres']:.2f} acres</p>
            </div>
            <div>
                <p style="color: #64748B; margin-bottom: 0.25rem;">ROR Area</p>
                <p style="font-weight: 600; margin-top: 0;">{parcel.get('ror_area_acres', 'N/A')} acres</p>
            </div>
        </div>

        <hr style="margin: 1rem 0;">

        <h4>Confidence Breakdown</h4>
        <div style="background: white; border-radius: 8px; padding: 1rem;">
            {render_confidence_factors(parcel)}
        </div>

        <div style="margin-top: 1rem; padding: 0.75rem;
                    background: {'#DCFCE7' if parcel['routing'] == 'AUTO_APPROVE' else '#FEF9C3' if parcel['routing'] == 'DESKTOP_REVIEW' else '#FEE2E2'};
                    border-radius: 8px; text-align: center;">
            <span style="font-weight: 600;">Status: {parcel['routing'].replace('_', ' ')}</span>
        </div>
    </div>
    """, unsafe_allow_html=True)

def render_confidence_factors(parcel: dict) -> str:
    """Render confidence factor breakdown as progress bars"""

    factors = parcel.get('confidence_factors', {})
    html = ""

    for factor, value in factors.items():
        color = '#22C55E' if value >= 0.8 else '#EAB308' if value >= 0.5 else '#EF4444'
        html += f"""
        <div style="margin-bottom: 0.75rem;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
                <span>{factor.replace('_', ' ').title()}</span>
                <span>{value:.0%}</span>
            </div>
            <div style="background: #E2E8F0; border-radius: 4px; height: 8px;">
                <div style="background: {color}; width: {value*100}%; height: 100%; border-radius: 4px;"></div>
            </div>
        </div>
        """

    return html
```

---

## Phase 5: Polish & Demo Prep

### 5.1 Demo Script

```
DEMO FLOW (5 minutes):

1. INTRODUCTION (30 sec)
   "BoundaryAI - Intelligent land parcel extraction for AP Re-Survey"
   Show: Logo and tagline

2. THE PROBLEM (30 sec)
   "Manual boundary extraction is slow and error-prone"
   Show: Sample ORI image with complex boundaries

3. OUR SOLUTION (1 min)
   "We don't just detect boundaries - we validate them against ROR"
   Show: Architecture diagram
   Highlight: ROR-constrained segmentation

4. LIVE DEMO (2 min)
   a) Load Kanumuru village
   b) Show map with color-coded parcels
   c) Click on a parcel - show confidence breakdown
   d) Show statistics panel
   e) Show conflict list
   f) Highlight: "60% auto-approved, saving field verification time"

5. RESULTS (30 sec)
   Show: Summary metrics
   - 87% average confidence
   - 60% auto-approve rate
   - 47 conflicts detected for review

6. DIFFERENTIATORS (30 sec)
   "Unlike other solutions, we use ROR as constraints, not just validation"
   "Every decision is explainable"
   "Prioritizes human effort where it matters"
```

### 5.2 Performance Optimization

```python
# Caching strategies for smooth demo

import streamlit as st

@st.cache_data(ttl=3600)
def load_village_data(village_name: str):
    """Cache village data to avoid reloading"""
    pass

@st.cache_resource
def load_model():
    """Cache the SAM model"""
    pass

# Pre-compute results for demo villages
# Store in data/processed/ folder
```

---

## Approval Checklist

Before proceeding, please confirm:

- [ ] **Environment Setup**: OK to install Python packages listed?
- [ ] **Directory Structure**: OK with proposed file organization?
- [ ] **UI Design**: Happy with the layout and color scheme?
- [ ] **Demo Flow**: Agree with the 5-minute demo structure?
- [ ] **Priority**: Confirm Phase 4 (UI) should be polished before other phases?

---

## Next Steps After Approval

1. Set up Python environment with all packages
2. Create directory structure
3. Start with data loading (Phase 1)
4. Build in iterative cycles, testing UI frequently

---

*Plan Version: 1.0*
*Awaiting Approval*

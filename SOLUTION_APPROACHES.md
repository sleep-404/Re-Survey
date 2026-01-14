# Available Solutions for Land Re-Survey Challenge

This document outlines existing, off-the-shelf solutions for each problem in the challenge. **No custom model training required.**

---

## Problem 1: Agricultural Land Parcel Boundary Detection

### Recommended Solutions

| Solution | Type | Accuracy | Notes |
|----------|------|----------|-------|
| **Segment Anything Model (SAM) + SamGeo** | Open Source | High | Zero-shot segmentation, no training needed |
| **DigiFarm Field Boundaries API** | Paid API | 95% IoU | Commercial, ready-to-use |
| **EOS Data Analytics** | Paid Service | 90% IoU | Commercial service |
| **MapMyCrop API** | Paid API | 95% IoU | Commercial, 50ha free trial |
| **Euro Data Cube Field Delineation** | API | Good | Uses AI4Boundaries trained model |

### Best Approach: **SamGeo (Segment Anything for Geospatial)**

```python
# Installation
pip install segment-geospatial

# Usage
from samgeo import SamGeo
sam = SamGeo(model_type="vit_h")
sam.generate(input_image, output_mask)
sam.tiff_to_gpkg(mask, "output.gpkg")  # Direct shapefile output
```

**Why SamGeo:**
- Free, open-source
- Zero-shot (no training needed)
- Outputs directly to shapefile/GeoPackage
- QGIS plugin available
- Works with high-resolution drone imagery

**Alternative: Pre-processing + SAM**
Research shows best results with:
1. Convert time-series to HSV color space composite
2. Apply SAM without modifications
3. This approach worked well for UK field boundaries on Sentinel-2

### Resources
- SamGeo: https://samgeo.gishub.org
- GitHub: https://github.com/opengeos/segment-geospatial
- Paper: "The Segment Anything Model (SAM) for remote sensing applications"

---

## Problem 2: Building Footprint Extraction (Abadi Areas)

### Recommended Solutions

| Solution | Type | Coverage | Buildings |
|----------|------|----------|-----------|
| **Google Open Buildings** | Free Dataset | Africa, South Asia, Latin America | 1.8B buildings |
| **Microsoft Global ML Building Footprints** | Free Dataset | Worldwide | 1.4B buildings |
| **Combined VIDA Dataset** | Free Dataset | Global | 2.7B buildings |

### Best Approach: **Google/Microsoft Building Footprints + SAM for gaps**

**Step 1: Check if pre-extracted footprints exist**
```python
# Google Earth Engine
import ee
ee.Initialize()
buildings = ee.FeatureCollection('GOOGLE/Research/open-buildings/v3/polygons')
aoi_buildings = buildings.filterBounds(your_aoi)
```

**Step 2: For areas not covered, use SamGeo**
```python
from samgeo import SamGeo
sam = SamGeo(model_type="vit_h")
sam.generate(abadi_image, building_mask, text_prompt="buildings")
```

### Resources
- Google Open Buildings: https://sites.research.google/gr/open-buildings/
- Microsoft Buildings: https://github.com/microsoft/GlobalMLBuildingFootprints
- Combined Dataset: https://source.coop/vida/google-microsoft-osm-open-buildings

---

## Problem 3: Road Extraction

### Recommended Solutions

| Solution | Type | Notes |
|----------|------|-------|
| **CRESI (City-scale Road Extraction)** | Open Source | End-to-end pipeline, outputs NetworkX graph |
| **ArcGIS Multi-Task Road Extractor** | Commercial | Part of ArcGIS Pro |
| **BrightEarth/LuxCarta** | Commercial | 86-94% accuracy |
| **OpenStreetMap** | Free Data | May be outdated |

### Best Approach: **CRESI or SAM with road prompts**

**Option 1: CRESI Pipeline**
```bash
# Clone and setup
git clone https://github.com/avanetten/cresi
# Uses SpaceNet trained models
# Outputs: Shapefile + NetworkX graph with road connectivity
```

**Option 2: SamGeo with text prompts**
```python
from samgeo import SamGeo
sam = SamGeo(model_type="vit_h")
sam.generate(image, road_mask, text_prompt="roads")
```

### Resources
- CRESI: https://github.com/avanetten/cresi
- DeepGlobe Road Dataset: https://www.kaggle.com/balraj98/deepglobe-road-extraction-dataset

---

## Problem 4: Water Body Detection

### Best Approach: **NDWI Thresholding + SAM**

**Simple approach using spectral indices:**
```python
import rasterio
import numpy as np

# Calculate NDWI (Normalized Difference Water Index)
# NDWI = (Green - NIR) / (Green + NIR)
with rasterio.open('image.tif') as src:
    green = src.read(2)  # Adjust band numbers
    nir = src.read(4)
    ndwi = (green - nir) / (green + nir)
    water_mask = ndwi > 0.3  # Threshold
```

**Or use SAM with text prompt:**
```python
sam.generate(image, water_mask, text_prompt="water bodies, ponds, lakes")
```

---

## Problem 5: Vectorization (Raster to Shapefile)

### Recommended Tools

| Tool | Type | Notes |
|------|------|-------|
| **GDAL gdal_polygonize** | Open Source | Standard tool |
| **Rasterio features.shapes** | Python Library | Integrates with GeoPandas |
| **QGIS Polygonize** | GUI Tool | Easy to use |

### Best Approach: **Rasterio + Shapely**

```python
import rasterio
from rasterio import features
import geopandas as gpd
from shapely.geometry import shape

with rasterio.open('segmentation_mask.tif') as src:
    mask = src.read(1)
    results = features.shapes(mask, transform=src.transform)

    geoms = []
    values = []
    for geom, val in results:
        geoms.append(shape(geom))
        values.append(val)

    gdf = gpd.GeoDataFrame({'class': values, 'geometry': geoms}, crs=src.crs)
    gdf.to_file('output.shp')
```

### Smoothing Boundaries
```python
# Simplify jagged edges
gdf['geometry'] = gdf['geometry'].simplify(tolerance=0.5)
```

---

## Problem 6: Topology Validation & Correction

### Recommended Tools

| Tool | Type | Capabilities |
|------|------|--------------|
| **poly-validator** | Python Package | Detect overlaps, gaps, slivers |
| **QGIS Sketcher / Topology Checker** | GUI | Visual identification |
| **Mapshaper** | CLI/Web | `clean` command fixes all |
| **PostGIS ST_MakeValid** | SQL | Fixes invalid geometries |
| **Shapely make_valid** | Python | Fixes invalid geometries |

### Best Approach: **Mapshaper + Python validation**

**Quick fix with Mapshaper:**
```bash
# Mapshaper clean command fixes gaps and overlaps
mapshaper input.shp -clean -o output.shp
```

**Python validation:**
```python
from polyvalidator.validators.topology import detect_overlaps, detect_gaps
import geopandas as gpd

gdf = gpd.read_file('parcels.shp')
overlaps = detect_overlaps(gdf)
gaps = detect_gaps(gdf)
```

**PostGIS approach:**
```sql
-- Fix invalid geometries
UPDATE parcels SET geom = ST_MakeValid(geom) WHERE NOT ST_IsValid(geom);

-- Remove gaps smaller than threshold
-- Use ST_Buffer trick
UPDATE parcels SET geom = ST_Buffer(ST_Buffer(geom, 0.1), -0.1);
```

### Resources
- poly-validator: https://github.com/billyz313/Geospatial-Data-Validation-Tool
- Mapshaper: https://mapshaper.org
- QGIS Sketcher Guide: https://geonode.resilienceacademy.ac.tz/documents/150/download

---

## Problem 7: ROR Data Matching & Conflict Detection

### Approach: **Spatial Join + Area Comparison**

```python
import geopandas as gpd

# Load generated parcels and ROR data
parcels = gpd.read_file('generated_parcels.shp')
ror = gpd.read_file('ror_records.shp')

# Calculate areas
parcels['generated_area'] = parcels.geometry.area

# Spatial join to link parcels with ROR records
joined = gpd.sjoin(parcels, ror, how='left', predicate='intersects')

# Calculate area mismatch
joined['area_diff'] = abs(joined['generated_area'] - joined['ror_area'])
joined['area_diff_pct'] = (joined['area_diff'] / joined['ror_area']) * 100

# Flag conflicts
joined['conflict'] = joined['area_diff_pct'] > 5  # 5% threshold
```

---

## Problem 8: Risk Scoring

### Simple Rule-Based Approach

```python
def calculate_risk_score(row):
    score = 0

    # Area mismatch
    if row['area_diff_pct'] > 20:
        score += 3
    elif row['area_diff_pct'] > 10:
        score += 2
    elif row['area_diff_pct'] > 5:
        score += 1

    # Missing ROR link
    if pd.isna(row['ror_id']):
        score += 2

    # Topology issues
    if row['has_overlap']:
        score += 1

    return score

parcels['risk_score'] = parcels.apply(calculate_risk_score, axis=1)
parcels['risk_level'] = pd.cut(parcels['risk_score'],
                               bins=[0, 2, 4, 10],
                               labels=['Low', 'Medium', 'High'])
```

---

## Problem 10 & 11: Dashboard & Mobile Tool

### Recommended Stack

| Component | Tool | Notes |
|-----------|------|-------|
| **Web Dashboard** | Streamlit + Folium | Quick to build, Python-based |
| **Map Visualization** | Leaflet / Mapbox | Interactive maps |
| **Mobile Tool** | QField / Mergin Maps | QGIS-compatible mobile apps |
| **Alternative Mobile** | ODK / KoboToolbox | Form-based data collection |

### Quick Dashboard with Streamlit

```python
import streamlit as st
import folium
from streamlit_folium import st_folium
import geopandas as gpd

st.title("Land Parcel Validation Dashboard")

# Load data
parcels = gpd.read_file('parcels.shp')

# Summary stats
st.metric("Total Parcels", len(parcels))
st.metric("High Risk", len(parcels[parcels['risk_level'] == 'High']))

# Map
m = folium.Map(location=[center_lat, center_lon], zoom_start=14)
folium.GeoJson(parcels).add_to(m)
st_folium(m)
```

---

## Recommended Technology Stack

| Layer | Technology |
|-------|------------|
| **AI Segmentation** | SamGeo (Segment Anything) |
| **Geospatial Processing** | GDAL, Rasterio, GeoPandas, Shapely |
| **Topology Validation** | Mapshaper, PostGIS, poly-validator |
| **Database** | PostgreSQL + PostGIS |
| **Dashboard** | Streamlit + Folium |
| **Mobile** | QField (free) or Mergin Maps |

---

## Implementation Priority

| Phase | Tasks | Tools |
|-------|-------|-------|
| **Phase 1** | Parcel extraction from ORI | SamGeo |
| **Phase 1** | Vectorization | Rasterio, GDAL |
| **Phase 1** | Topology validation | Mapshaper |
| **Phase 2** | Building/Road extraction | SamGeo, Google Buildings |
| **Phase 2** | ROR matching | GeoPandas spatial join |
| **Phase 3** | Dashboard | Streamlit |
| **Phase 3** | Risk scoring | Python rules |

---

## Key Python Libraries to Install

```bash
pip install segment-geospatial
pip install geopandas
pip install rasterio
pip install shapely
pip install folium
pip install streamlit
pip install poly-validator
pip install rasterstats
```

---

## References

1. SamGeo - https://samgeo.gishub.org
2. AI4Boundaries Dataset - https://essd.copernicus.org/articles/15/317/2023/
3. Google Open Buildings - https://sites.research.google/gr/open-buildings/
4. Microsoft Building Footprints - https://github.com/microsoft/GlobalMLBuildingFootprints
5. CRESI Road Extraction - https://github.com/avanetten/cresi
6. Mapshaper - https://mapshaper.org
7. QField Mobile - https://qfield.org

#!/usr/bin/env python3
"""
SAM Evaluation Viewer

Compare SAM segmentation output against human-drawn ground truth parcels.
Toggle between three layers:
1. Satellite/drone imagery (basemap)
2. Human annotations (ground truth parcels)
3. SAM output (AI-detected segments)

Usage:
    streamlit run scripts/sam_viewer.py
"""

import json
import streamlit as st
import folium
from streamlit_folium import st_folium
import geopandas as gpd
from pathlib import Path
from shapely.ops import transform
import pyproj
from functools import partial
import numpy as np

# Page config
st.set_page_config(
    page_title="SAM Evaluation Viewer",
    page_icon="🛰️",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Paths
BASE_DIR = Path(__file__).parent.parent
EVAL_DIR = BASE_DIR / "evaluation_output" / "nibanupudi_105parcels"
GT_FILE = EVAL_DIR / "ground_truth.geojson"
SAM_FILE = EVAL_DIR / "sam_raw_segments.geojson"


@st.cache_data
def load_geodata():
    """Load and reproject ground truth and SAM segments to WGS84."""
    # Load GeoJSON files
    gt_gdf = gpd.read_file(GT_FILE)
    sam_gdf = gpd.read_file(SAM_FILE)

    # Set CRS if not already set (both are in EPSG:32644)
    if gt_gdf.crs is None:
        gt_gdf = gt_gdf.set_crs("EPSG:32644")
    if sam_gdf.crs is None:
        sam_gdf = sam_gdf.set_crs("EPSG:32644")

    # Reproject to WGS84 (EPSG:4326) for web mapping
    gt_gdf = gt_gdf.to_crs("EPSG:4326")
    sam_gdf = sam_gdf.to_crs("EPSG:4326")

    # Add parcel index for ground truth
    gt_gdf = gt_gdf.reset_index(drop=True)
    gt_gdf['parcel_idx'] = gt_gdf.index

    return gt_gdf, sam_gdf


@st.cache_data
def compute_iou_for_parcels(_gt_gdf, _sam_gdf):
    """Compute IoU between each ground truth parcel and SAM segments.

    Uses spatial index for efficient intersection queries.
    """
    results = []

    # Build spatial index for SAM segments
    sam_sindex = _sam_gdf.sindex

    for idx, gt_row in _gt_gdf.iterrows():
        gt_geom = gt_row.geometry
        gt_area = gt_row.get('area_sqm', gt_geom.area * 111320**2)  # Use original sqm if available

        # Use spatial index to find candidate segments
        possible_matches_idx = list(sam_sindex.intersection(gt_geom.bounds))
        if not possible_matches_idx:
            results.append({
                'parcel_idx': idx,
                'lp_no': gt_row.get('lp_no', f'Parcel {idx}'),
                'area_sqm': gt_area,
                'area_acres': gt_row.get('extent_ac', 0),
                'iou': 0.0,
                'coverage': 0.0,
                'num_sam_segments': 0
            })
            continue

        candidates = _sam_gdf.iloc[possible_matches_idx]
        intersecting = candidates[candidates.geometry.intersects(gt_geom)]

        if len(intersecting) == 0:
            iou = 0.0
            coverage = 0.0
            num_segments = 0
        else:
            # Union of all intersecting SAM segments
            try:
                sam_union = intersecting.geometry.union_all()
            except AttributeError:
                # Fallback for older geopandas
                from shapely.ops import unary_union
                sam_union = unary_union(intersecting.geometry.tolist())

            # Calculate IoU
            intersection_area = gt_geom.intersection(sam_union).area
            union_area = gt_geom.union(sam_union).area
            iou = intersection_area / union_area if union_area > 0 else 0
            coverage = intersection_area / gt_geom.area if gt_geom.area > 0 else 0
            num_segments = len(intersecting)

        results.append({
            'parcel_idx': idx,
            'lp_no': gt_row.get('lp_no', f'Parcel {idx}'),
            'area_sqm': gt_area,
            'area_acres': gt_row.get('extent_ac', 0),
            'iou': iou * 100,
            'coverage': coverage * 100,
            'num_sam_segments': num_segments
        })

    return results


def get_sam_segments_for_parcel(sam_gdf, parcel_geom, buffer_factor=1.5):
    """Get SAM segments that are within or near a parcel."""
    # Get bounding box of parcel with some buffer
    minx, miny, maxx, maxy = parcel_geom.bounds
    width = maxx - minx
    height = maxy - miny
    buffer_x = width * (buffer_factor - 1) / 2
    buffer_y = height * (buffer_factor - 1) / 2

    # Filter SAM segments by bounding box first (fast)
    bbox_mask = (
        (sam_gdf.geometry.bounds['minx'] <= maxx + buffer_x) &
        (sam_gdf.geometry.bounds['maxx'] >= minx - buffer_x) &
        (sam_gdf.geometry.bounds['miny'] <= maxy + buffer_y) &
        (sam_gdf.geometry.bounds['maxy'] >= miny - buffer_y)
    )

    nearby_segments = sam_gdf[bbox_mask]

    return nearby_segments


def create_comparison_map(gt_gdf, sam_gdf, selected_parcel_idx,
                          show_imagery, show_gt, show_sam, show_all_gt=False):
    """Create a Folium map with toggleable layers."""

    # Get the selected parcel
    parcel = gt_gdf.iloc[selected_parcel_idx]
    parcel_geom = parcel.geometry

    # Get center point
    center = parcel_geom.centroid
    center_lat, center_lon = center.y, center.x

    # Create base map with explicit zoom controls
    m = folium.Map(
        location=[center_lat, center_lon],
        zoom_start=18,
        tiles=None,  # We'll add tiles manually
        zoom_control=True,
        scrollWheelZoom=True,
        dragging=True
    )

    # Layer 1: Satellite imagery (basemap)
    if show_imagery:
        folium.TileLayer(
            tiles='https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            attr='Esri',
            name='Satellite Imagery',
            overlay=False,
            control=True
        ).add_to(m)
    else:
        # Light basemap when imagery is off
        folium.TileLayer(
            tiles='cartodbpositron',
            name='Light Basemap',
            overlay=False,
            control=True
        ).add_to(m)

    # Layer 2: Ground Truth (Human annotations)
    if show_gt:
        gt_layer = folium.FeatureGroup(name='Human Annotations (Ground Truth)')

        if show_all_gt:
            # Show all ground truth parcels
            for idx, row in gt_gdf.iterrows():
                is_selected = idx == selected_parcel_idx
                folium.GeoJson(
                    row.geometry.__geo_interface__,
                    style_function=lambda x, sel=is_selected: {
                        'fillColor': '#10b981' if sel else '#3b82f6',
                        'color': '#059669' if sel else '#2563eb',
                        'weight': 4 if sel else 2,
                        'fillOpacity': 0.4 if sel else 0.2,
                    },
                    tooltip=f"LP No: {row.get('lp_no', 'N/A')}<br>Area: {row.get('extent_ac', 0):.2f} ac"
                ).add_to(gt_layer)
        else:
            # Show only selected parcel
            folium.GeoJson(
                parcel_geom.__geo_interface__,
                style_function=lambda x: {
                    'fillColor': '#10b981',
                    'color': '#059669',
                    'weight': 4,
                    'fillOpacity': 0.4,
                },
                tooltip=f"Ground Truth<br>LP No: {parcel.get('lp_no', 'N/A')}<br>Area: {parcel.get('extent_ac', 0):.2f} ac"
            ).add_to(gt_layer)

        gt_layer.add_to(m)

    # Layer 3: SAM Segments
    if show_sam:
        sam_layer = folium.FeatureGroup(name='SAM Segments (AI Detection)')

        # Get SAM segments near the selected parcel
        nearby_sam = get_sam_segments_for_parcel(sam_gdf, parcel_geom)

        # Color segments based on whether they intersect the parcel
        for idx, row in nearby_sam.iterrows():
            intersects_parcel = row.geometry.intersects(parcel_geom)

            folium.GeoJson(
                row.geometry.__geo_interface__,
                style_function=lambda x, inter=intersects_parcel: {
                    'fillColor': '#f59e0b' if inter else '#94a3b8',
                    'color': '#d97706' if inter else '#64748b',
                    'weight': 2 if inter else 1,
                    'fillOpacity': 0.5 if inter else 0.2,
                },
                tooltip=f"SAM Segment<br>Area: {row.get('area_sqm', 0):.1f} sqm<br>IoU Score: {row.get('predicted_iou', 0):.2f}"
            ).add_to(sam_layer)

        sam_layer.add_to(m)

    # Add layer control
    folium.LayerControl(collapsed=False).add_to(m)

    # Fit bounds to parcel with padding
    bounds = parcel_geom.bounds
    m.fit_bounds([[bounds[1], bounds[0]], [bounds[3], bounds[2]]], padding=[30, 30])

    return m, len(get_sam_segments_for_parcel(sam_gdf, parcel_geom))


def main():
    # Title
    st.title("🛰️ SAM Evaluation Viewer")
    st.markdown("Compare AI segmentation (SAM) against human-drawn land parcel boundaries")

    # Load data
    with st.spinner("Loading geodata..."):
        gt_gdf, sam_gdf = load_geodata()

    # Compute IoU metrics
    with st.spinner("Computing IoU metrics..."):
        parcel_metrics = compute_iou_for_parcels(gt_gdf, sam_gdf)

    # Sidebar - Controls
    st.sidebar.header("🎛️ Layer Controls")

    st.sidebar.markdown("### Toggle Layers")
    show_imagery = st.sidebar.checkbox("🛰️ Satellite Imagery", value=True,
                                       help="Show satellite/drone imagery basemap")
    show_gt = st.sidebar.checkbox("👤 Human Annotations", value=True,
                                  help="Show ground truth parcels drawn by surveyors")
    show_sam = st.sidebar.checkbox("🤖 SAM Output", value=True,
                                   help="Show AI-detected segments from SAM")

    st.sidebar.markdown("---")

    # Show all GT parcels option
    show_all_gt = st.sidebar.checkbox("Show all parcels", value=False,
                                      help="Display all 105 ground truth parcels (may be slow)")

    st.sidebar.markdown("---")

    # Parcel selector
    st.sidebar.header("📍 Parcel Selection")

    # Sort options
    sort_by = st.sidebar.selectbox(
        "Sort parcels by:",
        ["LP Number", "IoU (Best first)", "IoU (Worst first)", "Area", "SAM Segments"]
    )

    # Sort the metrics
    if sort_by == "LP Number":
        sorted_metrics = sorted(parcel_metrics, key=lambda x: x['lp_no'])
    elif sort_by == "IoU (Best first)":
        sorted_metrics = sorted(parcel_metrics, key=lambda x: x['iou'], reverse=True)
    elif sort_by == "IoU (Worst first)":
        sorted_metrics = sorted(parcel_metrics, key=lambda x: x['iou'])
    elif sort_by == "Area":
        sorted_metrics = sorted(parcel_metrics, key=lambda x: x['area_sqm'], reverse=True)
    else:  # SAM Segments
        sorted_metrics = sorted(parcel_metrics, key=lambda x: x['num_sam_segments'], reverse=True)

    # Create parcel options
    parcel_options = {
        f"LP {m['lp_no']} | IoU: {m['iou']:.1f}% | {m['num_sam_segments']} segs": m['parcel_idx']
        for m in sorted_metrics
    }

    selected_label = st.sidebar.selectbox(
        "Select parcel:",
        list(parcel_options.keys())
    )
    selected_idx = parcel_options[selected_label]

    # Get metrics for selected parcel
    selected_metrics = next(m for m in parcel_metrics if m['parcel_idx'] == selected_idx)

    # Metrics row at top
    iou_val = selected_metrics['iou']
    if iou_val >= 50:
        iou_color = "green"
        iou_status = "Good"
    elif iou_val >= 30:
        iou_color = "orange"
        iou_status = "Moderate"
    else:
        iou_color = "red"
        iou_status = "Poor"

    met1, met2, met3, met4 = st.columns(4)
    with met1:
        st.metric("LP Number", selected_metrics['lp_no'])
    with met2:
        st.metric("Area", f"{selected_metrics['area_acres']:.2f} ac")
    with met3:
        st.metric("IoU Score", f"{iou_val:.1f}%", delta=iou_status)
    with met4:
        st.metric("SAM Segments", selected_metrics['num_sam_segments'])

    # Legend
    st.markdown("""
    <div style='display: flex; gap: 20px; margin: 10px 0; font-size: 0.9em;'>
    <span><span style='background: #10b981; padding: 2px 8px; border-radius: 3px; color: white;'>█</span> Human (GT)</span>
    <span><span style='background: #f59e0b; padding: 2px 8px; border-radius: 3px; color: white;'>█</span> SAM (Intersecting)</span>
    <span><span style='background: #94a3b8; padding: 2px 8px; border-radius: 3px; color: white;'>█</span> SAM (Nearby)</span>
    </div>
    """, unsafe_allow_html=True)

    # Create and display map - FULL WIDTH
    m, nearby_count = create_comparison_map(
        gt_gdf, sam_gdf, selected_idx,
        show_imagery, show_gt, show_sam, show_all_gt
    )

    st_folium(m, height=550, use_container_width=True)

    # Summary statistics at bottom
    st.markdown("---")
    st.markdown("### 📈 Overall Statistics")

    col_a, col_b, col_c, col_d = st.columns(4)

    avg_iou = np.mean([m['iou'] for m in parcel_metrics])
    good_matches = sum(1 for m in parcel_metrics if m['iou'] >= 50)
    moderate_matches = sum(1 for m in parcel_metrics if 30 <= m['iou'] < 50)
    poor_matches = sum(1 for m in parcel_metrics if m['iou'] < 30)

    with col_a:
        st.metric("Ground Truth Parcels", len(gt_gdf))
    with col_b:
        st.metric("SAM Segments", len(sam_gdf))
    with col_c:
        st.metric("Average IoU", f"{avg_iou:.1f}%")
    with col_d:
        st.metric("Good Matches (>50%)", f"{good_matches}/{len(parcel_metrics)}")

    # Distribution
    st.markdown(f"""
    **IoU Distribution:**
    🟢 Good (≥50%): {good_matches} |
    🟡 Moderate (30-50%): {moderate_matches} |
    🔴 Poor (<30%): {poor_matches}
    """)


if __name__ == "__main__":
    main()

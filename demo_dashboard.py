#!/usr/bin/env python3
"""
BoundaryAI Demo Dashboard

A working Streamlit dashboard for the land parcel analysis demo.
"""

import streamlit as st
import geopandas as gpd
import pandas as pd
import json
import folium
from streamlit_folium import st_folium
from pathlib import Path
import numpy as np

# Page config
st.set_page_config(
    page_title="BoundaryAI - Land Parcel Analysis",
    page_icon="🗺️",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS
st.markdown("""
<style>
    .main-header {
        font-size: 2rem;
        font-weight: bold;
        color: #1E40AF;
        margin-bottom: 0.5rem;
    }
    .stat-card {
        background: white;
        padding: 1rem;
        border-radius: 8px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        text-align: center;
    }
    .stat-value {
        font-size: 2rem;
        font-weight: bold;
    }
    .stat-label {
        color: #6B7280;
        font-size: 0.875rem;
    }
    .status-approved { color: #059669; }
    .status-verified { color: #2563EB; }
    .status-review { color: #D97706; }
    .status-conflict { color: #DC2626; }
    .parcel-card {
        background: #F9FAFB;
        padding: 1rem;
        border-radius: 8px;
        margin-bottom: 0.5rem;
        border-left: 4px solid #3B82F6;
    }
    .conflict-card {
        border-left-color: #DC2626;
        background: #FEF2F2;
    }
</style>
""", unsafe_allow_html=True)


@st.cache_data
def load_villages():
    """Load villages index."""
    with open('demo_data/villages.json') as f:
        return json.load(f)


@st.cache_data
def load_parcels(village_id: str):
    """Load parcels GeoJSON for a village."""
    gdf = gpd.read_file(f'demo_data/{village_id}_parcels.geojson')
    return gdf


def get_status_color(status: str) -> str:
    """Get color for parcel status."""
    colors = {
        'approved': '#059669',  # Green
        'verified': '#2563EB',  # Blue
        'review': '#D97706',    # Orange
        'conflict': '#DC2626',  # Red
    }
    return colors.get(status, '#6B7280')


def render_dashboard():
    """Render the main dashboard (village list)."""
    st.markdown('<p class="main-header">🗺️ BoundaryAI Dashboard</p>', unsafe_allow_html=True)
    st.markdown("**Land Parcel Analysis System** - Andhra Pradesh Revenue Department")

    villages = load_villages()

    # Summary stats across all villages
    total_parcels = sum(v['stats']['total'] for v in villages)
    total_approved = sum(v['stats']['approved'] for v in villages)
    total_conflicts = sum(v['stats']['conflict'] for v in villages)
    total_review = sum(v['stats']['review'] for v in villages)

    col1, col2, col3, col4 = st.columns(4)
    with col1:
        st.metric("Total Villages", len(villages))
    with col2:
        st.metric("Total Parcels", f"{total_parcels:,}")
    with col3:
        st.metric("Approved", f"{total_approved:,}", delta=f"{total_approved/total_parcels*100:.0f}%")
    with col4:
        st.metric("Conflicts", total_conflicts, delta=f"{total_conflicts/total_parcels*100:.1f}%", delta_color="inverse")

    st.markdown("---")
    st.subheader("Villages")

    # Village cards
    for village in villages:
        with st.container():
            col1, col2, col3, col4, col5 = st.columns([3, 2, 2, 2, 2])

            with col1:
                st.markdown(f"### {village['name']}")
                st.caption(f"Mandal: {village['mandal']}")

            with col2:
                st.metric("Total", village['stats']['total'])

            with col3:
                st.metric("Approved", village['stats']['approved'],
                         delta=f"{village['stats']['approved']/village['stats']['total']*100:.0f}%")

            with col4:
                st.metric("Review", village['stats']['review'] + village['stats']['verified'])

            with col5:
                if st.button(f"Open {village['name']}", key=f"open_{village['id']}"):
                    st.session_state.selected_village = village['id']
                    st.session_state.page = 'village_map'
                    st.rerun()

            st.markdown("---")


def render_village_map():
    """Render the village map view."""
    village_id = st.session_state.get('selected_village', 'kanumuru')
    villages = load_villages()
    village = next((v for v in villages if v['id'] == village_id), villages[0])

    # Header
    col1, col2 = st.columns([4, 1])
    with col1:
        st.markdown(f'<p class="main-header">📍 {village["name"]} Village</p>', unsafe_allow_html=True)
    with col2:
        if st.button("← Back to Dashboard"):
            st.session_state.page = 'dashboard'
            st.rerun()

    # Load parcels
    gdf = load_parcels(village_id)

    # Sidebar stats
    with st.sidebar:
        st.markdown(f"### {village['name']}")
        st.caption(f"Mandal: {village['mandal']}")

        st.markdown("---")
        st.markdown("#### Statistics")

        stats = village['stats']
        progress = (stats['approved'] + stats['verified']) / stats['total'] * 100

        st.progress(progress / 100, text=f"Progress: {progress:.0f}%")

        col1, col2 = st.columns(2)
        with col1:
            st.markdown(f"🟢 **Approved:** {stats['approved']}")
            st.markdown(f"🔵 **Verified:** {stats['verified']}")
        with col2:
            st.markdown(f"🟡 **Review:** {stats['review']}")
            st.markdown(f"🔴 **Conflicts:** {stats['conflict']}")

        st.markdown("---")
        st.markdown("#### Filters")

        status_filter = st.multiselect(
            "Status",
            ['approved', 'verified', 'review', 'conflict'],
            default=['review', 'conflict']
        )

        st.markdown("---")
        if st.button("🔍 Start Review", type="primary", use_container_width=True):
            st.session_state.page = 'review_queue'
            st.rerun()

    # Filter parcels
    filtered_gdf = gdf[gdf['status'].isin(status_filter)] if status_filter else gdf

    # Main content - Map and list
    map_col, list_col = st.columns([2, 1])

    with map_col:
        st.markdown("#### Map View")

        # Create folium map
        bounds = village['bounds']
        center_lat = (bounds[1] + bounds[3]) / 2
        center_lon = (bounds[0] + bounds[2]) / 2

        m = folium.Map(
            location=[center_lat, center_lon],
            zoom_start=14,
            tiles='OpenStreetMap'
        )

        # Add parcels to map
        for idx, row in filtered_gdf.iterrows():
            color = get_status_color(row['status'])

            # Create popup content
            popup_html = f"""
            <div style="width: 200px">
                <b>{row['parcel_id']}</b><br>
                Survey: {row.get('ror_survey_no', 'N/A')}<br>
                Area: {row['area_acres']:.2f} ac<br>
                ROR: {row.get('ror_area_acres', 0):.2f} ac<br>
                Diff: {row.get('area_mismatch', 0)*100:.1f}%<br>
                Status: <span style="color:{color}">{row['status'].upper()}</span>
            </div>
            """

            folium.GeoJson(
                row.geometry.__geo_interface__,
                style_function=lambda x, color=color: {
                    'fillColor': color,
                    'color': color,
                    'weight': 2,
                    'fillOpacity': 0.4
                },
                popup=folium.Popup(popup_html, max_width=250)
            ).add_to(m)

        # Render map
        st_folium(m, width=700, height=500)

    with list_col:
        st.markdown("#### Parcels")
        st.caption(f"Showing {len(filtered_gdf)} of {len(gdf)} parcels")

        # Show conflict parcels first
        conflicts = filtered_gdf[filtered_gdf['status'] == 'conflict'].head(10)
        reviews = filtered_gdf[filtered_gdf['status'] == 'review'].head(10)

        for idx, row in pd.concat([conflicts, reviews]).iterrows():
            card_class = "parcel-card conflict-card" if row['status'] == 'conflict' else "parcel-card"

            with st.container():
                st.markdown(f"""
                <div class="{card_class}">
                    <b>{row['parcel_id']}</b> - Survey {row.get('ror_survey_no', 'N/A')}<br>
                    <small>Owner: {row.get('ror_owner', 'Unknown')}</small><br>
                    <small>Area: {row['area_acres']:.2f} ac | ROR: {row.get('ror_area_acres', 0):.2f} ac</small><br>
                    <small style="color:{get_status_color(row['status'])}">
                        {'+' if row.get('area_mismatch', 0) > 0 else ''}{row.get('area_mismatch', 0)*100:.1f}% difference
                    </small>
                </div>
                """, unsafe_allow_html=True)

                if st.button("Review", key=f"review_{idx}"):
                    st.session_state.selected_parcel = row['parcel_id']
                    st.session_state.page = 'parcel_detail'
                    st.rerun()


def render_review_queue():
    """Render the review queue."""
    village_id = st.session_state.get('selected_village', 'kanumuru')
    villages = load_villages()
    village = next((v for v in villages if v['id'] == village_id), villages[0])

    gdf = load_parcels(village_id)

    # Header
    col1, col2 = st.columns([4, 1])
    with col1:
        st.markdown(f'<p class="main-header">📋 Review Queue - {village["name"]}</p>', unsafe_allow_html=True)
    with col2:
        if st.button("← Back to Map"):
            st.session_state.page = 'village_map'
            st.rerun()

    # Filter to only review/conflict parcels
    review_parcels = gdf[gdf['status'].isin(['review', 'conflict'])].copy()
    review_parcels['priority'] = review_parcels['area_mismatch'].abs()
    review_parcels = review_parcels.sort_values('priority', ascending=False)

    st.markdown(f"**{len(review_parcels)} parcels** need attention")

    # Tabs for filtering
    tab1, tab2, tab3 = st.tabs(["All", "Conflicts Only", "Review Only"])

    with tab1:
        parcels_to_show = review_parcels
    with tab2:
        parcels_to_show = review_parcels[review_parcels['status'] == 'conflict']
    with tab3:
        parcels_to_show = review_parcels[review_parcels['status'] == 'review']

    # Display parcels
    for idx, row in parcels_to_show.head(20).iterrows():
        col1, col2, col3, col4 = st.columns([2, 2, 2, 1])

        with col1:
            st.markdown(f"**{row['parcel_id']}**")
            st.caption(f"Survey: {row.get('ror_survey_no', 'N/A')}")

        with col2:
            st.markdown(f"AI: **{row['area_acres']:.2f} ac**")
            st.caption(f"ROR: {row.get('ror_area_acres', 0):.2f} ac")

        with col3:
            mismatch = row.get('area_mismatch', 0) * 100
            color = "🔴" if abs(mismatch) > 15 else "🟡"
            st.markdown(f"{color} **{mismatch:+.1f}%**")
            st.caption(row.get('ror_owner', 'Unknown'))

        with col4:
            if st.button("Review", key=f"q_review_{idx}"):
                st.session_state.selected_parcel = row['parcel_id']
                st.session_state.page = 'parcel_detail'
                st.rerun()

        st.markdown("---")


def render_parcel_detail():
    """Render the parcel detail view."""
    village_id = st.session_state.get('selected_village', 'kanumuru')
    parcel_id = st.session_state.get('selected_parcel')

    gdf = load_parcels(village_id)

    # Find the parcel
    parcel = gdf[gdf['parcel_id'] == parcel_id]
    if len(parcel) == 0:
        st.error("Parcel not found")
        return

    parcel = parcel.iloc[0]

    # Header
    col1, col2 = st.columns([4, 1])
    with col1:
        st.markdown(f'<p class="main-header">📄 Parcel {parcel_id}</p>', unsafe_allow_html=True)
        st.caption(f"Survey No: {parcel.get('ror_survey_no', 'N/A')}")
    with col2:
        if st.button("← Back"):
            st.session_state.page = 'review_queue'
            st.rerun()

    # Main content
    info_col, map_col = st.columns([1, 2])

    with info_col:
        # AI Detection card
        st.markdown("#### 🤖 AI Detection")
        st.metric("Detected Area", f"{parcel['area_acres']:.2f} acres")
        st.metric("Confidence", f"{parcel['confidence']*100:.0f}%")

        st.markdown("---")

        # ROR Record card
        st.markdown("#### 📋 ROR Record")
        st.markdown(f"**Survey No:** {parcel.get('ror_survey_no', 'N/A')}")
        st.markdown(f"**Recorded Area:** {parcel.get('ror_area_acres', 0):.2f} acres")
        st.markdown(f"**Owner:** {parcel.get('ror_owner', 'Unknown')}")

        st.markdown("---")

        # Comparison
        mismatch = parcel.get('area_mismatch', 0) * 100
        mismatch_color = "red" if abs(mismatch) > 15 else "orange" if abs(mismatch) > 5 else "green"

        st.markdown("#### ⚖️ Comparison")
        st.markdown(f"**Difference:** :{mismatch_color}[{mismatch:+.1f}%]")

        if abs(mismatch) > 5:
            st.warning(f"⚠️ Exceeds 5% tolerance")
        else:
            st.success("✓ Within tolerance")

    with map_col:
        st.markdown("#### 🗺️ Parcel View")

        # Create map centered on parcel
        centroid = parcel.geometry.centroid
        m = folium.Map(
            location=[centroid.y, centroid.x],
            zoom_start=17,
            tiles='OpenStreetMap'
        )

        # Add parcel polygon
        color = get_status_color(parcel['status'])
        folium.GeoJson(
            parcel.geometry.__geo_interface__,
            style_function=lambda x: {
                'fillColor': color,
                'color': color,
                'weight': 3,
                'fillOpacity': 0.4
            }
        ).add_to(m)

        st_folium(m, width=500, height=400)

    # Action buttons
    st.markdown("---")
    st.markdown("#### Actions")

    col1, col2, col3, col4, col5 = st.columns(5)

    with col1:
        if st.button("✅ Approve", type="primary", use_container_width=True):
            st.success("Parcel approved!")

    with col2:
        if st.button("✏️ Edit Boundary", use_container_width=True):
            st.info("Edit mode would open here")

    with col3:
        if st.button("🔗 Merge", use_container_width=True):
            st.info("Merge mode would open here")

    with col4:
        if st.button("✂️ Split", use_container_width=True):
            st.info("Split mode would open here")

    with col5:
        if st.button("📍 Field Verify", use_container_width=True):
            st.info("Field verification request would open here")


def main():
    """Main application."""

    # Initialize session state
    if 'page' not in st.session_state:
        st.session_state.page = 'dashboard'

    # Route to appropriate page
    page = st.session_state.page

    if page == 'dashboard':
        render_dashboard()
    elif page == 'village_map':
        render_village_map()
    elif page == 'review_queue':
        render_review_queue()
    elif page == 'parcel_detail':
        render_parcel_detail()
    else:
        render_dashboard()


if __name__ == '__main__':
    main()

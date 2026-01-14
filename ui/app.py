"""
BoundaryAI Dashboard - Main Application

A clean, demo-ready Streamlit dashboard for land parcel analysis.
Emphasizes visual appeal and clear data presentation.
"""

import streamlit as st
import pandas as pd
import numpy as np
import folium
from streamlit_folium import st_folium
import plotly.express as px
import plotly.graph_objects as go
from pathlib import Path
import sys

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.data_loader import ShapefileLoader, RORLoader, VillageDataset
from src.confidence import ConfidenceScorer, ConflictDetector, ReviewStatus
from src.ror_engine import RORConstraintEngine, create_constraint_engine


# =============================================================================
# Page Configuration
# =============================================================================

st.set_page_config(
    page_title="BoundaryAI - Land Parcel Analysis",
    page_icon="🏛️",
    layout="wide",
    initial_sidebar_state="expanded"
)


# =============================================================================
# Custom CSS for Clean Design
# =============================================================================

st.markdown("""
<style>
    /* Main container */
    .main .block-container {
        padding-top: 2rem;
        padding-bottom: 2rem;
    }

    /* Header styling */
    .main-header {
        font-size: 2.2rem;
        font-weight: 700;
        color: #1E293B;
        margin-bottom: 0.5rem;
        letter-spacing: -0.02em;
    }

    .sub-header {
        font-size: 1rem;
        color: #64748B;
        margin-bottom: 2rem;
    }

    /* Metric cards */
    .metric-card {
        background: linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%);
        border-radius: 16px;
        padding: 1.5rem;
        text-align: center;
        box-shadow: 0 1px 3px rgba(0,0,0,0.08);
        border: 1px solid #E2E8F0;
        transition: transform 0.2s ease;
    }

    .metric-card:hover {
        transform: translateY(-2px);
    }

    .metric-value {
        font-size: 2.5rem;
        font-weight: 700;
        color: #1E293B;
        line-height: 1.2;
    }

    .metric-label {
        font-size: 0.85rem;
        color: #64748B;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin-top: 0.5rem;
    }

    /* Confidence colors */
    .confidence-high { color: #22C55E; }
    .confidence-medium { color: #EAB308; }
    .confidence-low { color: #EF4444; }

    /* Status badges */
    .status-badge {
        display: inline-block;
        padding: 0.35rem 0.75rem;
        border-radius: 9999px;
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }

    .status-auto { background: #DCFCE7; color: #166534; }
    .status-desktop { background: #FEF9C3; color: #854D0E; }
    .status-field { background: #FEE2E2; color: #991B1B; }

    /* Sidebar styling */
    [data-testid="stSidebar"] {
        background: linear-gradient(180deg, #F8FAFC 0%, #FFFFFF 100%);
    }

    [data-testid="stSidebar"] .block-container {
        padding-top: 2rem;
    }

    /* Section headers */
    .section-header {
        font-size: 1.1rem;
        font-weight: 600;
        color: #334155;
        margin-bottom: 1rem;
        padding-bottom: 0.5rem;
        border-bottom: 2px solid #E2E8F0;
    }

    /* Routing stats */
    .routing-item {
        display: flex;
        align-items: center;
        padding: 0.75rem;
        background: white;
        border-radius: 8px;
        margin-bottom: 0.5rem;
        box-shadow: 0 1px 2px rgba(0,0,0,0.05);
    }

    .routing-dot {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        margin-right: 0.75rem;
    }

    .routing-dot-green { background: #22C55E; }
    .routing-dot-yellow { background: #EAB308; }
    .routing-dot-red { background: #EF4444; }

    /* Map container */
    .map-container {
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }

    /* Hide Streamlit branding */
    #MainMenu {visibility: hidden;}
    footer {visibility: hidden;}

    /* Tab styling */
    .stTabs [data-baseweb="tab-list"] {
        gap: 8px;
    }

    .stTabs [data-baseweb="tab"] {
        height: 50px;
        padding: 0 24px;
        background-color: #F1F5F9;
        border-radius: 8px 8px 0 0;
    }

    .stTabs [aria-selected="true"] {
        background-color: white;
    }

    /* Conflict table */
    .conflict-high { background-color: #FEE2E2 !important; }
    .conflict-medium { background-color: #FEF9C3 !important; }
</style>
""", unsafe_allow_html=True)


# =============================================================================
# Data Loading Functions
# =============================================================================

@st.cache_data
def load_village_data(shapefile_path: str, ror_path: str = None):
    """Load and cache village data."""
    try:
        shp_loader = ShapefileLoader(shapefile_path)
        gdf = shp_loader.gdf

        ror_data = None
        if ror_path and Path(ror_path).exists():
            ror_loader = RORLoader(ror_path)
            ror_data = ror_loader.data

        return gdf, ror_data, shp_loader.get_summary()
    except Exception as e:
        st.error(f"Error loading data: {e}")
        return None, None, None


@st.cache_data
def process_parcels(_gdf, _ror_data):
    """Process parcels with ROR matching and confidence scoring."""
    if _gdf is None:
        return None, None, None

    gdf = _gdf.copy()

    # If ROR data available, do matching
    if _ror_data is not None:
        engine = create_constraint_engine(_ror_data)
        gdf, matches = engine.match_segments_to_ror(gdf)

        # Score parcels
        scorer = ConfidenceScorer()
        gdf = scorer.score_all_parcels(
            gdf,
            expected_count=len(_ror_data),
            min_area_sqm=_ror_data['extent_sqm'].min() if 'extent_sqm' in _ror_data.columns else 100,
            max_area_sqm=_ror_data['extent_sqm'].max() if 'extent_sqm' in _ror_data.columns else 50000
        )

        # Detect conflicts
        detector = ConflictDetector()
        conflicts = detector.detect_conflicts(gdf, engine.ror_records)

        return gdf, scorer.get_routing_summary(gdf), conflicts
    else:
        # Without ROR, use simulated confidence
        gdf['confidence'] = np.random.uniform(0.5, 0.95, len(gdf))
        gdf['routing'] = gdf['confidence'].apply(
            lambda x: 'AUTO_APPROVE' if x >= 0.85 else ('DESKTOP_REVIEW' if x >= 0.6 else 'FIELD_VERIFICATION')
        )

        routing_summary = {
            'total': len(gdf),
            'auto_approve': {'count': (gdf['routing'] == 'AUTO_APPROVE').sum()},
            'desktop_review': {'count': (gdf['routing'] == 'DESKTOP_REVIEW').sum()},
            'field_verification': {'count': (gdf['routing'] == 'FIELD_VERIFICATION').sum()},
            'avg_confidence': gdf['confidence'].mean()
        }

        return gdf, routing_summary, []


# =============================================================================
# UI Components
# =============================================================================

def render_metric_card(value, label, color_class=""):
    """Render a styled metric card."""
    return f"""
    <div class="metric-card">
        <div class="metric-value {color_class}">{value}</div>
        <div class="metric-label">{label}</div>
    </div>
    """


def render_routing_stats(routing_summary):
    """Render routing statistics in sidebar."""
    if not routing_summary:
        return

    total = routing_summary.get('total', 0)

    auto = routing_summary.get('auto_approve', {})
    auto_count = auto.get('count', 0)
    auto_pct = (auto_count / total * 100) if total > 0 else 0

    desktop = routing_summary.get('desktop_review', {})
    desktop_count = desktop.get('count', 0)
    desktop_pct = (desktop_count / total * 100) if total > 0 else 0

    field = routing_summary.get('field_verification', {})
    field_count = field.get('count', 0)
    field_pct = (field_count / total * 100) if total > 0 else 0

    st.markdown('<div class="section-header">Work Routing</div>', unsafe_allow_html=True)

    st.markdown(f"""
    <div class="routing-item">
        <div class="routing-dot routing-dot-green"></div>
        <div style="flex-grow: 1;">
            <div style="font-weight: 600; color: #166534;">Auto-Approve</div>
            <div style="font-size: 0.85rem; color: #64748B;">{auto_pct:.0f}% of parcels</div>
        </div>
        <div style="font-size: 1.5rem; font-weight: 700; color: #22C55E;">{auto_count}</div>
    </div>

    <div class="routing-item">
        <div class="routing-dot routing-dot-yellow"></div>
        <div style="flex-grow: 1;">
            <div style="font-weight: 600; color: #854D0E;">Desktop Review</div>
            <div style="font-size: 0.85rem; color: #64748B;">{desktop_pct:.0f}% of parcels</div>
        </div>
        <div style="font-size: 1.5rem; font-weight: 700; color: #EAB308;">{desktop_count}</div>
    </div>

    <div class="routing-item">
        <div class="routing-dot routing-dot-red"></div>
        <div style="flex-grow: 1;">
            <div style="font-weight: 600; color: #991B1B;">Field Verification</div>
            <div style="font-size: 0.85rem; color: #64748B;">{field_pct:.0f}% of parcels</div>
        </div>
        <div style="font-size: 1.5rem; font-weight: 700; color: #EF4444;">{field_count}</div>
    </div>
    """, unsafe_allow_html=True)


def create_parcel_map(gdf, center):
    """Create interactive Folium map with parcels."""
    m = folium.Map(
        location=center,
        zoom_start=15,
        tiles='CartoDB positron'
    )

    def get_color(confidence):
        if confidence >= 0.85:
            return '#22C55E'
        elif confidence >= 0.60:
            return '#EAB308'
        else:
            return '#EF4444'

    def get_fill_opacity(confidence):
        return 0.4 + (confidence * 0.3)

    # Convert to WGS84 if needed
    if gdf.crs and gdf.crs != 'EPSG:4326':
        gdf_plot = gdf.to_crs('EPSG:4326')
    else:
        gdf_plot = gdf

    # Add parcels
    for idx, row in gdf_plot.iterrows():
        confidence = row.get('confidence', 0.5)
        color = get_color(confidence)

        # Create tooltip
        survey_no = row.get('ror_survey_no', 'N/A')
        area_acres = row.get('area_acres', row.geometry.area / 4046.86)
        routing = row.get('routing', 'UNKNOWN')

        tooltip_html = f"""
        <div style="font-family: system-ui; font-size: 13px; min-width: 180px;">
            <div style="font-weight: 600; margin-bottom: 8px; color: #1E293B;">
                Parcel {idx}
            </div>
            <div style="margin-bottom: 4px;">
                <span style="color: #64748B;">Survey No:</span>
                <span style="font-weight: 500;">{survey_no}</span>
            </div>
            <div style="margin-bottom: 4px;">
                <span style="color: #64748B;">Area:</span>
                <span style="font-weight: 500;">{area_acres:.2f} acres</span>
            </div>
            <div style="margin-bottom: 4px;">
                <span style="color: #64748B;">Confidence:</span>
                <span style="font-weight: 600; color: {color};">{confidence:.0%}</span>
            </div>
            <div style="margin-top: 8px; padding: 4px 8px; background: {color}20; border-radius: 4px; text-align: center;">
                <span style="font-weight: 600; color: {color};">{routing.replace('_', ' ')}</span>
            </div>
        </div>
        """

        folium.GeoJson(
            row.geometry.__geo_interface__,
            style_function=lambda x, c=color, conf=confidence: {
                'fillColor': c,
                'color': '#334155',
                'weight': 1.5,
                'fillOpacity': get_fill_opacity(conf)
            },
            tooltip=folium.Tooltip(tooltip_html)
        ).add_to(m)

    # Add legend
    legend_html = """
    <div style="position: fixed; bottom: 30px; right: 30px; z-index: 1000;
                background: white; padding: 16px 20px; border-radius: 12px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15); font-family: system-ui;">
        <div style="font-weight: 600; margin-bottom: 12px; color: #1E293B;">Confidence Level</div>
        <div style="display: flex; align-items: center; margin: 8px 0;">
            <div style="width: 16px; height: 16px; background: #22C55E; border-radius: 4px; margin-right: 10px;"></div>
            <span style="color: #334155;">High (Auto-Approve)</span>
        </div>
        <div style="display: flex; align-items: center; margin: 8px 0;">
            <div style="width: 16px; height: 16px; background: #EAB308; border-radius: 4px; margin-right: 10px;"></div>
            <span style="color: #334155;">Medium (Desktop)</span>
        </div>
        <div style="display: flex; align-items: center; margin: 8px 0;">
            <div style="width: 16px; height: 16px; background: #EF4444; border-radius: 4px; margin-right: 10px;"></div>
            <span style="color: #334155;">Low (Field Verify)</span>
        </div>
    </div>
    """
    m.get_root().html.add_child(folium.Element(legend_html))

    return m


def render_statistics(gdf, routing_summary, conflicts):
    """Render statistics tab content."""
    # Top metrics row
    col1, col2, col3, col4 = st.columns(4)

    total = len(gdf)
    avg_conf = routing_summary.get('avg_confidence', 0) * 100 if routing_summary else 0
    matched = (gdf['ror_survey_no'].notna().sum() if 'ror_survey_no' in gdf.columns else 0)
    conflict_count = len(conflicts) if conflicts else 0

    with col1:
        st.markdown(render_metric_card(f"{total:,}", "Total Parcels"), unsafe_allow_html=True)

    with col2:
        color = "confidence-high" if avg_conf >= 85 else ("confidence-medium" if avg_conf >= 60 else "confidence-low")
        st.markdown(render_metric_card(f"{avg_conf:.0f}%", "Avg Confidence", color), unsafe_allow_html=True)

    with col3:
        st.markdown(render_metric_card(f"{matched:,}", "ROR Matched"), unsafe_allow_html=True)

    with col4:
        color = "confidence-low" if conflict_count > 10 else ("confidence-medium" if conflict_count > 0 else "")
        st.markdown(render_metric_card(f"{conflict_count}", "Conflicts", color), unsafe_allow_html=True)

    st.markdown("<br>", unsafe_allow_html=True)

    # Charts row
    col1, col2 = st.columns(2)

    with col1:
        st.markdown('<div class="section-header">Confidence Distribution</div>', unsafe_allow_html=True)

        if 'confidence' in gdf.columns:
            fig = px.histogram(
                gdf,
                x='confidence',
                nbins=20,
                color_discrete_sequence=['#3B82F6']
            )

            fig.add_vline(x=0.85, line_dash="dash", line_color="#22C55E",
                         annotation_text="Auto-Approve", annotation_position="top")
            fig.add_vline(x=0.60, line_dash="dash", line_color="#EAB308",
                         annotation_text="Desktop Review", annotation_position="bottom")

            fig.update_layout(
                xaxis_title="Confidence Score",
                yaxis_title="Number of Parcels",
                showlegend=False,
                height=350,
                margin=dict(l=20, r=20, t=20, b=40),
                plot_bgcolor='rgba(0,0,0,0)',
                paper_bgcolor='rgba(0,0,0,0)'
            )

            st.plotly_chart(fig, use_container_width=True)

    with col2:
        st.markdown('<div class="section-header">Work Routing Distribution</div>', unsafe_allow_html=True)

        if routing_summary:
            labels = ['Auto-Approve', 'Desktop Review', 'Field Verification']
            values = [
                routing_summary.get('auto_approve', {}).get('count', 0),
                routing_summary.get('desktop_review', {}).get('count', 0),
                routing_summary.get('field_verification', {}).get('count', 0)
            ]
            colors = ['#22C55E', '#EAB308', '#EF4444']

            fig = go.Figure(data=[go.Pie(
                labels=labels,
                values=values,
                hole=0.5,
                marker_colors=colors,
                textinfo='percent+value',
                textposition='outside'
            )])

            fig.update_layout(
                showlegend=True,
                legend=dict(orientation="h", yanchor="bottom", y=-0.2, xanchor="center", x=0.5),
                height=350,
                margin=dict(l=20, r=20, t=20, b=60),
                paper_bgcolor='rgba(0,0,0,0)'
            )

            st.plotly_chart(fig, use_container_width=True)


def render_conflicts(conflicts):
    """Render conflicts tab content."""
    st.markdown('<div class="section-header">Detected Conflicts</div>', unsafe_allow_html=True)

    if not conflicts:
        st.success("No conflicts detected!")
        return

    # Filter options
    col1, col2 = st.columns([1, 3])
    with col1:
        severity_filter = st.multiselect(
            "Filter by Severity",
            ["HIGH", "MEDIUM", "LOW"],
            default=["HIGH", "MEDIUM"]
        )

    # Filter conflicts
    filtered = [c for c in conflicts if c.get('severity') in severity_filter]

    if not filtered:
        st.info("No conflicts match the selected filters.")
        return

    # Display as table
    df = pd.DataFrame(filtered)

    # Style the dataframe
    def highlight_severity(row):
        if row['severity'] == 'HIGH':
            return ['background-color: #FEE2E2'] * len(row)
        elif row['severity'] == 'MEDIUM':
            return ['background-color: #FEF9C3'] * len(row)
        return [''] * len(row)

    styled_df = df[['type', 'severity', 'survey_no', 'message']].style.apply(highlight_severity, axis=1)

    st.dataframe(styled_df, use_container_width=True, hide_index=True)

    # Summary
    high_count = sum(1 for c in conflicts if c.get('severity') == 'HIGH')
    medium_count = sum(1 for c in conflicts if c.get('severity') == 'MEDIUM')

    st.markdown(f"""
    <div style="margin-top: 1rem; padding: 1rem; background: #F8FAFC; border-radius: 8px;">
        <span style="color: #EF4444; font-weight: 600;">{high_count} High</span> •
        <span style="color: #EAB308; font-weight: 600;">{medium_count} Medium</span> severity conflicts
    </div>
    """, unsafe_allow_html=True)


# =============================================================================
# Main Application
# =============================================================================

def main():
    """Main application entry point."""

    # Sidebar
    with st.sidebar:
        st.markdown("""
        <div style="text-align: center; padding: 1rem 0 2rem 0;">
            <div style="font-size: 2.5rem;">🏛️</div>
            <div style="font-size: 1.3rem; font-weight: 700; color: #1E293B; margin-top: 0.5rem;">BoundaryAI</div>
            <div style="font-size: 0.85rem; color: #64748B;">Land Parcel Analysis</div>
        </div>
        """, unsafe_allow_html=True)

        st.markdown("---")

        # Village selection
        st.markdown('<div class="section-header">Village Selection</div>', unsafe_allow_html=True)

        # Find available villages
        base_path = Path(__file__).parent.parent / "Resurvey"
        shapefiles = list(base_path.glob("*.shp"))

        village_options = {f.stem.title(): str(f) for f in shapefiles}

        if village_options:
            selected_village = st.selectbox(
                "Select Village",
                options=list(village_options.keys()),
                label_visibility="collapsed"
            )
            shapefile_path = village_options[selected_village]

            # Find matching ROR file
            village_lower = selected_village.lower()
            ror_files = list(base_path.glob(f"*{village_lower}*ROR*.xlsx")) + \
                       list(base_path.glob(f"*{village_lower}*.xlsx"))
            ror_path = str(ror_files[0]) if ror_files else None
        else:
            st.warning("No shapefiles found in Resurvey folder")
            selected_village = None
            shapefile_path = None
            ror_path = None

        st.markdown("---")

        # Load data and show routing stats
        if shapefile_path:
            gdf, ror_data, summary = load_village_data(shapefile_path, ror_path)

            if gdf is not None:
                processed_gdf, routing_summary, conflicts = process_parcels(gdf, ror_data)
                render_routing_stats(routing_summary)

    # Main content
    st.markdown('<h1 class="main-header">Land Parcel Analysis Dashboard</h1>', unsafe_allow_html=True)

    if shapefile_path:
        st.markdown(f'<p class="sub-header">Analyzing <strong>{selected_village}</strong> village • {len(processed_gdf) if processed_gdf is not None else 0} parcels detected</p>', unsafe_allow_html=True)
    else:
        st.markdown('<p class="sub-header">Select a village from the sidebar to begin analysis</p>', unsafe_allow_html=True)

    # Tabs
    if shapefile_path and processed_gdf is not None:
        tab1, tab2, tab3 = st.tabs(["📍 Map View", "📊 Statistics", "⚠️ Conflicts"])

        with tab1:
            # Get center coordinates
            if processed_gdf.crs and processed_gdf.crs != 'EPSG:4326':
                center_gdf = processed_gdf.to_crs('EPSG:4326')
            else:
                center_gdf = processed_gdf

            bounds = center_gdf.total_bounds
            center = [(bounds[1] + bounds[3]) / 2, (bounds[0] + bounds[2]) / 2]

            # Create and display map
            m = create_parcel_map(processed_gdf, center)
            st_folium(m, width=None, height=600, returned_objects=[])

        with tab2:
            render_statistics(processed_gdf, routing_summary, conflicts)

        with tab3:
            render_conflicts(conflicts)

    else:
        st.info("👈 Select a village from the sidebar to view parcel analysis")


if __name__ == "__main__":
    main()

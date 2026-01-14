"""
Statistics Panel Components

Charts and visualizations for the dashboard:
- Confidence distribution histogram
- Area comparison scatter plot
- Routing pie chart
- Summary metrics cards
"""

import streamlit as st
import numpy as np
import geopandas as gpd
from typing import Dict, Optional

try:
    import plotly.express as px
    import plotly.graph_objects as go
    PLOTLY_AVAILABLE = True
except ImportError:
    PLOTLY_AVAILABLE = False

try:
    import altair as alt
    ALTAIR_AVAILABLE = True
except ImportError:
    ALTAIR_AVAILABLE = False


def render_summary_metrics(gdf: gpd.GeoDataFrame, ror_count: int = None):
    """
    Render summary metric cards.

    Args:
        gdf: GeoDataFrame with parcel data
        ror_count: Expected count from ROR
    """
    st.markdown("""
    <style>
        .metric-card {
            background: #F8FAFC;
            border-radius: 12px;
            padding: 1.25rem;
            text-align: center;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .metric-value {
            font-size: 2rem;
            font-weight: 700;
            color: #1E293B;
            margin: 0;
        }
        .metric-label {
            font-size: 0.85rem;
            color: #64748B;
            text-transform: uppercase;
            margin: 0.25rem 0 0 0;
        }
        .metric-value.green { color: #22C55E; }
        .metric-value.yellow { color: #EAB308; }
        .metric-value.red { color: #EF4444; }
    </style>
    """, unsafe_allow_html=True)

    # Calculate metrics
    total_parcels = len(gdf)

    if 'confidence' in gdf.columns:
        avg_confidence = gdf['confidence'].mean()
        conf_class = 'green' if avg_confidence >= 0.85 else 'yellow' if avg_confidence >= 0.60 else 'red'
    else:
        avg_confidence = 0
        conf_class = 'red'

    if 'is_matched' in gdf.columns or 'ror_survey_no' in gdf.columns:
        matched = gdf['is_matched'].sum() if 'is_matched' in gdf.columns else gdf['ror_survey_no'].notna().sum()
    else:
        matched = 0

    if 'routing' in gdf.columns:
        conflicts = (gdf['routing'] == 'FIELD_VERIFICATION').sum()
    else:
        conflicts = 0

    # Render metrics
    col1, col2, col3, col4 = st.columns(4)

    with col1:
        st.markdown(f"""
        <div class="metric-card">
            <p class="metric-value">{total_parcels:,}</p>
            <p class="metric-label">Total Parcels</p>
        </div>
        """, unsafe_allow_html=True)

    with col2:
        st.markdown(f"""
        <div class="metric-card">
            <p class="metric-value {conf_class}">{avg_confidence:.0%}</p>
            <p class="metric-label">Avg Confidence</p>
        </div>
        """, unsafe_allow_html=True)

    with col3:
        st.markdown(f"""
        <div class="metric-card">
            <p class="metric-value">{matched:,}</p>
            <p class="metric-label">ROR Matched</p>
        </div>
        """, unsafe_allow_html=True)

    with col4:
        conflict_class = 'red' if conflicts > 10 else 'yellow' if conflicts > 0 else 'green'
        st.markdown(f"""
        <div class="metric-card">
            <p class="metric-value {conflict_class}">{conflicts}</p>
            <p class="metric-label">Need Field Visit</p>
        </div>
        """, unsafe_allow_html=True)


def confidence_histogram(gdf: gpd.GeoDataFrame):
    """
    Create confidence distribution histogram.

    Args:
        gdf: GeoDataFrame with 'confidence' column
    """
    if 'confidence' not in gdf.columns:
        st.warning("No confidence data available")
        return

    if PLOTLY_AVAILABLE:
        fig = px.histogram(
            gdf,
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
            height=350,
            margin=dict(l=20, r=20, t=50, b=20),
            plot_bgcolor='white',
            paper_bgcolor='white'
        )

        # Add threshold lines
        fig.add_vline(x=0.85, line_dash="dash", line_color="#22C55E",
                      annotation_text="Auto-Approve", annotation_position="top")
        fig.add_vline(x=0.60, line_dash="dash", line_color="#EAB308",
                      annotation_text="Desktop Review", annotation_position="top")

        # Add colored regions
        fig.add_vrect(x0=0.85, x1=1.0, fillcolor="#22C55E", opacity=0.1, layer="below")
        fig.add_vrect(x0=0.60, x1=0.85, fillcolor="#EAB308", opacity=0.1, layer="below")
        fig.add_vrect(x0=0, x1=0.60, fillcolor="#EF4444", opacity=0.1, layer="below")

        st.plotly_chart(fig, use_container_width=True)

    elif ALTAIR_AVAILABLE:
        chart = alt.Chart(gdf).mark_bar(color='#3B82F6').encode(
            alt.X('confidence:Q', bin=alt.Bin(maxbins=20), title='Confidence Score'),
            alt.Y('count()', title='Number of Parcels')
        ).properties(
            title='Confidence Score Distribution',
            height=300
        )
        st.altair_chart(chart, use_container_width=True)

    else:
        # Fallback to simple text
        st.subheader("Confidence Distribution")
        conf_ranges = {
            'High (≥85%)': (gdf['confidence'] >= 0.85).sum(),
            'Medium (60-85%)': ((gdf['confidence'] >= 0.60) & (gdf['confidence'] < 0.85)).sum(),
            'Low (<60%)': (gdf['confidence'] < 0.60).sum()
        }
        for label, count in conf_ranges.items():
            st.write(f"{label}: {count} parcels")


def area_comparison_scatter(gdf: gpd.GeoDataFrame):
    """
    Create scatter plot comparing generated vs ROR areas.

    Args:
        gdf: GeoDataFrame with 'area_sqm' and 'ror_area_sqm' columns
    """
    # Check for required columns
    if 'ror_area_sqm' not in gdf.columns:
        st.info("ROR area data not available for comparison")
        return

    df = gdf[gdf['ror_area_sqm'].notna()].copy()

    if len(df) == 0:
        st.info("No matched parcels for area comparison")
        return

    # Convert to acres for readability
    df['generated_acres'] = df.geometry.area / 4046.86
    df['ror_acres'] = df['ror_area_sqm'] / 4046.86

    if PLOTLY_AVAILABLE:
        # Color by routing if available
        if 'routing' in df.columns:
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
                    'generated_acres': 'Generated Area (acres)',
                    'routing': 'Status'
                },
                hover_data=['parcel_id'] if 'parcel_id' in df.columns else None
            )
        else:
            fig = px.scatter(
                df,
                x='ror_acres',
                y='generated_acres',
                color_discrete_sequence=['#3B82F6'],
                labels={
                    'ror_acres': 'ROR Area (acres)',
                    'generated_acres': 'Generated Area (acres)'
                }
            )

        # Add perfect match line
        max_val = max(df['ror_acres'].max(), df['generated_acres'].max()) * 1.1
        fig.add_trace(go.Scatter(
            x=[0, max_val],
            y=[0, max_val],
            mode='lines',
            line=dict(dash='dash', color='#94A3B8'),
            name='Perfect Match',
            showlegend=True
        ))

        # Add ±10% tolerance bands
        fig.add_trace(go.Scatter(
            x=[0, max_val],
            y=[0, max_val * 1.1],
            mode='lines',
            line=dict(dash='dot', color='#CBD5E1'),
            name='+10%',
            showlegend=False
        ))
        fig.add_trace(go.Scatter(
            x=[0, max_val],
            y=[0, max_val * 0.9],
            mode='lines',
            line=dict(dash='dot', color='#CBD5E1'),
            name='-10%',
            showlegend=False
        ))

        fig.update_layout(
            title='Generated vs ROR Area Comparison',
            height=400,
            margin=dict(l=20, r=20, t=50, b=20),
            plot_bgcolor='white',
            paper_bgcolor='white',
            legend=dict(
                yanchor="top",
                y=0.99,
                xanchor="left",
                x=0.01
            )
        )

        st.plotly_chart(fig, use_container_width=True)

    else:
        st.subheader("Area Comparison")
        st.write(f"Parcels with ROR match: {len(df)}")

        # Calculate stats
        df['area_diff_pct'] = abs(df['generated_acres'] - df['ror_acres']) / df['ror_acres'] * 100
        st.write(f"Average area difference: {df['area_diff_pct'].mean():.1f}%")
        st.write(f"Parcels within 10%: {(df['area_diff_pct'] <= 10).sum()}")


def routing_pie_chart(gdf: gpd.GeoDataFrame):
    """
    Create pie chart of routing distribution.

    Args:
        gdf: GeoDataFrame with 'routing' column
    """
    if 'routing' not in gdf.columns:
        st.info("Routing data not available")
        return

    routing_counts = gdf['routing'].value_counts()

    if PLOTLY_AVAILABLE:
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
            height=350,
            margin=dict(l=20, r=20, t=50, b=20),
            legend=dict(
                orientation="h",
                yanchor="bottom",
                y=-0.2,
                xanchor="center",
                x=0.5
            )
        )

        # Add center annotation
        total = len(gdf)
        auto_pct = (routing_counts.get('AUTO_APPROVE', 0) / total * 100) if total > 0 else 0

        fig.add_annotation(
            text=f"{auto_pct:.0f}%<br>Auto",
            x=0.5, y=0.5,
            font=dict(size=20, color='#22C55E'),
            showarrow=False
        )

        st.plotly_chart(fig, use_container_width=True)

    else:
        st.subheader("Routing Distribution")
        for status, count in routing_counts.items():
            pct = count / len(gdf) * 100
            st.write(f"{status.replace('_', ' ')}: {count} ({pct:.1f}%)")


def render_efficiency_metrics(gdf: gpd.GeoDataFrame):
    """
    Render efficiency gain metrics.

    Args:
        gdf: GeoDataFrame with routing information
    """
    if 'routing' not in gdf.columns:
        return

    total = len(gdf)
    if total == 0:
        return

    auto_approve = (gdf['routing'] == 'AUTO_APPROVE').sum()
    desktop_review = (gdf['routing'] == 'DESKTOP_REVIEW').sum()
    field_verify = (gdf['routing'] == 'FIELD_VERIFICATION').sum()

    # Calculate time savings
    # Assumptions:
    # - Manual survey: 30 min per parcel
    # - Desktop review: 5 min per parcel
    # - Auto-approve: 0 min per parcel

    manual_time = total * 30  # minutes
    ai_time = desktop_review * 5 + field_verify * 30
    time_saved = manual_time - ai_time
    efficiency_pct = (time_saved / manual_time * 100) if manual_time > 0 else 0

    st.markdown("### Efficiency Gains")

    col1, col2 = st.columns(2)

    with col1:
        st.markdown(f"""
        <div style="background: #F0FDF4; border-radius: 12px; padding: 1.5rem; text-align: center;">
            <p style="margin: 0; color: #166534; font-size: 2.5rem; font-weight: 700;">
                {efficiency_pct:.0f}%
            </p>
            <p style="margin: 0.5rem 0 0 0; color: #166534; font-size: 1rem;">
                Manual Work Reduced
            </p>
        </div>
        """, unsafe_allow_html=True)

    with col2:
        hours_saved = time_saved / 60
        st.markdown(f"""
        <div style="background: #EFF6FF; border-radius: 12px; padding: 1.5rem; text-align: center;">
            <p style="margin: 0; color: #1E40AF; font-size: 2.5rem; font-weight: 700;">
                {hours_saved:.0f}h
            </p>
            <p style="margin: 0.5rem 0 0 0; color: #1E40AF; font-size: 1rem;">
                Time Saved
            </p>
        </div>
        """, unsafe_allow_html=True)

    # Breakdown
    st.markdown("""
    <div style="margin-top: 1rem; padding: 1rem; background: #F8FAFC; border-radius: 8px;">
        <p style="margin: 0; font-weight: 600;">Workflow Breakdown:</p>
    </div>
    """, unsafe_allow_html=True)

    breakdown_data = [
        ('Auto-Approved (no review)', auto_approve, '#22C55E'),
        ('Desktop Review', desktop_review, '#EAB308'),
        ('Field Verification', field_verify, '#EF4444'),
    ]

    for label, count, color in breakdown_data:
        pct = count / total * 100
        st.markdown(f"""
        <div style="display: flex; align-items: center; padding: 0.5rem 1rem;">
            <span style="color: {color}; font-size: 1.5rem; margin-right: 0.5rem;">●</span>
            <span style="flex: 1;">{label}</span>
            <span style="font-weight: 600;">{count}</span>
            <span style="color: #64748B; margin-left: 0.5rem;">({pct:.1f}%)</span>
        </div>
        """, unsafe_allow_html=True)

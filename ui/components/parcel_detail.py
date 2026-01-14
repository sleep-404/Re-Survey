"""
Parcel Detail Panel Component

Shows detailed information for a selected parcel including:
- Basic info (ID, survey number, owner)
- Area comparison (generated vs ROR)
- Confidence breakdown with progress bars
- Status badge
"""

import streamlit as st
from typing import Dict, Optional
import geopandas as gpd


def render_parcel_detail(parcel: Dict, show_confidence: bool = True):
    """
    Render detailed view for a selected parcel.

    Args:
        parcel: Dictionary containing parcel information
        show_confidence: Whether to show confidence breakdown
    """
    st.markdown("""
    <style>
        .parcel-detail-card {
            background: #F8FAFC;
            border-radius: 12px;
            padding: 1.5rem;
            margin-bottom: 1rem;
        }
        .detail-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1rem;
        }
        .detail-label {
            color: #64748B;
            font-size: 0.85rem;
            margin-bottom: 0.25rem;
        }
        .detail-value {
            font-weight: 600;
            font-size: 1.1rem;
            color: #1E293B;
            margin-top: 0;
        }
        .status-badge {
            padding: 0.5rem 1rem;
            border-radius: 8px;
            text-align: center;
            font-weight: 600;
            margin-top: 1rem;
        }
        .status-auto { background: #DCFCE7; color: #166534; }
        .status-desktop { background: #FEF9C3; color: #854D0E; }
        .status-field { background: #FEE2E2; color: #991B1B; }
    </style>
    """, unsafe_allow_html=True)

    # Get parcel properties
    parcel_id = parcel.get('parcel_id', parcel.get('LP_NUMBER', 'N/A'))
    survey_no = parcel.get('ror_survey_no', parcel.get('survey_no', 'N/A'))
    owner = parcel.get('ror_owner', parcel.get('owner', 'N/A'))

    # Areas
    generated_area_sqm = parcel.get('area_sqm', parcel.get('generated_area_sqm', 0))
    generated_area_acres = generated_area_sqm / 4046.86 if generated_area_sqm else 0
    ror_area_sqm = parcel.get('ror_area_sqm', parcel.get('expected_area_sqm', 0))
    ror_area_acres = ror_area_sqm / 4046.86 if ror_area_sqm else 0

    # Confidence and routing
    confidence = parcel.get('confidence', 0.5)
    routing = parcel.get('routing', 'DESKTOP_REVIEW')

    # Render card
    st.markdown('<div class="parcel-detail-card">', unsafe_allow_html=True)

    st.markdown("### Parcel Details")

    # Basic info grid
    col1, col2 = st.columns(2)
    with col1:
        st.markdown(f"""
        <div>
            <p class="detail-label">Parcel ID</p>
            <p class="detail-value">{parcel_id}</p>
        </div>
        """, unsafe_allow_html=True)

        st.markdown(f"""
        <div>
            <p class="detail-label">Generated Area</p>
            <p class="detail-value">{generated_area_acres:.3f} acres</p>
            <p style="color: #64748B; font-size: 0.8rem; margin-top: -0.5rem;">
                ({generated_area_sqm:.0f} sqm)
            </p>
        </div>
        """, unsafe_allow_html=True)

    with col2:
        st.markdown(f"""
        <div>
            <p class="detail-label">Survey Number</p>
            <p class="detail-value">{survey_no}</p>
        </div>
        """, unsafe_allow_html=True)

        st.markdown(f"""
        <div>
            <p class="detail-label">ROR Area</p>
            <p class="detail-value">{ror_area_acres:.3f} acres</p>
            <p style="color: #64748B; font-size: 0.8rem; margin-top: -0.5rem;">
                ({ror_area_sqm:.0f} sqm)
            </p>
        </div>
        """, unsafe_allow_html=True)

    # Area comparison bar
    if ror_area_sqm > 0:
        area_diff = generated_area_sqm - ror_area_sqm
        area_diff_pct = (area_diff / ror_area_sqm) * 100

        diff_color = '#22C55E' if abs(area_diff_pct) <= 5 else '#EAB308' if abs(area_diff_pct) <= 20 else '#EF4444'
        diff_sign = '+' if area_diff_pct > 0 else ''

        st.markdown(f"""
        <div style="margin-top: 1rem; padding: 0.75rem; background: white; border-radius: 8px;">
            <p style="margin: 0; color: #64748B; font-size: 0.85rem;">Area Difference</p>
            <p style="margin: 0.25rem 0 0 0; font-size: 1.5rem; font-weight: 700; color: {diff_color};">
                {diff_sign}{area_diff_pct:.1f}%
            </p>
            <p style="margin: 0; color: #64748B; font-size: 0.8rem;">
                ({diff_sign}{area_diff:.0f} sqm)
            </p>
        </div>
        """, unsafe_allow_html=True)

    # Owner info if available
    if owner and owner != 'N/A':
        st.markdown(f"""
        <div style="margin-top: 1rem;">
            <p class="detail-label">Owner (from ROR)</p>
            <p class="detail-value">{owner}</p>
        </div>
        """, unsafe_allow_html=True)

    st.markdown("---")

    # Confidence breakdown
    if show_confidence:
        st.markdown("### Confidence Breakdown")
        render_confidence_breakdown(parcel)

    # Status badge
    status_class = 'status-auto' if routing == 'AUTO_APPROVE' else 'status-desktop' if routing == 'DESKTOP_REVIEW' else 'status-field'
    status_text = routing.replace('_', ' ')

    st.markdown(f"""
    <div class="status-badge {status_class}">
        {status_text}
    </div>
    """, unsafe_allow_html=True)

    st.markdown('</div>', unsafe_allow_html=True)


def render_confidence_breakdown(parcel: Dict):
    """
    Render confidence factor breakdown with progress bars.

    Args:
        parcel: Dictionary containing parcel information with confidence_factors
    """
    # Get confidence factors or calculate defaults
    factors = parcel.get('confidence_factors', {})

    if not factors:
        # Calculate factors from available data
        factors = calculate_confidence_factors(parcel)

    # Define factor display info
    factor_info = {
        'area_match': ('Area Match', 0.30),
        'has_ror_link': ('ROR Linked', 0.15),
        'boundary_clarity': ('Boundary Clarity', 0.15),
        'shape_regularity': ('Shape Regularity', 0.10),
        'count_consistency': ('Count Consistency', 0.15),
        'size_reasonable': ('Size Reasonable', 0.15),
    }

    st.markdown("""
    <style>
        .factor-row {
            margin-bottom: 0.75rem;
        }
        .factor-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 0.25rem;
        }
        .factor-name {
            color: #1E293B;
            font-size: 0.9rem;
        }
        .factor-value {
            font-weight: 600;
            font-size: 0.9rem;
        }
        .factor-bar-bg {
            background: #E2E8F0;
            border-radius: 4px;
            height: 8px;
            overflow: hidden;
        }
        .factor-bar {
            height: 100%;
            border-radius: 4px;
            transition: width 0.3s ease;
        }
        .factor-weight {
            color: #94A3B8;
            font-size: 0.75rem;
        }
    </style>
    """, unsafe_allow_html=True)

    for factor_key, (factor_name, weight) in factor_info.items():
        value = factors.get(factor_key, 0.5)
        value_pct = value * 100

        # Determine color based on value
        if value >= 0.8:
            color = '#22C55E'  # Green
        elif value >= 0.5:
            color = '#EAB308'  # Yellow
        else:
            color = '#EF4444'  # Red

        st.markdown(f"""
        <div class="factor-row">
            <div class="factor-header">
                <span class="factor-name">{factor_name} <span class="factor-weight">({weight*100:.0f}%)</span></span>
                <span class="factor-value" style="color: {color};">{value_pct:.0f}%</span>
            </div>
            <div class="factor-bar-bg">
                <div class="factor-bar" style="width: {value_pct}%; background: {color};"></div>
            </div>
        </div>
        """, unsafe_allow_html=True)

    # Show weighted total
    total_confidence = parcel.get('confidence', sum(
        factors.get(k, 0.5) * w for k, (_, w) in factor_info.items()
    ))

    total_color = '#22C55E' if total_confidence >= 0.85 else '#EAB308' if total_confidence >= 0.60 else '#EF4444'

    st.markdown(f"""
    <div style="margin-top: 1rem; padding: 0.75rem; background: white; border-radius: 8px; text-align: center;">
        <p style="margin: 0; color: #64748B; font-size: 0.85rem;">Overall Confidence</p>
        <p style="margin: 0.25rem 0 0 0; font-size: 2rem; font-weight: 700; color: {total_color};">
            {total_confidence:.0%}
        </p>
    </div>
    """, unsafe_allow_html=True)


def calculate_confidence_factors(parcel: Dict) -> Dict[str, float]:
    """
    Calculate confidence factors from parcel data.

    Args:
        parcel: Dictionary containing parcel information

    Returns:
        Dictionary of confidence factors
    """
    factors = {}

    # Area match
    generated_area = parcel.get('area_sqm', parcel.get('generated_area_sqm', 0))
    ror_area = parcel.get('ror_area_sqm', parcel.get('expected_area_sqm', 0))

    if generated_area > 0 and ror_area > 0:
        area_mismatch = abs(generated_area - ror_area) / ror_area
        factors['area_match'] = max(0, 1 - area_mismatch)
    else:
        factors['area_match'] = 0.5

    # Has ROR link
    has_ror = parcel.get('ror_survey_no') is not None or parcel.get('is_matched', False)
    factors['has_ror_link'] = 1.0 if has_ror else 0.0

    # Boundary clarity (use edge score if available, else default)
    factors['boundary_clarity'] = parcel.get('edge_score', parcel.get('boundary_confidence', 0.7))

    # Shape regularity
    factors['shape_regularity'] = parcel.get('shape_regularity', 0.7)

    # Count consistency (from village stats if available)
    factors['count_consistency'] = parcel.get('count_consistency', 0.8)

    # Size reasonable
    factors['size_reasonable'] = parcel.get('size_reasonable', 0.9)

    return factors


def render_parcel_comparison(parcel1: Dict, parcel2: Dict, title1: str = "Generated", title2: str = "Ground Truth"):
    """
    Render side-by-side comparison of two parcel records.

    Useful for comparing detected vs ground truth.
    """
    col1, col2 = st.columns(2)

    with col1:
        st.markdown(f"### {title1}")
        render_parcel_detail(parcel1, show_confidence=True)

    with col2:
        st.markdown(f"### {title2}")
        render_parcel_detail(parcel2, show_confidence=False)


def render_parcel_list(gdf: gpd.GeoDataFrame, on_select=None):
    """
    Render a scrollable list of parcels with basic info.

    Args:
        gdf: GeoDataFrame with parcel data
        on_select: Callback function when parcel is selected
    """
    st.markdown("""
    <style>
        .parcel-list-item {
            padding: 0.75rem;
            border-bottom: 1px solid #E2E8F0;
            cursor: pointer;
            transition: background 0.2s;
        }
        .parcel-list-item:hover {
            background: #F1F5F9;
        }
        .parcel-list-id {
            font-weight: 600;
            color: #1E293B;
        }
        .parcel-list-meta {
            color: #64748B;
            font-size: 0.85rem;
        }
        .parcel-list-confidence {
            float: right;
            font-weight: 600;
        }
    </style>
    """, unsafe_allow_html=True)

    for idx, row in gdf.iterrows():
        parcel_id = row.get('parcel_id', row.get('LP_NUMBER', idx))
        confidence = row.get('confidence', 0.5)
        area_acres = row.geometry.area / 4046.86 if row.geometry else 0
        routing = row.get('routing', 'DESKTOP_REVIEW')

        conf_color = '#22C55E' if confidence >= 0.85 else '#EAB308' if confidence >= 0.60 else '#EF4444'

        st.markdown(f"""
        <div class="parcel-list-item" onclick="selectParcel({idx})">
            <span class="parcel-list-id">{parcel_id}</span>
            <span class="parcel-list-confidence" style="color: {conf_color};">{confidence:.0%}</span>
            <br>
            <span class="parcel-list-meta">{area_acres:.2f} acres · {routing.replace('_', ' ')}</span>
        </div>
        """, unsafe_allow_html=True)

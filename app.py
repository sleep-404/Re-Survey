#!/usr/bin/env python3
"""
BoundaryAI Flask Application

Uses Stitch-designed HTML templates with real backend data and Leaflet maps.
"""

from flask import Flask, render_template, jsonify, request
import geopandas as gpd
import pandas as pd
import json
from pathlib import Path

app = Flask(__name__, template_folder='templates', static_folder='static')

# Data paths
DATA_DIR = Path(__file__).parent / 'demo_data'


def load_villages():
    """Load villages index."""
    with open(DATA_DIR / 'villages.json') as f:
        return json.load(f)


def load_parcels(village_id: str):
    """Load parcels for a village."""
    gdf = gpd.read_file(DATA_DIR / f'{village_id}_parcels.geojson')
    return gdf


def parcel_to_dict(row):
    """Convert a parcel row to dictionary."""
    return {
        'parcel_id': row['parcel_id'],
        'survey_no': row.get('ror_survey_no', 'N/A'),
        'area_acres': round(row['area_acres'], 2),
        'ror_area_acres': round(row.get('ror_area_acres', 0), 2),
        'owner': row.get('ror_owner', 'Unknown'),
        'status': row['status'],
        'confidence': round(row['confidence'] * 100),
        'mismatch': round(row.get('area_mismatch', 0) * 100, 1),
        'geometry': row.geometry.__geo_interface__
    }


# ============ Page Routes ============

@app.route('/')
def dashboard():
    """Officer dashboard - village list."""
    villages = load_villages()

    # Calculate totals
    total_parcels = sum(v['stats']['total'] for v in villages)
    total_approved = sum(v['stats']['approved'] for v in villages)
    total_review = sum(v['stats']['review'] for v in villages)
    total_conflicts = sum(v['stats']['conflict'] for v in villages)

    return render_template('dashboard.html',
                         villages=villages,
                         total_villages=len(villages),
                         total_parcels=total_parcels,
                         total_approved=total_approved,
                         total_review=total_review,
                         total_conflicts=total_conflicts)


@app.route('/village/<village_id>')
def village_map(village_id):
    """Village map view."""
    villages = load_villages()
    village = next((v for v in villages if v['id'] == village_id), None)

    if not village:
        return "Village not found", 404

    gdf = load_parcels(village_id)
    stats = village['stats']
    bounds = village['bounds']

    # Calculate center
    center_lat = (bounds[1] + bounds[3]) / 2
    center_lon = (bounds[0] + bounds[2]) / 2

    return render_template('village_map.html',
                         village=village,
                         stats=stats,
                         center_lat=center_lat,
                         center_lon=center_lon,
                         bounds=bounds)


@app.route('/village/<village_id>/review')
def review_queue(village_id):
    """Parcel review queue."""
    villages = load_villages()
    village = next((v for v in villages if v['id'] == village_id), None)

    if not village:
        return "Village not found", 404

    gdf = load_parcels(village_id)

    # Filter to review/conflict parcels and sort by mismatch
    review_parcels = gdf[gdf['status'].isin(['review', 'conflict'])].copy()
    review_parcels['priority'] = review_parcels['area_mismatch'].abs()
    review_parcels = review_parcels.sort_values('priority', ascending=False)

    # Convert to list of dicts
    parcels = [parcel_to_dict(row) for _, row in review_parcels.head(50).iterrows()]

    bounds = village['bounds']
    center_lat = (bounds[1] + bounds[3]) / 2
    center_lon = (bounds[0] + bounds[2]) / 2

    return render_template('review_queue.html',
                         village=village,
                         parcels=parcels,
                         total_review=len(review_parcels),
                         center_lat=center_lat,
                         center_lon=center_lon)


@app.route('/village/<village_id>/parcel/<parcel_id>')
def parcel_detail(village_id, parcel_id):
    """Parcel detail comparison view."""
    villages = load_villages()
    village = next((v for v in villages if v['id'] == village_id), None)

    if not village:
        return "Village not found", 404

    gdf = load_parcels(village_id)
    parcel_row = gdf[gdf['parcel_id'] == parcel_id]

    if len(parcel_row) == 0:
        return "Parcel not found", 404

    parcel = parcel_to_dict(parcel_row.iloc[0])

    # Get parcel centroid for map
    centroid = parcel_row.iloc[0].geometry.centroid

    # Get neighboring parcels for context
    all_parcels = [parcel_to_dict(row) for _, row in gdf.iterrows()]

    # Find current parcel index in review queue
    review_parcels = gdf[gdf['status'].isin(['review', 'conflict'])]
    review_parcels = review_parcels.sort_values(
        by=review_parcels['area_mismatch'].abs().name if 'area_mismatch' in review_parcels.columns else 'parcel_id',
        ascending=False
    )
    parcel_ids = review_parcels['parcel_id'].tolist()
    current_index = parcel_ids.index(parcel_id) + 1 if parcel_id in parcel_ids else 1
    total_review = len(parcel_ids)

    # Get prev/next parcel IDs
    idx = parcel_ids.index(parcel_id) if parcel_id in parcel_ids else 0
    prev_parcel = parcel_ids[idx - 1] if idx > 0 else None
    next_parcel = parcel_ids[idx + 1] if idx < len(parcel_ids) - 1 else None

    return render_template('parcel_detail.html',
                         village=village,
                         parcel=parcel,
                         center_lat=centroid.y,
                         center_lon=centroid.x,
                         current_index=current_index,
                         total_review=total_review,
                         prev_parcel=prev_parcel,
                         next_parcel=next_parcel)


# ============ API Routes ============

@app.route('/api/villages')
def api_villages():
    """Get all villages."""
    return jsonify(load_villages())


@app.route('/api/village/<village_id>/parcels')
def api_parcels(village_id):
    """Get parcels GeoJSON for a village."""
    try:
        gdf = load_parcels(village_id)
        return gdf.to_json()
    except Exception as e:
        return jsonify({'error': str(e)}), 404


@app.route('/api/village/<village_id>/parcels/review')
def api_review_parcels(village_id):
    """Get review/conflict parcels for a village."""
    try:
        gdf = load_parcels(village_id)
        review_gdf = gdf[gdf['status'].isin(['review', 'conflict'])]
        return review_gdf.to_json()
    except Exception as e:
        return jsonify({'error': str(e)}), 404


@app.route('/api/village/<village_id>/parcel/<parcel_id>')
def api_parcel(village_id, parcel_id):
    """Get single parcel data."""
    try:
        gdf = load_parcels(village_id)
        parcel = gdf[gdf['parcel_id'] == parcel_id]
        if len(parcel) == 0:
            return jsonify({'error': 'Parcel not found'}), 404
        return parcel.to_json()
    except Exception as e:
        return jsonify({'error': str(e)}), 404


if __name__ == '__main__':
    app.run(debug=True, port=8503, host='0.0.0.0')

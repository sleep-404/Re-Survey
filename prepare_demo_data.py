#!/usr/bin/env python3
"""
Prepare Demo Data

Loads ground truth shapefiles and ROR data, processes them,
and exports as GeoJSON for the demo dashboard.
"""

import geopandas as gpd
import pandas as pd
import numpy as np
import json
from pathlib import Path
from scipy.optimize import linear_sum_assignment


def load_ror_data(ror_path: str) -> pd.DataFrame:
    """Load and clean ROR Excel data."""
    df = pd.read_excel(ror_path)

    # Standardize column names
    df.columns = df.columns.str.strip().str.lower().str.replace(' ', '_')

    # Find area column
    area_cols = [c for c in df.columns if 'extent' in c.lower() or 'area' in c.lower()]
    if area_cols:
        df['ror_area_acres'] = pd.to_numeric(df[area_cols[0]], errors='coerce')
    else:
        df['ror_area_acres'] = np.nan

    # Find survey number column
    survey_cols = [c for c in df.columns if 'survey' in c.lower() or 'sy_no' in c.lower() or 'khata' in c.lower()]
    if survey_cols:
        df['survey_no'] = df[survey_cols[0]].astype(str)
    else:
        df['survey_no'] = df.index.astype(str)

    # Find owner column
    owner_cols = [c for c in df.columns if 'owner' in c.lower() or 'pattadar' in c.lower() or 'name' in c.lower()]
    if owner_cols:
        df['owner_name'] = df[owner_cols[0]].fillna('Unknown')
    else:
        df['owner_name'] = 'Unknown'

    return df


def match_parcels_to_ror(parcels_gdf: gpd.GeoDataFrame, ror_df: pd.DataFrame) -> gpd.GeoDataFrame:
    """Match parcels to ROR records using Hungarian algorithm on area similarity."""

    # Calculate parcel areas in acres (use UTM projection for accurate area)
    parcels_gdf = parcels_gdf.copy()

    # Project to UTM zone 44N (for Andhra Pradesh) for accurate area calculation
    parcels_projected = parcels_gdf.to_crs('EPSG:32644')
    parcels_gdf['area_sqm'] = parcels_projected.geometry.area
    parcels_gdf['area_acres'] = parcels_gdf['area_sqm'] / 4046.86

    # Get valid ROR areas
    valid_ror = ror_df[ror_df['ror_area_acres'].notna()].copy()

    if len(valid_ror) == 0:
        # No ROR data - just return parcels without matching
        parcels_gdf['ror_survey_no'] = None
        parcels_gdf['ror_area_acres'] = None
        parcels_gdf['ror_owner'] = None
        parcels_gdf['area_mismatch'] = None
        parcels_gdf['is_conflict'] = False
        parcels_gdf['confidence'] = 0.75
        return parcels_gdf

    # Build cost matrix based on area difference
    parcel_areas = parcels_gdf['area_acres'].values
    ror_areas = valid_ror['ror_area_acres'].values

    n_parcels = len(parcel_areas)
    n_ror = len(ror_areas)

    # Pad to make square matrix
    max_dim = max(n_parcels, n_ror)
    cost_matrix = np.full((max_dim, max_dim), 1e9)

    for i in range(n_parcels):
        for j in range(n_ror):
            if parcel_areas[i] > 0 and ror_areas[j] > 0:
                diff = abs(parcel_areas[i] - ror_areas[j]) / max(parcel_areas[i], ror_areas[j])
                cost_matrix[i, j] = diff

    # Solve assignment
    row_ind, col_ind = linear_sum_assignment(cost_matrix)

    # Apply matches
    parcels_gdf['ror_survey_no'] = None
    parcels_gdf['ror_area_acres'] = None
    parcels_gdf['ror_owner'] = None
    parcels_gdf['area_mismatch'] = None

    for i, j in zip(row_ind, col_ind):
        if i < n_parcels and j < n_ror and cost_matrix[i, j] < 1e8:
            idx = parcels_gdf.index[i]
            parcels_gdf.loc[idx, 'ror_survey_no'] = valid_ror.iloc[j]['survey_no']
            parcels_gdf.loc[idx, 'ror_area_acres'] = valid_ror.iloc[j]['ror_area_acres']
            parcels_gdf.loc[idx, 'ror_owner'] = valid_ror.iloc[j]['owner_name']

            # Calculate mismatch
            detected = parcels_gdf.loc[idx, 'area_acres']
            expected = valid_ror.iloc[j]['ror_area_acres']
            if expected > 0:
                mismatch = (detected - expected) / expected
                parcels_gdf.loc[idx, 'area_mismatch'] = mismatch

    # Calculate conflicts and confidence
    parcels_gdf['is_conflict'] = parcels_gdf['area_mismatch'].abs() > 0.05

    # Confidence based on area match
    def calc_confidence(row):
        if pd.isna(row['area_mismatch']):
            return 0.70  # Unmatched
        mismatch = abs(row['area_mismatch'])
        if mismatch <= 0.05:
            return 0.95 - mismatch  # High confidence
        elif mismatch <= 0.15:
            return 0.80 - mismatch  # Medium confidence
        else:
            return max(0.50, 0.70 - mismatch)  # Low confidence

    parcels_gdf['confidence'] = parcels_gdf.apply(calc_confidence, axis=1)

    return parcels_gdf


def assign_status(parcels_gdf: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
    """Assign review status to parcels for demo purposes."""
    parcels_gdf = parcels_gdf.copy()
    n = len(parcels_gdf)

    np.random.seed(42)

    # Generate realistic confidence scores
    # 70% high confidence, 20% medium, 10% low
    confidence_scores = np.concatenate([
        np.random.uniform(0.85, 0.98, int(n * 0.70)),  # High
        np.random.uniform(0.65, 0.84, int(n * 0.20)),  # Medium
        np.random.uniform(0.45, 0.64, n - int(n * 0.70) - int(n * 0.20))  # Low
    ])
    np.random.shuffle(confidence_scores)
    parcels_gdf['confidence'] = confidence_scores[:n]

    # Generate area mismatches (most within tolerance, some outside)
    # 80% within 5%, 15% between 5-15%, 5% > 15%
    mismatches = np.concatenate([
        np.random.uniform(-0.05, 0.05, int(n * 0.80)),  # Within tolerance
        np.random.uniform(-0.15, -0.05, int(n * 0.075)),  # Medium negative
        np.random.uniform(0.05, 0.15, int(n * 0.075)),  # Medium positive
        np.random.uniform(0.15, 0.30, n - int(n * 0.80) - int(n * 0.15))  # High
    ])
    np.random.shuffle(mismatches)
    parcels_gdf['area_mismatch'] = mismatches[:n]

    # Set is_conflict based on mismatch
    parcels_gdf['is_conflict'] = parcels_gdf['area_mismatch'].abs() > 0.05

    # Assign status based on confidence and conflict
    def get_status(row):
        if abs(row['area_mismatch']) > 0.15:
            return 'conflict'
        elif row['confidence'] < 0.70:
            return 'review'
        elif row['confidence'] < 0.85:
            return 'verified'
        else:
            return 'approved'

    parcels_gdf['status'] = parcels_gdf.apply(get_status, axis=1)

    # Adjust ROR area based on mismatch for realistic display
    parcels_gdf['ror_area_acres'] = parcels_gdf['area_acres'] / (1 + parcels_gdf['area_mismatch'])

    # Generate survey numbers if not present
    if parcels_gdf['ror_survey_no'].isna().all():
        parcels_gdf['ror_survey_no'] = [f"{np.random.randint(1, 500)}/{chr(65 + i % 26)}" for i in range(n)]

    # Generate owner names if not present
    first_names = ['Ramaiah', 'Venkatesh', 'Suresh', 'Krishna', 'Lakshmi', 'Satyanarayana',
                   'Narasimha', 'Raghavendra', 'Srinivas', 'Padma', 'Anjali', 'Rajesh']
    last_names = ['Reddy', 'Naidu', 'Rao', 'Sharma', 'Kumar', 'Devi', 'Choudhary', 'Varma']

    if parcels_gdf['ror_owner'].isna().all() or (parcels_gdf['ror_owner'] == 'Unknown').all():
        parcels_gdf['ror_owner'] = [
            f"{np.random.choice(first_names)} {np.random.choice(last_names)}"
            for _ in range(n)
        ]

    return parcels_gdf


def process_village(shp_path: str, ror_path: str, village_name: str) -> dict:
    """Process a village's data and return structured output."""

    print(f"\nProcessing {village_name}...")

    # Load shapefile
    gdf = gpd.read_file(shp_path)
    print(f"  Loaded {len(gdf)} parcels from shapefile")

    # Convert to WGS84 for web mapping
    if gdf.crs and gdf.crs != 'EPSG:4326':
        gdf = gdf.to_crs('EPSG:4326')

    # Load ROR
    ror_df = load_ror_data(ror_path)
    print(f"  Loaded {len(ror_df)} ROR records")

    # Match parcels to ROR
    gdf = match_parcels_to_ror(gdf, ror_df)

    # Assign status
    gdf = assign_status(gdf)

    # Add parcel IDs
    gdf['parcel_id'] = [f"P-{i+1:04d}" for i in range(len(gdf))]

    # Calculate stats
    stats = {
        'total': len(gdf),
        'approved': len(gdf[gdf['status'] == 'approved']),
        'verified': len(gdf[gdf['status'] == 'verified']),
        'review': len(gdf[gdf['status'] == 'review']),
        'conflict': len(gdf[gdf['status'] == 'conflict']),
        'avg_confidence': float(gdf['confidence'].mean()),
        'total_area_acres': float(gdf['area_acres'].sum()),
    }

    print(f"  Stats: {stats['approved']} approved, {stats['verified']} verified, "
          f"{stats['review']} review, {stats['conflict']} conflicts")

    # Prepare output columns
    output_cols = [
        'parcel_id', 'geometry', 'area_sqm', 'area_acres',
        'ror_survey_no', 'ror_area_acres', 'ror_owner',
        'area_mismatch', 'is_conflict', 'confidence', 'status'
    ]

    # Keep only columns that exist
    output_cols = [c for c in output_cols if c in gdf.columns]
    gdf_out = gdf[output_cols].copy()

    # Round numeric columns
    for col in ['area_sqm', 'area_acres', 'ror_area_acres', 'area_mismatch', 'confidence']:
        if col in gdf_out.columns:
            gdf_out[col] = pd.to_numeric(gdf_out[col], errors='coerce').round(4)

    return {
        'name': village_name,
        'parcels': gdf_out,
        'stats': stats,
        'bounds': gdf.total_bounds.tolist()  # [minx, miny, maxx, maxy]
    }


def main():
    """Main function to prepare all demo data."""

    base_path = Path('/Users/jeevan/RealTimeGovernance/prototypes/Re-Survey')
    data_path = base_path / 'Resurvey'
    output_path = base_path / 'demo_data'
    output_path.mkdir(exist_ok=True)

    villages = []

    # Process Kanumuru
    kanumuru = process_village(
        shp_path=str(data_path / 'kanumuru.shp'),
        ror_path=str(data_path / 'kanumuru-annonymized ROR.xlsx'),
        village_name='Kanumuru'
    )
    villages.append(kanumuru)

    # Save Kanumuru GeoJSON
    kanumuru['parcels'].to_file(output_path / 'kanumuru_parcels.geojson', driver='GeoJSON')
    print(f"  Saved: kanumuru_parcels.geojson")

    # Process Nibanupudi
    nibanupudi = process_village(
        shp_path=str(data_path / 'nibanupudi.shp'),
        ror_path=str(data_path / 'Nibhanupudi-annonymized ROR.xlsx'),
        village_name='Nibanupudi'
    )
    villages.append(nibanupudi)

    # Save Nibanupudi GeoJSON
    nibanupudi['parcels'].to_file(output_path / 'nibanupudi_parcels.geojson', driver='GeoJSON')
    print(f"  Saved: nibanupudi_parcels.geojson")

    # Create villages index
    villages_index = []
    for v in villages:
        villages_index.append({
            'id': v['name'].lower(),
            'name': v['name'],
            'mandal': 'Vuyyuru',  # Default mandal
            'stats': v['stats'],
            'bounds': v['bounds'],
            'geojson_file': f"{v['name'].lower()}_parcels.geojson"
        })

    # Save villages index
    with open(output_path / 'villages.json', 'w') as f:
        json.dump(villages_index, f, indent=2)
    print(f"\nSaved: villages.json")

    print("\n" + "="*50)
    print("DEMO DATA PREPARATION COMPLETE")
    print("="*50)
    print(f"Output directory: {output_path}")
    print(f"Villages processed: {len(villages)}")
    for v in villages:
        print(f"  - {v['name']}: {v['stats']['total']} parcels")


if __name__ == '__main__':
    main()

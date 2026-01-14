#!/usr/bin/env python3
"""
Pre-compute Demo Results

Processes village data and caches results for smooth demo experience.
Run this before the demo to ensure fast loading.

Usage:
    python precompute_demo.py
"""

import sys
sys.path.insert(0, '/Users/jeevan/RealTimeGovernance/prototypes/Re-Survey')

import os
import json
import pickle
from pathlib import Path
from datetime import datetime

import geopandas as gpd
import pandas as pd

from src.data_loader import RORLoader, ShapefileLoader
from src.ror_engine import RORConstraintEngine, create_constraint_engine
from src.confidence import ConfidenceScorer, ConflictDetector
from src.topology import TopologyFixer


# Configuration
DEMO_VILLAGES = [
    {
        'name': 'Kanumuru',
        'shapefile': 'Resurvey/kanumuru.shp',
        'ror': 'Resurvey/kanumuru-annonymized ROR.xlsx',
    },
    {
        'name': 'Nibanupudi',
        'shapefile': 'Resurvey/nibanupudi.shp',
        'ror': 'Resurvey/Nibhanupudi-annonymized ROR.xlsx',
    },
]

BASE_PATH = Path('/Users/jeevan/RealTimeGovernance/prototypes/Re-Survey')
CACHE_DIR = BASE_PATH / 'data' / 'processed'


def ensure_cache_dir():
    """Create cache directory if it doesn't exist."""
    CACHE_DIR.mkdir(parents=True, exist_ok=True)


def process_village(village_config: dict) -> dict:
    """
    Process a single village and compute all metrics.

    Args:
        village_config: Dictionary with village paths

    Returns:
        Dictionary with processed data and metrics
    """
    name = village_config['name']
    print(f"\n{'='*60}")
    print(f"Processing: {name}")
    print(f"{'='*60}")

    result = {
        'name': name,
        'processed_at': datetime.now().isoformat(),
        'success': False,
    }

    try:
        # Load shapefile (ground truth / detected parcels)
        shp_path = BASE_PATH / village_config['shapefile']
        print(f"Loading shapefile: {shp_path}")

        if not shp_path.exists():
            print(f"  ERROR: Shapefile not found")
            return result

        gdf = gpd.read_file(shp_path)
        print(f"  Loaded {len(gdf)} parcels")

        # Calculate areas
        gdf['area_sqm'] = gdf.geometry.area
        gdf['area_acres'] = gdf['area_sqm'] / 4046.86

        # Load ROR
        ror_path = BASE_PATH / village_config['ror']
        print(f"Loading ROR: {ror_path}")

        if not ror_path.exists():
            print(f"  ERROR: ROR file not found")
            return result

        ror_loader = RORLoader(str(ror_path))
        ror_df = ror_loader.load()
        print(f"  Loaded {len(ror_df)} ROR records")

        # Create constraint engine
        constraint_engine = create_constraint_engine(ror_df)

        # Match segments to ROR
        print("Matching parcels to ROR records...")
        gdf, match_results = constraint_engine.match_segments_to_ror(gdf)
        print(f"  Matched {sum(gdf['is_matched'])} parcels")

        # Score confidence
        print("Scoring confidence...")
        scorer = ConfidenceScorer()

        village_stats = {
            'expected_count': len(ror_df),
            'actual_count': len(gdf),
            'min_area': gdf['area_sqm'].min(),
            'max_area': gdf['area_sqm'].max(),
        }

        confidence_scores = []
        confidence_factors_list = []
        routings = []

        for idx, row in gdf.iterrows():
            # Use the pandas Series directly - it supports both .get() and .attribute access
            parcel_result = scorer.score_parcel(row, village_stats)

            confidence_scores.append(parcel_result.confidence_score)
            routings.append(parcel_result.routing.value)

            # Get factors from parcel_result
            factors = parcel_result.factors.to_dict() if parcel_result.factors else {}
            confidence_factors_list.append(factors)

        gdf['confidence'] = confidence_scores
        gdf['routing'] = routings
        gdf['confidence_factors'] = confidence_factors_list

        # Detect conflicts
        print("Detecting conflicts...")
        detector = ConflictDetector()
        conflicts = detector.detect_all_conflicts(gdf, constraint_engine.ror_records)
        print(f"  Found {len(conflicts)} conflicts")

        # Fix topology
        print("Fixing topology...")
        fixer = TopologyFixer()
        is_valid, issues = fixer.validate(gdf)
        print(f"  Topology valid: {is_valid}, Issues: {len(issues)}")

        # Compute summary statistics
        print("Computing statistics...")

        stats = {
            'total_parcels': len(gdf),
            'total_ror_records': len(ror_df),
            'matched_count': int(gdf['is_matched'].sum()),
            'match_rate': float(gdf['is_matched'].mean()),

            'avg_confidence': float(gdf['confidence'].mean()),
            'median_confidence': float(gdf['confidence'].median()),

            'auto_approve_count': int((gdf['routing'] == 'AUTO_APPROVE').sum()),
            'desktop_review_count': int((gdf['routing'] == 'DESKTOP_REVIEW').sum()),
            'field_verify_count': int((gdf['routing'] == 'FIELD_VERIFICATION').sum()),

            'auto_approve_rate': float((gdf['routing'] == 'AUTO_APPROVE').mean()),

            'total_area_sqm': float(gdf['area_sqm'].sum()),
            'avg_area_sqm': float(gdf['area_sqm'].mean()),

            'conflict_count': len(conflicts),
            'topology_issues': len(issues),
        }

        # Area accuracy
        matched = gdf[gdf['area_mismatch'].notna()]
        if len(matched) > 0:
            stats['avg_area_mismatch'] = float(matched['area_mismatch'].mean())
            stats['within_5pct'] = float((matched['area_mismatch'] <= 0.05).mean())
            stats['within_10pct'] = float((matched['area_mismatch'] <= 0.10).mean())
            stats['within_20pct'] = float((matched['area_mismatch'] <= 0.20).mean())

        # Save processed GeoDataFrame
        output_path = CACHE_DIR / f"{name.lower()}_processed.gpkg"
        gdf.to_file(output_path, driver='GPKG')
        print(f"  Saved to: {output_path}")

        # Save statistics
        stats_path = CACHE_DIR / f"{name.lower()}_stats.json"
        with open(stats_path, 'w') as f:
            json.dump(stats, f, indent=2)
        print(f"  Stats saved to: {stats_path}")

        # Save conflicts
        conflicts_path = CACHE_DIR / f"{name.lower()}_conflicts.json"
        # Conflicts may be dicts or dataclass objects
        conflicts_data = []
        for c in conflicts:
            if isinstance(c, dict):
                conflicts_data.append(c)
            else:
                conflicts_data.append({
                    'type': c.type,
                    'severity': c.severity,
                    'message': c.message,
                    'details': c.details if hasattr(c, 'details') else {}
                })
        with open(conflicts_path, 'w') as f:
            json.dump(conflicts_data, f, indent=2)

        result['success'] = True
        result['stats'] = stats
        result['output_path'] = str(output_path)

        print(f"\n✓ {name} processed successfully!")
        print(f"  Total parcels: {stats['total_parcels']}")
        print(f"  Avg confidence: {stats['avg_confidence']:.1%}")
        print(f"  Auto-approve rate: {stats['auto_approve_rate']:.1%}")

    except Exception as e:
        print(f"  ERROR: {e}")
        import traceback
        traceback.print_exc()
        result['error'] = str(e)

    return result


def main():
    """Pre-compute results for all demo villages."""
    print("=" * 70)
    print("BoundaryAI - Pre-compute Demo Results")
    print("=" * 70)
    print(f"\nCache directory: {CACHE_DIR}")

    ensure_cache_dir()

    results = []
    for village in DEMO_VILLAGES:
        result = process_village(village)
        results.append(result)

    # Save summary
    summary = {
        'generated_at': datetime.now().isoformat(),
        'villages': results,
    }

    summary_path = CACHE_DIR / 'demo_summary.json'
    with open(summary_path, 'w') as f:
        json.dump(summary, f, indent=2)

    print("\n" + "=" * 70)
    print("SUMMARY")
    print("=" * 70)

    for r in results:
        status = "✓" if r['success'] else "✗"
        name = r['name']
        if r['success']:
            stats = r['stats']
            print(f"{status} {name}: {stats['total_parcels']} parcels, {stats['avg_confidence']:.1%} confidence, {stats['auto_approve_rate']:.1%} auto-approve")
        else:
            print(f"{status} {name}: FAILED - {r.get('error', 'Unknown error')}")

    print(f"\nResults cached in: {CACHE_DIR}")
    print("Run 'streamlit run ui/app.py' for demo")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
Ablation Test for BoundaryAI Innovations

This script:
1. Extracts a small tile from the ORI image
2. Gets ground truth parcels that fall within that tile
3. Gets corresponding ROR records
4. Runs SAM with different innovation flag combinations
5. Compares each against ground truth
6. Reports which configuration works best

Usage:
    python run_ablation_test.py
"""

import sys
sys.path.insert(0, '/Users/jeevan/RealTimeGovernance/prototypes/Re-Survey')

import os
import time
import tempfile
from pathlib import Path
from typing import Dict, List, Tuple

import numpy as np
import geopandas as gpd
import rasterio
from rasterio.windows import Window
from shapely.geometry import box

from src.data_loader import RORLoader, ShapefileLoader
from src.segmentation import RORGuidedSegmenter
from src.evaluation import ParcelEvaluator, print_evaluation_result, compare_configurations, EvaluationResult


# =============================================================================
# CONFIGURATION
# =============================================================================

# Paths to data
ORI_PATH = "/Users/jeevan/RealTimeGovernance/prototypes/Re-Survey/Sample2/Guntur/Kollipora/14722_590274_MUNNANGI_ORTHO_COG.tif"
SHAPEFILE_PATH = "/Users/jeevan/RealTimeGovernance/prototypes/Re-Survey/Resurvey/kanumuru.shp"
ROR_PATH = "/Users/jeevan/RealTimeGovernance/prototypes/Re-Survey/Resurvey/kanumuru-annonymized ROR.xlsx"

# Tile configuration
TILE_SIZE = 512  # pixels - small enough for fast testing
TILE_OFFSET_X = 1000  # Start from here to avoid edges
TILE_OFFSET_Y = 1000

# Test configurations (ablation study)
CONFIGURATIONS = [
    {
        "name": "Baseline (all OFF)",
        "flags": {
            "use_ror_guided_prompts": False,
            "use_area_filtering": False,
            "use_iterative_refinement": False,
            "use_hungarian_matching": False,
        }
    },
    {
        "name": "+ ROR Prompts",
        "flags": {
            "use_ror_guided_prompts": True,
            "use_area_filtering": False,
            "use_iterative_refinement": False,
            "use_hungarian_matching": False,
        }
    },
    {
        "name": "+ Area Filtering",
        "flags": {
            "use_ror_guided_prompts": True,
            "use_area_filtering": True,
            "use_iterative_refinement": False,
            "use_hungarian_matching": False,
        }
    },
    {
        "name": "+ Hungarian Match",
        "flags": {
            "use_ror_guided_prompts": True,
            "use_area_filtering": True,
            "use_iterative_refinement": False,
            "use_hungarian_matching": True,
        }
    },
    {
        "name": "All Innovations ON",
        "flags": {
            "use_ror_guided_prompts": True,
            "use_area_filtering": True,
            "use_iterative_refinement": True,
            "use_hungarian_matching": True,
        }
    },
]


# =============================================================================
# TILE EXTRACTION
# =============================================================================

def extract_tile(
    ori_path: str,
    offset_x: int,
    offset_y: int,
    tile_size: int,
    output_path: str = None
) -> Tuple[str, dict]:
    """
    Extract a tile from the ORI image.

    Returns:
        (tile_path, tile_info_dict)
    """
    with rasterio.open(ori_path) as src:
        # Create window
        window = Window(offset_x, offset_y, tile_size, tile_size)

        # Read tile data
        tile_data = src.read(window=window)
        tile_transform = src.window_transform(window)
        tile_bounds = rasterio.windows.bounds(window, src.transform)

        # Output path
        if output_path is None:
            output_path = tempfile.mktemp(suffix='_tile.tif')

        # Write tile
        profile = src.profile.copy()
        profile.update(
            width=tile_size,
            height=tile_size,
            transform=tile_transform
        )

        with rasterio.open(output_path, 'w', **profile) as dst:
            dst.write(tile_data)

        tile_info = {
            'path': output_path,
            'bounds': tile_bounds,
            'transform': tile_transform,
            'crs': src.crs,
            'size_pixels': tile_size,
        }

        return output_path, tile_info


def get_parcels_in_tile(
    shapefile_path: str,
    tile_bounds: Tuple[float, float, float, float],
    crs
) -> gpd.GeoDataFrame:
    """Get ground truth parcels that fall within the tile bounds."""
    gdf = gpd.read_file(shapefile_path)

    # Ensure same CRS
    if gdf.crs != crs:
        gdf = gdf.to_crs(crs)

    # Create tile polygon
    tile_poly = box(*tile_bounds)

    # Filter parcels that intersect with tile
    # Use centroid intersection for cleaner results
    mask = gdf.geometry.centroid.within(tile_poly)
    parcels_in_tile = gdf[mask].copy()

    return parcels_in_tile


def get_ror_for_parcels(
    ror_path: str,
    parcels: gpd.GeoDataFrame
) -> List[Dict]:
    """Get ROR records that match the parcels in tile."""
    ror_loader = RORLoader(ror_path)
    ror_df = ror_loader.load()

    # For now, just return synthetic ROR based on actual parcel areas
    # In real scenario, we'd match by survey number
    ror_records = []
    for idx, parcel in parcels.iterrows():
        ror_records.append({
            'survey_no': parcel.get('LP_NUMBER', parcel.get('lp_number', f'P_{idx}')),
            'extent_sqm': parcel.geometry.area,  # Use actual area as "expected"
        })

    return ror_records


# =============================================================================
# MAIN TEST RUNNER
# =============================================================================

def run_single_configuration(
    tile_path: str,
    ror_records: List[Dict],
    ground_truth: gpd.GeoDataFrame,
    config: Dict
) -> EvaluationResult:
    """Run SAM with a single configuration and evaluate."""
    print(f"\n  Running: {config['name']}...")

    flags = config['flags']

    try:
        # Initialize segmenter with flags
        segmenter = RORGuidedSegmenter(
            model_type="vit_b",  # Smaller model for faster testing
            device="cpu",
            use_ror_guided_prompts=flags['use_ror_guided_prompts'],
            use_area_filtering=flags['use_area_filtering'],
            use_iterative_refinement=flags['use_iterative_refinement'],
            use_hungarian_matching=flags['use_hungarian_matching'],
        )

        # Run segmentation
        start_time = time.time()
        detected, metrics = segmenter.segment_with_ror_constraints(
            tile_path,
            ror_records
        )
        elapsed = time.time() - start_time

        print(f"    Segmentation took {elapsed:.1f}s")
        print(f"    Detected {len(detected)} segments")

        # Evaluate against ground truth
        evaluator = ParcelEvaluator(iou_threshold=0.3)
        result = evaluator.evaluate(
            detected=detected,
            ground_truth=ground_truth,
            config_name=config['name'],
            flags=flags
        )

        return result

    except Exception as e:
        print(f"    ERROR: {e}")
        import traceback
        traceback.print_exc()

        # Return empty result on error
        return EvaluationResult(
            config_name=config['name'],
            flags=flags,
            mean_iou=0.0, median_iou=0.0,
            mean_area_error=1.0, median_area_error=1.0,
            mean_boundary_distance=float('inf'),
            total_ground_truth=len(ground_truth),
            total_detected=0,
            matched_count=0, match_rate=0.0,
            iou_above_50=0.0, iou_above_70=0.0,
            area_within_10=0.0, area_within_20=0.0,
            parcel_metrics=[]
        )


def run_ablation_study():
    """Run the full ablation study."""
    print("=" * 70)
    print("ABLATION STUDY: BoundaryAI Innovations")
    print("=" * 70)

    # Check files exist
    print("\n1. Checking input files...")
    if not Path(ORI_PATH).exists():
        # Try alternate path
        alt_paths = list(Path("/Users/jeevan/RealTimeGovernance/prototypes/Re-Survey").glob("**/*ORTHO*.tif"))
        if alt_paths:
            ori_path = str(alt_paths[0])
            print(f"   Using alternate ORI: {alt_paths[0].name}")
        else:
            print("   ERROR: No ORI image found!")
            return
    else:
        ori_path = ORI_PATH

    if not Path(SHAPEFILE_PATH).exists():
        print(f"   ERROR: Shapefile not found at {SHAPEFILE_PATH}")
        return
    print(f"   ✓ Shapefile: {Path(SHAPEFILE_PATH).name}")

    if not Path(ROR_PATH).exists():
        print(f"   ERROR: ROR file not found at {ROR_PATH}")
        return
    print(f"   ✓ ROR: {Path(ROR_PATH).name}")

    # Extract tile
    print("\n2. Extracting test tile...")
    tile_path, tile_info = extract_tile(
        ori_path,
        TILE_OFFSET_X,
        TILE_OFFSET_Y,
        TILE_SIZE
    )
    print(f"   ✓ Tile extracted: {TILE_SIZE}x{TILE_SIZE} pixels")
    print(f"   Bounds: {tile_info['bounds']}")

    # Get ground truth parcels in tile
    print("\n3. Getting ground truth parcels in tile...")
    ground_truth = get_parcels_in_tile(
        SHAPEFILE_PATH,
        tile_info['bounds'],
        tile_info['crs']
    )
    print(f"   ✓ Found {len(ground_truth)} parcels in tile")

    if len(ground_truth) == 0:
        print("   WARNING: No parcels in this tile region!")
        print("   Try adjusting TILE_OFFSET_X and TILE_OFFSET_Y")

        # Show where parcels actually are
        gdf = gpd.read_file(SHAPEFILE_PATH)
        print(f"\n   Shapefile bounds: {gdf.total_bounds}")
        print(f"   Tile bounds: {tile_info['bounds']}")
        return

    # Get ROR records
    print("\n4. Getting ROR records...")
    ror_records = get_ror_for_parcels(ROR_PATH, ground_truth)
    print(f"   ✓ {len(ror_records)} ROR records matched")

    # Run each configuration
    print("\n5. Running ablation study...")
    results = []

    for config in CONFIGURATIONS:
        result = run_single_configuration(
            tile_path,
            ror_records,
            ground_truth,
            config
        )
        results.append(result)

    # Print individual results
    print("\n" + "=" * 70)
    print("INDIVIDUAL RESULTS")
    print("=" * 70)
    for result in results:
        print_evaluation_result(result)

    # Compare all configurations
    compare_configurations(results)

    # Cleanup
    Path(tile_path).unlink(missing_ok=True)

    print("\n✓ Ablation study complete!")


def quick_test_without_sam():
    """
    Quick test to verify the pipeline works, without actually running SAM.
    Uses ground truth as "detected" to test evaluation metrics.
    """
    print("=" * 70)
    print("QUICK TEST (No SAM - uses ground truth as detected)")
    print("=" * 70)

    print("\n1. Loading data...")
    gdf = gpd.read_file(SHAPEFILE_PATH)
    print(f"   ✓ Loaded {len(gdf)} parcels")

    # Take subset as "detected" with some noise
    sample_size = min(50, len(gdf))
    ground_truth = gdf.head(sample_size).copy()

    # Simulate detection with slight perturbation
    detected = ground_truth.copy()
    detected['geometry'] = detected.geometry.buffer(np.random.uniform(-1, 1))

    print(f"\n2. Evaluating {sample_size} parcels...")
    evaluator = ParcelEvaluator(iou_threshold=0.3)
    result = evaluator.evaluate(
        detected=detected,
        ground_truth=ground_truth,
        config_name="Test (perturbed ground truth)",
        flags={"test_mode": True}
    )

    print_evaluation_result(result)
    print("\n✓ Quick test complete!")


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--quick", action="store_true", help="Run quick test without SAM")
    args = parser.parse_args()

    if args.quick:
        quick_test_without_sam()
    else:
        run_ablation_study()

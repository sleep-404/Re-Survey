#!/usr/bin/env python3
"""
REAL test of ROR-Guided Segmentation - actually runs SAM on a tile.
"""

import sys
sys.path.insert(0, '/Users/jeevan/RealTimeGovernance/prototypes/Re-Survey')

import time
import numpy as np
import geopandas as gpd
import rasterio
from pathlib import Path

from src.data_loader import RORLoader

# Find the ORI image
ori_path = Path("/Users/jeevan/RealTimeGovernance/prototypes/Re-Survey/Resurvey")
tif_files = list(ori_path.glob("**/*.tif"))

print("=" * 60)
print("REAL TEST: ROR-Guided Segmentation")
print("=" * 60)

# Check what we have
print(f"\nFound {len(tif_files)} TIF files")
for f in tif_files[:3]:
    print(f"  - {f.name}")

# Load ROR
ror_path = "/Users/jeevan/RealTimeGovernance/prototypes/Re-Survey/Resurvey/kanumuru-annonymized ROR.xlsx"
ror_loader = RORLoader(ror_path)
ror_df = ror_loader.load()
print(f"\n✓ Loaded {len(ror_df)} ROR records")
print(f"  Sample areas: {ror_df['extent_sqm'].head(5).tolist()}")

# Convert to list of dicts
ror_records = ror_df.head(10).to_dict('records')  # Just 10 for testing
print(f"\nUsing {len(ror_records)} ROR records for test")

# Check if we have an ORI in Resurvey folder
ori_files = list(Path("/Users/jeevan/RealTimeGovernance/prototypes/Re-Survey").glob("**/*ORTHO*.tif"))
print(f"\nOrtho files found: {len(ori_files)}")
for f in ori_files:
    print(f"  - {f}")

if ori_files:
    test_image = str(ori_files[0])
    print(f"\nUsing: {test_image}")

    # Check image size
    with rasterio.open(test_image) as src:
        print(f"  Size: {src.width} x {src.height} pixels")
        print(f"  CRS: {src.crs}")
        print(f"  Bounds: {src.bounds}")

    # Now actually try to run the ROR-guided segmentation
    print("\n" + "-" * 60)
    print("Attempting to run RORGuidedSegmenter...")
    print("-" * 60)

    try:
        from src.segmentation import RORGuidedSegmenter

        segmenter = RORGuidedSegmenter(
            model_type="vit_b",  # Smaller model
            device="cpu",
            area_tolerance=0.20,
            max_iterations=2
        )

        print("\nInitializing SAM model...")
        start = time.time()

        # This will actually download and load SAM
        result_gdf, metrics = segmenter.segment_with_ror_constraints(
            test_image,
            ror_records
        )

        elapsed = time.time() - start
        print(f"\n✓ Segmentation completed in {elapsed:.1f}s")
        print(f"\nResults:")
        print(f"  Segments matched: {metrics['segments_matched']}")
        print(f"  Segments refined: {metrics['segments_refined']}")
        print(f"  Mean area error: {metrics['mean_area_error']:.2%}")
        print(f"  Area match rate: {metrics['area_match_rate']:.2%}")

        if len(result_gdf) > 0:
            print(f"\nSample output:")
            print(result_gdf[['ror_survey_no', 'expected_area_sqm', 'detected_area_sqm', 'area_error']].head())

    except Exception as e:
        print(f"\n✗ Error: {e}")
        import traceback
        traceback.print_exc()

else:
    print("\nNo ortho images found in Resurvey folder.")
    print("Checking Sample2 folder...")

    sample2_ori = list(Path("/Users/jeevan/RealTimeGovernance/prototypes/Re-Survey/Sample2").glob("**/*.tif"))
    if sample2_ori:
        print(f"Found in Sample2: {sample2_ori[0]}")

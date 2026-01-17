#!/usr/bin/env python3
"""
Convert GeoJSON from EPSG:32644 (UTM 44N) to EPSG:4326 (WGS84) for web display.
Also adds random parcelType classification as placeholder for MVP.

Usage:
    python scripts/convert_coordinates.py \
        --input evaluation_output/nibanupudi_105parcels/sam_raw_segments.geojson \
        --output dashboard/public/data/sam_segments.geojson \
        --from-crs EPSG:32644 \
        --to-crs EPSG:4326

Dependencies:
    pip install geopandas pyproj
"""

import argparse
import json
import random
import sys
import uuid
from pathlib import Path

try:
    import geopandas as gpd
except ImportError:
    print("Error: geopandas not installed. Run: pip install geopandas")
    sys.exit(1)


# Parcel types with weighted distribution
# Agricultural is most common in rural survey areas
PARCEL_TYPES = [
    "agricultural",     # 60% - most common
    "building",         # 15%
    "road",             # 10%
    "open_space",       # 5%
    "water_body",       # 5%
    "compound",         # 3%
    "gramakantam",      # 2%
]
WEIGHTS = [0.60, 0.15, 0.10, 0.05, 0.05, 0.03, 0.02]


def add_properties(gdf: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
    """Add id and parcelType properties to each feature."""

    # Generate unique IDs
    gdf["id"] = [str(uuid.uuid4())[:8] for _ in range(len(gdf))]

    # Assign random parcel types with weighted distribution
    gdf["parcelType"] = random.choices(PARCEL_TYPES, WEIGHTS, k=len(gdf))

    # Calculate area in square meters (before reprojecting)
    if gdf.crs and gdf.crs.is_projected:
        gdf["area_sqm"] = gdf.geometry.area

    return gdf


def main():
    parser = argparse.ArgumentParser(
        description="Reproject GeoJSON and add parcel type classifications"
    )
    parser.add_argument(
        "--input", "-i",
        required=True,
        help="Path to input GeoJSON file"
    )
    parser.add_argument(
        "--output", "-o",
        required=True,
        help="Path to output GeoJSON file"
    )
    parser.add_argument(
        "--from-crs",
        default="EPSG:32644",
        help="Source CRS (default: EPSG:32644 - UTM Zone 44N)"
    )
    parser.add_argument(
        "--to-crs",
        default="EPSG:4326",
        help="Target CRS (default: EPSG:4326 - WGS84)"
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=42,
        help="Random seed for reproducible classification (default: 42)"
    )

    args = parser.parse_args()

    input_path = Path(args.input)
    output_path = Path(args.output)

    if not input_path.exists():
        print(f"Error: Input file not found: {input_path}")
        sys.exit(1)

    # Set random seed for reproducibility
    random.seed(args.seed)

    print(f"Input: {input_path}")
    print(f"Output: {output_path}")
    print(f"CRS: {args.from_crs} -> {args.to_crs}")
    print()

    # Read GeoJSON
    print("Reading GeoJSON...")
    gdf = gpd.read_file(input_path)
    print(f"  Loaded {len(gdf)} features")

    # Set source CRS if not defined
    if gdf.crs is None:
        print(f"  Setting source CRS to {args.from_crs}")
        gdf = gdf.set_crs(args.from_crs)
    else:
        print(f"  Source CRS: {gdf.crs}")

    # Add properties before reprojecting (to get area in meters)
    print("Adding properties...")
    gdf = add_properties(gdf)

    # Count parcel types
    type_counts = gdf["parcelType"].value_counts()
    print("  Parcel type distribution:")
    for ptype, count in type_counts.items():
        pct = count / len(gdf) * 100
        print(f"    {ptype}: {count} ({pct:.1f}%)")

    # Reproject
    print(f"Reprojecting to {args.to_crs}...")
    gdf = gdf.to_crs(args.to_crs)

    # Create output directory
    output_path.parent.mkdir(parents=True, exist_ok=True)

    # Write output
    print(f"Writing output to {output_path}...")
    gdf.to_file(output_path, driver="GeoJSON")

    # Print file size
    size_mb = output_path.stat().st_size / (1024 * 1024)
    print(f"  Output size: {size_mb:.2f} MB")

    print()
    print("Done!")
    print()
    print("Next steps:")
    print("  1. Run tile_ori.py to generate map tiles")
    print("  2. Start the dashboard: cd dashboard && npm run dev")


if __name__ == "__main__":
    main()

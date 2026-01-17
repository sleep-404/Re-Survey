#!/usr/bin/env python3
"""
Generate XYZ tiles from ORI GeoTIFF for web display.

Usage:
    python scripts/tile_ori.py \
        --input "AI Hackathon/nibanupudi.tif" \
        --output dashboard/public/tiles/ \
        --zoom 12-20

Dependencies:
    pip install rasterio rio-cogeo gdal
"""

import argparse
import subprocess
import sys
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(
        description="Convert GeoTIFF to XYZ tile pyramid for web display"
    )
    parser.add_argument(
        "--input", "-i",
        required=True,
        help="Path to input GeoTIFF file"
    )
    parser.add_argument(
        "--output", "-o",
        default="dashboard/public/tiles/",
        help="Output directory for tiles (default: dashboard/public/tiles/)"
    )
    parser.add_argument(
        "--zoom", "-z",
        default="12-20",
        help="Zoom level range, e.g., '12-20' (default: 12-20)"
    )
    parser.add_argument(
        "--processes", "-p",
        type=int,
        default=4,
        help="Number of parallel processes (default: 4)"
    )

    args = parser.parse_args()

    input_path = Path(args.input)
    output_path = Path(args.output)

    if not input_path.exists():
        print(f"Error: Input file not found: {input_path}")
        sys.exit(1)

    # Create output directory
    output_path.mkdir(parents=True, exist_ok=True)

    # Parse zoom levels
    zoom_min, zoom_max = map(int, args.zoom.split("-"))

    print(f"Input: {input_path}")
    print(f"Output: {output_path}")
    print(f"Zoom levels: {zoom_min}-{zoom_max}")
    print(f"Processes: {args.processes}")
    print()

    # Use gdal2tiles.py for tile generation
    # This is more reliable than rasterio for large files
    cmd = [
        "gdal2tiles.py",
        "-p", "mercator",           # Web Mercator projection
        "-z", f"{zoom_min}-{zoom_max}",
        "-w", "none",               # No HTML viewer
        "--processes", str(args.processes),
        "-r", "bilinear",           # Resampling method
        str(input_path),
        str(output_path)
    ]

    print(f"Running: {' '.join(cmd)}")
    print()

    try:
        subprocess.run(cmd, check=True)
        print()
        print(f"Tiles generated successfully in {output_path}")
        print()
        print("Next steps:")
        print("  1. Start the dashboard: cd dashboard && npm run dev")
        print("  2. Tiles will be served from /tiles/{z}/{x}/{y}.png")
    except subprocess.CalledProcessError as e:
        print(f"Error running gdal2tiles: {e}")
        sys.exit(1)
    except FileNotFoundError:
        print("Error: gdal2tiles.py not found. Install GDAL:")
        print("  brew install gdal  # macOS")
        print("  apt install gdal-bin  # Ubuntu")
        sys.exit(1)


if __name__ == "__main__":
    main()

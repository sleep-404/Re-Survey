#!/usr/bin/env python3
"""
BoundaryAI CLI Runner

Run the parcel detection pipeline from command line.
Designed for Docker/cloud deployment.

Usage:
    python run_pipeline.py /data/input/image.tif --output /data/output
"""

import argparse
import sys
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(
        description='BoundaryAI - Extract land parcels from drone imagery'
    )
    parser.add_argument('image', help='Path to TIFF/GeoTIFF image')
    parser.add_argument('--output', '-o', default='output', help='Output directory')
    parser.add_argument('--ror', help='Optional ROR Excel file for matching')
    parser.add_argument('--name', default='Village', help='Village name')
    parser.add_argument('--model', default='vit_b', choices=['vit_b', 'vit_l', 'vit_h'],
                        help='SAM model (vit_b=fast, vit_h=best)')
    parser.add_argument('--max-tiles', type=int, help='Max tiles to process (for testing)')
    parser.add_argument('--tile-size', type=int, default=1024, help='Tile size in pixels')

    args = parser.parse_args()

    # Validate input
    image_path = Path(args.image)
    if not image_path.exists():
        print(f"Error: Image not found: {image_path}")
        sys.exit(1)

    # Import pipeline (delayed to show errors faster)
    from src.pipeline import BoundaryAIPipeline, PipelineConfig, export_results

    print("=" * 70)
    print("BoundaryAI - Land Parcel Extraction Pipeline")
    print("=" * 70)
    print(f"Input: {args.image}")
    print(f"Output: {args.output}")
    print(f"Model: {args.model}")
    print()

    # Configure and run
    config = PipelineConfig(
        sam_model=args.model,
        tile_size=args.tile_size,
    )

    pipeline = BoundaryAIPipeline(config)

    result = pipeline.process_image(
        image_path=str(image_path),
        ror_path=args.ror,
        village_name=args.name,
        max_tiles=args.max_tiles
    )

    # Export results
    outputs = export_results(result, args.output)

    print()
    print("=" * 70)
    print("COMPLETE")
    print("=" * 70)
    print(f"Parcels detected: {len(result.parcels)}")
    print(f"Processing time: {result.processing_time:.1f}s")
    print()
    print("Output files:")
    for key, path in outputs.items():
        print(f"  {key}: {path}")


if __name__ == '__main__':
    main()

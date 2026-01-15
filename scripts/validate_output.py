"""
Validate Pipeline Output

Overlays detected parcels on the source image for visual validation.
Creates a side-by-side comparison: Original Image | Detected Parcels
"""

import numpy as np
import geopandas as gpd
import rasterio
from rasterio.windows import Window
from pathlib import Path
import cv2
from typing import Optional, Tuple
import matplotlib.pyplot as plt
from matplotlib.patches import Polygon as MplPolygon
from matplotlib.collections import PatchCollection


def extract_region(
    image_path: str,
    x_offset: int = 0,
    y_offset: int = 0,
    width: int = 2048,
    height: int = 2048
) -> Tuple[np.ndarray, rasterio.Affine]:
    """
    Extract a region from a large TIFF for visualization.

    Args:
        image_path: Path to TIFF
        x_offset, y_offset: Top-left corner in pixels
        width, height: Region size

    Returns:
        (image_array, transform)
    """
    with rasterio.open(image_path) as src:
        window = Window(x_offset, y_offset, width, height)
        data = src.read(window=window)
        transform = rasterio.windows.transform(window, src.transform)

        # Convert to RGB (H, W, 3)
        if data.shape[0] >= 3:
            data = np.transpose(data[:3], (1, 2, 0))
        else:
            data = np.transpose(data, (1, 2, 0))
            data = np.repeat(data, 3, axis=2)

    return data, transform


def overlay_parcels_on_image(
    image: np.ndarray,
    parcels_gdf: gpd.GeoDataFrame,
    transform: rasterio.Affine,
    output_path: str = None,
    title: str = "Detected Parcels Overlay"
) -> np.ndarray:
    """
    Overlay detected parcels on source image.

    Args:
        image: RGB image array
        parcels_gdf: GeoDataFrame with parcel polygons
        transform: Geo transform for the image region
        output_path: Optional path to save the figure
        title: Plot title

    Returns:
        Overlay image array
    """
    # Create figure with two subplots
    fig, axes = plt.subplots(1, 2, figsize=(16, 8))

    # Left: Original image
    axes[0].imshow(image)
    axes[0].set_title("Original Image")
    axes[0].axis('off')

    # Right: Image with parcel overlays
    axes[1].imshow(image)
    axes[1].set_title(f"Detected Parcels (n={len(parcels_gdf)})")
    axes[1].axis('off')

    # Convert geo coordinates to pixel coordinates and draw parcels
    inv_transform = ~transform

    for idx, row in parcels_gdf.iterrows():
        geom = row.geometry
        if geom is None or geom.is_empty:
            continue

        # Get exterior coordinates
        if geom.geom_type == 'Polygon':
            coords = list(geom.exterior.coords)
        elif geom.geom_type == 'MultiPolygon':
            coords = list(geom.geoms[0].exterior.coords)
        else:
            continue

        # Convert to pixel coordinates
        pixel_coords = []
        for x, y in coords:
            px, py = inv_transform * (x, y)
            pixel_coords.append((px, py))

        # Draw polygon
        if pixel_coords:
            polygon = MplPolygon(pixel_coords, fill=False, edgecolor='lime', linewidth=2)
            axes[1].add_patch(polygon)

            # Add confidence label
            centroid_geo = geom.centroid
            cx, cy = inv_transform * (centroid_geo.x, centroid_geo.y)
            conf = row.get('confidence', 0)
            axes[1].text(cx, cy, f"{conf:.0%}", color='yellow', fontsize=8,
                        ha='center', va='center', fontweight='bold')

    plt.suptitle(title, fontsize=14)
    plt.tight_layout()

    if output_path:
        plt.savefig(output_path, dpi=150, bbox_inches='tight')
        print(f"Saved: {output_path}")

    return fig


def run_and_validate(
    image_path: str,
    output_dir: str = "validation_output",
    region_x: int = 0,
    region_y: int = 0,
    region_size: int = 2048,
    max_tiles: int = 4
):
    """
    Run pipeline on a region and validate output visually.

    Args:
        image_path: Path to TIFF
        output_dir: Output directory
        region_x, region_y: Region top-left corner
        region_size: Size of region to process
        max_tiles: Max tiles to process
    """
    from src.pipeline import BoundaryAIPipeline, PipelineConfig

    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    # Configure pipeline for the specific region
    tile_size = 512
    config = PipelineConfig(
        sam_model='vit_b',
        tile_size=tile_size,
        tile_overlap=64,
        min_parcel_area_pixels=200,
        max_parcel_area_pixels=500000,
    )

    pipeline = BoundaryAIPipeline(config)

    print(f"Processing region: ({region_x}, {region_y}) size {region_size}x{region_size}")

    # Run pipeline
    result = pipeline.process_image(
        image_path=image_path,
        village_name="ValidationTest",
        max_tiles=max_tiles
    )

    print(f"\nDetected {len(result.parcels)} parcels")

    # Extract the same region for visualization
    print("Extracting region for visualization...")
    image, transform = extract_region(
        image_path,
        region_x, region_y,
        region_size, region_size
    )

    # Create overlay
    print("Creating overlay...")
    fig = overlay_parcels_on_image(
        image=image,
        parcels_gdf=result.parcels,
        transform=transform,
        output_path=str(output_dir / "validation_overlay.png"),
        title=f"Pipeline Validation - {len(result.parcels)} parcels detected"
    )

    # Save parcels
    result.parcels.to_file(output_dir / "detected_parcels.gpkg", driver='GPKG')
    print(f"Parcels saved to: {output_dir / 'detected_parcels.gpkg'}")

    # Print statistics
    print("\n" + "="*50)
    print("VALIDATION RESULTS")
    print("="*50)
    print(f"Parcels detected: {len(result.parcels)}")
    print(f"Avg confidence: {result.parcels['confidence'].mean():.1%}")
    print(f"Total area: {result.parcels['area_sqm'].sum():.0f} sqm")
    print(f"Avg parcel size: {result.parcels['area_sqm'].mean():.0f} sqm")
    print(f"\nOverlay saved to: {output_dir / 'validation_overlay.png'}")

    return result


def compare_with_ground_truth(
    detected_gdf: gpd.GeoDataFrame,
    ground_truth_path: str,
    output_path: str = None
) -> dict:
    """
    Compare detected parcels with ground truth shapefile.

    Args:
        detected_gdf: Detected parcels GeoDataFrame
        ground_truth_path: Path to ground truth shapefile
        output_path: Optional path to save comparison figure

    Returns:
        Dictionary with comparison metrics
    """
    gt_gdf = gpd.read_file(ground_truth_path)

    # Ensure same CRS
    if detected_gdf.crs != gt_gdf.crs:
        detected_gdf = detected_gdf.to_crs(gt_gdf.crs)

    metrics = {
        'detected_count': len(detected_gdf),
        'ground_truth_count': len(gt_gdf),
        'count_difference': len(detected_gdf) - len(gt_gdf),
    }

    # Calculate IoU for overlapping parcels
    ious = []
    for idx, det in detected_gdf.iterrows():
        det_geom = det.geometry

        # Find best matching ground truth parcel
        best_iou = 0
        for gt_idx, gt in gt_gdf.iterrows():
            gt_geom = gt.geometry

            if det_geom.intersects(gt_geom):
                intersection = det_geom.intersection(gt_geom).area
                union = det_geom.union(gt_geom).area
                iou = intersection / union if union > 0 else 0
                best_iou = max(best_iou, iou)

        ious.append(best_iou)

    metrics['mean_iou'] = np.mean(ious) if ious else 0
    metrics['median_iou'] = np.median(ious) if ious else 0
    metrics['parcels_with_match'] = sum(1 for iou in ious if iou > 0.5)

    print("\n" + "="*50)
    print("GROUND TRUTH COMPARISON")
    print("="*50)
    print(f"Detected parcels: {metrics['detected_count']}")
    print(f"Ground truth parcels: {metrics['ground_truth_count']}")
    print(f"Mean IoU: {metrics['mean_iou']:.2%}")
    print(f"Parcels with IoU > 0.5: {metrics['parcels_with_match']}")

    return metrics


if __name__ == '__main__':
    import argparse

    parser = argparse.ArgumentParser(description='Validate pipeline output')
    parser.add_argument('image', help='Path to TIFF image')
    parser.add_argument('--output', default='validation_output', help='Output directory')
    parser.add_argument('--region-x', type=int, default=0, help='Region X offset')
    parser.add_argument('--region-y', type=int, default=0, help='Region Y offset')
    parser.add_argument('--region-size', type=int, default=2048, help='Region size')
    parser.add_argument('--max-tiles', type=int, default=4, help='Max tiles to process')
    parser.add_argument('--ground-truth', help='Optional ground truth shapefile')

    args = parser.parse_args()

    result = run_and_validate(
        image_path=args.image,
        output_dir=args.output,
        region_x=args.region_x,
        region_y=args.region_y,
        region_size=args.region_size,
        max_tiles=args.max_tiles
    )

    if args.ground_truth:
        compare_with_ground_truth(result.parcels, args.ground_truth)

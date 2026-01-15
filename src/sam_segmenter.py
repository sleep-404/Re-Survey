"""
SAM-based Parcel Segmenter

Uses Meta's Segment Anything Model (SAM) to detect land parcel boundaries
from drone imagery.
"""

import os
import numpy as np
import torch
from pathlib import Path
from typing import List, Tuple, Optional, Dict, Any
from dataclasses import dataclass
import cv2

# SAM imports
try:
    from segment_anything import sam_model_registry, SamAutomaticMaskGenerator, SamPredictor
    SAM_AVAILABLE = True
except ImportError:
    SAM_AVAILABLE = False
    print("Warning: segment_anything not installed. Run: pip install segment-anything")

from shapely.geometry import Polygon, MultiPolygon
from shapely.ops import unary_union
import geopandas as gpd


@dataclass
class DetectedParcel:
    """Represents a detected parcel from SAM."""
    polygon: Polygon          # Shapely polygon in pixel coordinates
    geo_polygon: Polygon      # Shapely polygon in geographic coordinates
    area_pixels: float        # Area in pixels
    area_sqm: float          # Area in square meters
    confidence: float        # Detection confidence (0-1)
    bbox: Tuple[int, int, int, int]  # Bounding box (x, y, w, h)
    mask: Optional[np.ndarray] = None  # Binary mask


class SAMSegmenter:
    """
    Segment land parcels using SAM (Segment Anything Model).
    """

    # SAM model checkpoints
    MODEL_URLS = {
        'vit_h': 'https://dl.fbaipublicfiles.com/segment_anything/sam_vit_h_4b8939.pth',
        'vit_l': 'https://dl.fbaipublicfiles.com/segment_anything/sam_vit_l_0b3195.pth',
        'vit_b': 'https://dl.fbaipublicfiles.com/segment_anything/sam_vit_b_01ec64.pth',
    }

    def __init__(
        self,
        model_type: str = 'vit_b',
        checkpoint_path: Optional[str] = None,
        device: str = None,
        min_area: int = 500,          # Minimum parcel area in pixels
        max_area: int = 1000000,      # Maximum parcel area in pixels
        stability_score_thresh: float = 0.85,
        pred_iou_thresh: float = 0.80,
    ):
        """
        Initialize SAM segmenter.

        Args:
            model_type: SAM model variant ('vit_h', 'vit_l', 'vit_b')
            checkpoint_path: Path to SAM checkpoint. Downloads if not provided.
            device: 'cuda' or 'cpu'. Auto-detects if not provided.
            min_area: Minimum parcel area in pixels to keep
            max_area: Maximum parcel area in pixels to keep
            stability_score_thresh: SAM stability threshold
            pred_iou_thresh: SAM IoU threshold
        """
        if not SAM_AVAILABLE:
            raise ImportError("segment_anything not installed")

        self.model_type = model_type
        self.min_area = min_area
        self.max_area = max_area
        self.stability_score_thresh = stability_score_thresh
        self.pred_iou_thresh = pred_iou_thresh

        # Set device
        if device is None:
            self.device = 'cuda' if torch.cuda.is_available() else 'cpu'
        else:
            self.device = device

        print(f"Using device: {self.device}")

        # Load model
        self.checkpoint_path = self._get_checkpoint(checkpoint_path)
        self._load_model()

    def _get_checkpoint(self, checkpoint_path: Optional[str]) -> Path:
        """Get or download SAM checkpoint."""
        # Check explicit path first
        if checkpoint_path and Path(checkpoint_path).exists():
            return Path(checkpoint_path)

        # Check environment variable (for Docker deployment)
        env_checkpoint = os.environ.get('SAM_CHECKPOINT_PATH')
        if env_checkpoint and Path(env_checkpoint).exists():
            return Path(env_checkpoint)

        # Default checkpoint location
        cache_dir = Path.home() / '.cache' / 'sam'
        cache_dir.mkdir(parents=True, exist_ok=True)

        checkpoint_name = f'sam_{self.model_type}.pth'
        checkpoint_file = cache_dir / checkpoint_name

        if checkpoint_file.exists():
            return checkpoint_file

        # Download checkpoint
        print(f"Downloading SAM checkpoint ({self.model_type})...")
        url = self.MODEL_URLS[self.model_type]

        import urllib.request
        urllib.request.urlretrieve(url, checkpoint_file)
        print(f"Downloaded to: {checkpoint_file}")

        return checkpoint_file

    def _load_model(self):
        """Load SAM model."""
        print(f"Loading SAM model ({self.model_type})...")

        self.sam = sam_model_registry[self.model_type](checkpoint=str(self.checkpoint_path))
        self.sam.to(device=self.device)

        # Create mask generator for automatic segmentation
        self.mask_generator = SamAutomaticMaskGenerator(
            model=self.sam,
            points_per_side=32,
            pred_iou_thresh=self.pred_iou_thresh,
            stability_score_thresh=self.stability_score_thresh,
            min_mask_region_area=self.min_area,
        )

        # Create predictor for point-based prompts
        self.predictor = SamPredictor(self.sam)

        print("SAM model loaded successfully")

    def segment_image(self, image: np.ndarray) -> List[Dict[str, Any]]:
        """
        Segment an image to detect all parcels.

        Args:
            image: RGB image array (H, W, 3)

        Returns:
            List of mask dictionaries from SAM
        """
        # Ensure correct format
        if image.dtype != np.uint8:
            image = (image * 255).astype(np.uint8) if image.max() <= 1 else image.astype(np.uint8)

        # Run SAM
        masks = self.mask_generator.generate(image)

        # Filter by area
        filtered_masks = []
        for mask in masks:
            area = mask['area']
            if self.min_area <= area <= self.max_area:
                filtered_masks.append(mask)

        return filtered_masks

    def segment_with_points(
        self,
        image: np.ndarray,
        points: List[Tuple[int, int]],
        point_labels: Optional[List[int]] = None
    ) -> List[Dict[str, Any]]:
        """
        Segment using point prompts (e.g., from ROR centroids).

        Args:
            image: RGB image array
            points: List of (x, y) point coordinates
            point_labels: 1 for foreground, 0 for background

        Returns:
            List of mask dictionaries
        """
        if image.dtype != np.uint8:
            image = (image * 255).astype(np.uint8) if image.max() <= 1 else image.astype(np.uint8)

        self.predictor.set_image(image)

        if point_labels is None:
            point_labels = [1] * len(points)  # All foreground

        points_array = np.array(points)
        labels_array = np.array(point_labels)

        masks_list = []
        for i, (point, label) in enumerate(zip(points_array, labels_array)):
            masks, scores, logits = self.predictor.predict(
                point_coords=point.reshape(1, 2),
                point_labels=np.array([label]),
                multimask_output=True
            )

            # Take best mask
            best_idx = np.argmax(scores)
            masks_list.append({
                'segmentation': masks[best_idx],
                'area': masks[best_idx].sum(),
                'predicted_iou': float(scores[best_idx]),
                'stability_score': float(scores[best_idx]),
                'point_prompt': point.tolist(),
            })

        return masks_list

    def masks_to_polygons(
        self,
        masks: List[Dict[str, Any]],
        transform=None,
        simplify_tolerance: float = 2.0
    ) -> List[DetectedParcel]:
        """
        Convert SAM masks to polygon geometries.

        Args:
            masks: List of SAM mask dictionaries
            transform: Rasterio affine transform for geo-coordinates
            simplify_tolerance: Polygon simplification tolerance in pixels

        Returns:
            List of DetectedParcel objects
        """
        parcels = []

        for mask_dict in masks:
            mask = mask_dict['segmentation'].astype(np.uint8)

            # Find contours
            contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

            if not contours:
                continue

            # Take largest contour
            contour = max(contours, key=cv2.contourArea)

            if len(contour) < 4:
                continue

            # Convert to polygon
            points = contour.reshape(-1, 2)
            polygon = Polygon(points)

            if not polygon.is_valid:
                polygon = polygon.buffer(0)

            if polygon.is_empty:
                continue

            # Simplify
            polygon = polygon.simplify(simplify_tolerance)

            # Calculate area in pixels
            area_pixels = polygon.area

            # Convert to geo coordinates if transform provided
            if transform:
                geo_coords = [transform * (x, y) for x, y in polygon.exterior.coords]
                geo_polygon = Polygon(geo_coords)
                # Approximate area in sqm (depends on CRS)
                area_sqm = geo_polygon.area
            else:
                geo_polygon = polygon
                area_sqm = area_pixels  # Approximate

            # Get bounding box
            x, y, w, h = cv2.boundingRect(contour)

            parcels.append(DetectedParcel(
                polygon=polygon,
                geo_polygon=geo_polygon,
                area_pixels=area_pixels,
                area_sqm=area_sqm,
                confidence=mask_dict.get('predicted_iou', mask_dict.get('stability_score', 0.5)),
                bbox=(x, y, w, h),
                mask=mask if mask.sum() < 1000000 else None  # Don't store huge masks
            ))

        return parcels


def merge_overlapping_parcels(
    parcels: List[DetectedParcel],
    overlap_threshold: float = 0.5
) -> List[DetectedParcel]:
    """
    Merge parcels that significantly overlap.

    Args:
        parcels: List of detected parcels
        overlap_threshold: IoU threshold for merging

    Returns:
        Merged list of parcels
    """
    if not parcels:
        return []

    # Sort by area (largest first)
    parcels = sorted(parcels, key=lambda p: p.area_pixels, reverse=True)

    merged = []
    used = set()

    for i, p1 in enumerate(parcels):
        if i in used:
            continue

        current_polygon = p1.geo_polygon
        current_confidence = p1.confidence

        for j, p2 in enumerate(parcels[i+1:], start=i+1):
            if j in used:
                continue

            # Check overlap
            if current_polygon.intersects(p2.geo_polygon):
                intersection = current_polygon.intersection(p2.geo_polygon)
                iou = intersection.area / min(current_polygon.area, p2.geo_polygon.area)

                if iou > overlap_threshold:
                    # Merge
                    current_polygon = unary_union([current_polygon, p2.geo_polygon])
                    current_confidence = max(current_confidence, p2.confidence)
                    used.add(j)

        merged.append(DetectedParcel(
            polygon=current_polygon,  # Will be in geo coords
            geo_polygon=current_polygon,
            area_pixels=current_polygon.area,
            area_sqm=current_polygon.area,
            confidence=current_confidence,
            bbox=(0, 0, 0, 0),
            mask=None
        ))
        used.add(i)

    return merged


def parcels_to_geodataframe(parcels: List[DetectedParcel], crs: str = None) -> gpd.GeoDataFrame:
    """
    Convert list of detected parcels to GeoDataFrame.

    Args:
        parcels: List of DetectedParcel objects
        crs: Coordinate reference system

    Returns:
        GeoDataFrame with parcel geometries
    """
    data = []
    for i, parcel in enumerate(parcels):
        data.append({
            'parcel_id': f'P{i+1:04d}',
            'area_sqm': parcel.area_sqm,
            'area_acres': parcel.area_sqm / 4046.86,
            'confidence': parcel.confidence,
            'geometry': parcel.geo_polygon
        })

    gdf = gpd.GeoDataFrame(data, crs=crs)
    return gdf

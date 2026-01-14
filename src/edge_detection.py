"""
Edge Detection Module for BoundaryAI

Detects potential land parcel boundaries (bunds) using classical computer vision.
Complements SAM segmentation with edge-first approach for agricultural land.
"""

from typing import List, Optional, Tuple, Dict
from pathlib import Path

import numpy as np
import cv2
import geopandas as gpd
from shapely.geometry import Polygon, LineString, MultiLineString
from shapely.ops import polygonize, unary_union
import rasterio
from rasterio.features import shapes


class EdgeDetector:
    """
    Edge-first bund detection for agricultural land parcels.

    Uses multiple edge detection techniques and combines them
    for robust boundary detection:
    1. Canny edge detection (multi-scale)
    2. Sobel gradient magnitude
    3. Ridge detection for linear features (bunds/roads)
    """

    def __init__(
        self,
        canny_low: int = 30,
        canny_high: int = 100,
        min_edge_length: int = 50,
        connect_distance: int = 10
    ):
        """
        Initialize edge detector.

        Args:
            canny_low: Low threshold for Canny edge detection
            canny_high: High threshold for Canny edge detection
            min_edge_length: Minimum edge length to keep (pixels)
            connect_distance: Max gap to connect broken edges (pixels)
        """
        self.canny_low = canny_low
        self.canny_high = canny_high
        self.min_edge_length = min_edge_length
        self.connect_distance = connect_distance

    def detect_edges(self, image: np.ndarray) -> np.ndarray:
        """
        Detect potential bund edges in image.

        Args:
            image: RGB or BGR image array (HWC format)

        Returns:
            Binary edge mask
        """
        # Convert to grayscale if needed
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image.copy()

        # Apply Gaussian blur to reduce noise
        blurred = cv2.GaussianBlur(gray, (5, 5), 1.4)

        # Multi-scale Canny edge detection
        edges_fine = cv2.Canny(blurred, self.canny_low, self.canny_high)
        edges_medium = cv2.Canny(blurred, self.canny_low + 20, self.canny_high + 50)
        edges_coarse = cv2.Canny(blurred, self.canny_low + 40, self.canny_high + 100)

        # Combine multi-scale edges
        edges = cv2.bitwise_or(edges_fine, edges_medium)
        edges = cv2.bitwise_or(edges, edges_coarse)

        # Connect broken edges using morphological operations
        edges = self._connect_edges(edges)

        # Remove small edge fragments
        edges = self._remove_small_edges(edges)

        return edges

    def detect_edges_from_file(self, image_path: str) -> Tuple[np.ndarray, dict]:
        """
        Detect edges from a GeoTIFF file.

        Args:
            image_path: Path to GeoTIFF

        Returns:
            Tuple of (edge_mask, metadata dict with transform and crs)
        """
        with rasterio.open(image_path) as src:
            # Read image data
            image = src.read()
            transform = src.transform
            crs = src.crs

            # Convert to HWC format for OpenCV
            if image.shape[0] >= 3:
                image_rgb = np.transpose(image[:3], (1, 2, 0))
            else:
                image_rgb = np.stack([image[0]] * 3, axis=-1)

            # Ensure uint8
            if image_rgb.dtype != np.uint8:
                image_rgb = (image_rgb / image_rgb.max() * 255).astype(np.uint8)

        edges = self.detect_edges(image_rgb)

        return edges, {'transform': transform, 'crs': crs}

    def _connect_edges(self, edges: np.ndarray) -> np.ndarray:
        """Connect broken edges using morphological closing."""
        # Create connecting kernel
        kernel_size = self.connect_distance // 2
        kernel = cv2.getStructuringElement(
            cv2.MORPH_ELLIPSE,
            (kernel_size, kernel_size)
        )

        # Morphological closing to connect nearby edges
        connected = cv2.morphologyEx(edges, cv2.MORPH_CLOSE, kernel)

        # Dilate then erode to fill small gaps
        kernel_small = np.ones((3, 3), np.uint8)
        connected = cv2.dilate(connected, kernel_small, iterations=1)
        connected = cv2.erode(connected, kernel_small, iterations=1)

        return connected

    def _remove_small_edges(self, edges: np.ndarray) -> np.ndarray:
        """Remove edge fragments smaller than minimum length."""
        # Find connected components
        num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(
            edges, connectivity=8
        )

        # Create output mask
        cleaned = np.zeros_like(edges)

        # Keep only components larger than minimum
        for i in range(1, num_labels):  # Skip background (0)
            area = stats[i, cv2.CC_STAT_AREA]
            if area >= self.min_edge_length:
                cleaned[labels == i] = 255

        return cleaned

    def enhance_with_sobel(self, image: np.ndarray) -> np.ndarray:
        """
        Enhance edges using Sobel gradient magnitude.

        Args:
            image: Grayscale or RGB image

        Returns:
            Gradient magnitude image
        """
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image.copy()

        # Compute Sobel gradients
        sobelx = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=3)
        sobely = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=3)

        # Compute gradient magnitude
        magnitude = np.sqrt(sobelx**2 + sobely**2)

        # Normalize to 0-255
        magnitude = (magnitude / magnitude.max() * 255).astype(np.uint8)

        return magnitude

    def detect_linear_features(self, image: np.ndarray) -> np.ndarray:
        """
        Detect linear features (bunds, roads, canals) using Hough transform.

        Args:
            image: Input image

        Returns:
            Binary mask of detected linear features
        """
        # Get edges first
        edges = self.detect_edges(image)

        # Apply Hough Line Transform
        lines = cv2.HoughLinesP(
            edges,
            rho=1,
            theta=np.pi / 180,
            threshold=50,
            minLineLength=self.min_edge_length,
            maxLineGap=self.connect_distance
        )

        # Create output mask
        line_mask = np.zeros_like(edges)

        if lines is not None:
            for line in lines:
                x1, y1, x2, y2 = line[0]
                cv2.line(line_mask, (x1, y1), (x2, y2), 255, 2)

        return line_mask

    def edges_to_polygons(
        self,
        edges: np.ndarray,
        transform,
        min_area: float = 100.0,
        simplify_tolerance: float = 1.0
    ) -> gpd.GeoDataFrame:
        """
        Convert edge mask to polygon geometries.

        Args:
            edges: Binary edge mask
            transform: Rasterio transform for georeferencing
            min_area: Minimum polygon area to keep (in CRS units)
            simplify_tolerance: Tolerance for polygon simplification

        Returns:
            GeoDataFrame with polygon geometries
        """
        # Invert edges to get regions (edges are boundaries)
        # Fill regions between edges
        regions = cv2.bitwise_not(edges)

        # Label connected regions
        num_labels, labels = cv2.connectedComponents(regions)

        # Create mask for each region
        polygons = []
        for label_id in range(1, num_labels):  # Skip background
            mask = (labels == label_id).astype(np.uint8)

            # Convert to polygon using rasterio
            for geom, value in shapes(mask, transform=transform):
                if value == 1:
                    poly = Polygon(geom['coordinates'][0])

                    if poly.is_valid and poly.area >= min_area:
                        # Simplify geometry
                        poly = poly.simplify(simplify_tolerance, preserve_topology=True)
                        if poly.is_valid and not poly.is_empty:
                            polygons.append({
                                'geometry': poly,
                                'area_sqm': poly.area,
                                'source': 'edge_detection'
                            })

        if polygons:
            gdf = gpd.GeoDataFrame(polygons)
            gdf['parcel_id'] = range(len(gdf))
            return gdf
        else:
            return gpd.GeoDataFrame(
                columns=['geometry', 'area_sqm', 'source', 'parcel_id'],
                geometry='geometry'
            )

    def combine_with_sam(
        self,
        sam_segments: gpd.GeoDataFrame,
        edge_polygons: gpd.GeoDataFrame,
        preference: str = 'sam'
    ) -> gpd.GeoDataFrame:
        """
        Combine SAM segmentation with edge-detected polygons.

        Args:
            sam_segments: GeoDataFrame from SAM segmentation
            edge_polygons: GeoDataFrame from edge detection
            preference: Which to prefer on conflict ('sam' or 'edge')

        Returns:
            Combined GeoDataFrame
        """
        if len(sam_segments) == 0:
            return edge_polygons

        if len(edge_polygons) == 0:
            return sam_segments

        if preference == 'sam':
            # Use SAM as primary, fill gaps with edge detection
            combined = sam_segments.copy()

            # Find areas covered by SAM
            sam_union = unary_union(sam_segments.geometry)

            # Add edge polygons that don't overlap with SAM
            for idx, edge_poly in edge_polygons.iterrows():
                overlap = edge_poly.geometry.intersection(sam_union).area
                coverage = overlap / edge_poly.geometry.area if edge_poly.geometry.area > 0 else 1

                if coverage < 0.5:  # Less than 50% overlap
                    new_row = edge_poly.to_dict()
                    new_row['source'] = 'edge_detection_fill'
                    combined = combined.append(new_row, ignore_index=True)

        else:
            # Use edge detection as primary, refine with SAM
            combined = edge_polygons.copy()
            # More sophisticated merging could go here

        combined = combined.reset_index(drop=True)
        combined['parcel_id'] = range(len(combined))

        return combined


class BundDetector:
    """
    Specialized detector for agricultural bunds (raised earth boundaries).

    Bunds appear as linear features with specific characteristics:
    - Usually straight or gently curved
    - Cast shadows on one side
    - Often have different vegetation/color than fields
    """

    def __init__(self):
        self.edge_detector = EdgeDetector(
            canny_low=40,
            canny_high=120,
            min_edge_length=100,
            connect_distance=20
        )

    def detect_bunds(self, image: np.ndarray) -> np.ndarray:
        """
        Detect bunds in agricultural imagery.

        Args:
            image: RGB image of agricultural land

        Returns:
            Binary mask of detected bunds
        """
        # Convert to different color spaces for analysis
        if len(image.shape) == 3:
            hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image.copy()
            hsv = None

        # Edge detection
        edges = self.edge_detector.detect_edges(image)

        # Linear feature detection (Hough)
        lines = self.edge_detector.detect_linear_features(image)

        # Combine edges and lines
        bunds = cv2.bitwise_or(edges, lines)

        # If we have color info, filter by shadow detection
        if hsv is not None:
            shadows = self._detect_shadows(hsv)
            # Bunds often have shadows nearby
            shadow_dilated = cv2.dilate(shadows, np.ones((10, 10), np.uint8))
            bunds = cv2.bitwise_and(bunds, shadow_dilated)

        return bunds

    def _detect_shadows(self, hsv: np.ndarray) -> np.ndarray:
        """Detect shadow regions in HSV image."""
        # Shadows have low value (V) and can have any hue
        h, s, v = cv2.split(hsv)

        # Threshold for shadows (low brightness)
        shadow_mask = cv2.threshold(v, 60, 255, cv2.THRESH_BINARY_INV)[1]

        # Clean up
        kernel = np.ones((3, 3), np.uint8)
        shadow_mask = cv2.morphologyEx(shadow_mask, cv2.MORPH_OPEN, kernel)

        return shadow_mask

    def bunds_to_parcel_boundaries(
        self,
        bund_mask: np.ndarray,
        transform,
        crs
    ) -> gpd.GeoDataFrame:
        """
        Convert bund mask to parcel boundary polygons.

        Args:
            bund_mask: Binary mask of detected bunds
            transform: Georeferencing transform
            crs: Coordinate reference system

        Returns:
            GeoDataFrame of parcel polygons
        """
        return self.edge_detector.edges_to_polygons(
            bund_mask,
            transform,
            min_area=500.0,  # Agricultural parcels are usually larger
            simplify_tolerance=2.0
        )

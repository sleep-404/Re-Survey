"""
Utility Functions for BoundaryAI

Common helper functions used across modules.
"""

from pathlib import Path
from typing import Dict, List, Optional, Tuple, Union
import json

import numpy as np
import geopandas as gpd
from shapely.geometry import Polygon, MultiPolygon, mapping


def calculate_area_acres(geometry) -> float:
    """
    Calculate area in acres from a geometry.

    Args:
        geometry: Shapely geometry (Polygon or MultiPolygon)

    Returns:
        Area in acres
    """
    sqm = geometry.area
    return sqm / 4046.86


def calculate_area_guntas(geometry) -> float:
    """
    Calculate area in guntas from a geometry.

    1 gunta = 101.17 sqm

    Args:
        geometry: Shapely geometry

    Returns:
        Area in guntas
    """
    sqm = geometry.area
    return sqm / 101.17


def format_area(sqm: float, unit: str = 'acres') -> str:
    """
    Format area for display.

    Args:
        sqm: Area in square meters
        unit: Output unit ('acres', 'guntas', 'sqm', 'hectares')

    Returns:
        Formatted string
    """
    if unit == 'acres':
        value = sqm / 4046.86
        return f"{value:.2f} acres"
    elif unit == 'guntas':
        value = sqm / 101.17
        return f"{value:.1f} guntas"
    elif unit == 'hectares':
        value = sqm / 10000
        return f"{value:.3f} ha"
    else:
        return f"{sqm:.1f} sqm"


def geometry_to_geojson(geometry) -> Dict:
    """
    Convert Shapely geometry to GeoJSON dict.

    Args:
        geometry: Shapely geometry

    Returns:
        GeoJSON dictionary
    """
    return mapping(geometry)


def gdf_to_geojson(gdf: gpd.GeoDataFrame) -> Dict:
    """
    Convert GeoDataFrame to GeoJSON FeatureCollection.

    Args:
        gdf: GeoDataFrame

    Returns:
        GeoJSON FeatureCollection dict
    """
    return json.loads(gdf.to_json())


def get_confidence_color(confidence: float) -> str:
    """
    Get color code based on confidence score.

    Args:
        confidence: Confidence score (0-1)

    Returns:
        Hex color code
    """
    if confidence >= 0.85:
        return '#22C55E'  # Green
    elif confidence >= 0.60:
        return '#EAB308'  # Yellow
    else:
        return '#EF4444'  # Red


def get_routing_label(confidence: float) -> str:
    """
    Get routing label based on confidence score.

    Args:
        confidence: Confidence score (0-1)

    Returns:
        Routing label string
    """
    if confidence >= 0.85:
        return 'AUTO_APPROVE'
    elif confidence >= 0.60:
        return 'DESKTOP_REVIEW'
    else:
        return 'FIELD_VERIFICATION'


def find_data_files(base_path: str) -> Dict[str, List[str]]:
    """
    Find all data files in a directory structure.

    Args:
        base_path: Root directory to search

    Returns:
        Dictionary with file types as keys and paths as values
    """
    base = Path(base_path)

    files = {
        'shapefiles': [str(f) for f in base.rglob('*.shp')],
        'geotiffs': [str(f) for f in base.rglob('*.tif')] + [str(f) for f in base.rglob('*.tiff')],
        'excel': [str(f) for f in base.rglob('*.xlsx')],
        'geojson': [str(f) for f in base.rglob('*.geojson')],
    }

    return files


def validate_crs(gdf: gpd.GeoDataFrame, expected_crs: str = None) -> Tuple[bool, str]:
    """
    Validate and report CRS of a GeoDataFrame.

    Args:
        gdf: GeoDataFrame to validate
        expected_crs: Expected CRS (optional)

    Returns:
        Tuple of (is_valid, message)
    """
    if gdf.crs is None:
        return False, "CRS is not defined"

    crs_str = str(gdf.crs)

    if expected_crs and crs_str != expected_crs:
        return False, f"CRS mismatch: expected {expected_crs}, got {crs_str}"

    return True, f"CRS: {crs_str}"


def ensure_wgs84(gdf: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
    """
    Convert GeoDataFrame to WGS84 (EPSG:4326) if needed.

    Args:
        gdf: Input GeoDataFrame

    Returns:
        GeoDataFrame in WGS84
    """
    if gdf.crs is None:
        # Assume it's already in WGS84
        gdf = gdf.set_crs('EPSG:4326')
    elif str(gdf.crs) != 'EPSG:4326':
        gdf = gdf.to_crs('EPSG:4326')

    return gdf


def simplify_geometry(
    geometry,
    tolerance: float = 0.5,
    preserve_topology: bool = True
) -> Union[Polygon, MultiPolygon]:
    """
    Simplify geometry to reduce complexity.

    Args:
        geometry: Shapely geometry
        tolerance: Simplification tolerance
        preserve_topology: Whether to preserve topology

    Returns:
        Simplified geometry
    """
    return geometry.simplify(tolerance, preserve_topology=preserve_topology)


def calculate_overlap(geom1, geom2) -> float:
    """
    Calculate overlap percentage between two geometries.

    Args:
        geom1: First geometry
        geom2: Second geometry

    Returns:
        Overlap as fraction of smaller geometry
    """
    if not geom1.intersects(geom2):
        return 0.0

    intersection = geom1.intersection(geom2)
    smaller_area = min(geom1.area, geom2.area)

    if smaller_area == 0:
        return 0.0

    return intersection.area / smaller_area


def create_bbox(bounds: Tuple[float, float, float, float]) -> Polygon:
    """
    Create bounding box polygon from bounds.

    Args:
        bounds: (minx, miny, maxx, maxy)

    Returns:
        Shapely Polygon
    """
    from shapely.geometry import box
    return box(*bounds)


class ProgressTracker:
    """Simple progress tracking for batch operations."""

    def __init__(self, total: int, description: str = "Processing"):
        self.total = total
        self.current = 0
        self.description = description

    def update(self, n: int = 1) -> float:
        """Update progress and return percentage."""
        self.current += n
        return self.get_progress()

    def get_progress(self) -> float:
        """Get current progress as percentage."""
        if self.total == 0:
            return 100.0
        return (self.current / self.total) * 100

    def get_status(self) -> str:
        """Get status string."""
        return f"{self.description}: {self.current}/{self.total} ({self.get_progress():.1f}%)"

"""
Data Loader Module for BoundaryAI

Handles loading and processing of:
- ORI (Orthorectified Images) - GeoTIFF format
- ROR (Record of Rights) - Excel format
- Ground Truth Shapefiles - SHP format
"""

import os
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Union
from dataclasses import dataclass

import numpy as np
import pandas as pd
import geopandas as gpd
import rasterio
from rasterio.windows import Window, from_bounds
from shapely.geometry import box


@dataclass
class VillageSummary:
    """Summary statistics for a village"""
    name: str
    total_parcels: int
    total_area_sqm: float
    total_area_acres: float
    min_area_sqm: float
    max_area_sqm: float
    land_types: Dict[str, int]
    bounds: Tuple[float, float, float, float]
    crs: str


class ORILoader:
    """
    Load and handle large ORI (Orthorectified Image) files efficiently.

    Uses windowed reading to avoid loading entire large images into memory.
    """

    def __init__(self, image_path: str):
        """
        Initialize ORI loader.

        Args:
            image_path: Path to GeoTIFF file
        """
        self.path = Path(image_path)
        if not self.path.exists():
            raise FileNotFoundError(f"ORI file not found: {image_path}")

        self._metadata: Optional[Dict] = None

    @property
    def metadata(self) -> Dict:
        """Get image metadata (cached)"""
        if self._metadata is None:
            self._metadata = self.load_metadata()
        return self._metadata

    def load_metadata(self) -> Dict:
        """
        Load image metadata without loading full image into memory.

        Returns:
            Dictionary with image properties
        """
        with rasterio.open(self.path) as src:
            return {
                'path': str(self.path),
                'width': src.width,
                'height': src.height,
                'crs': str(src.crs),
                'bounds': src.bounds,
                'resolution': src.res,
                'pixel_size_m': src.res[0],
                'bands': src.count,
                'dtype': str(src.dtypes[0]),
                'nodata': src.nodata,
                'transform': src.transform
            }

    def load_window(
        self,
        bounds: Tuple[float, float, float, float],
        max_size: int = 4096
    ) -> Tuple[np.ndarray, rasterio.Affine]:
        """
        Load a specific window/region of the image.

        Args:
            bounds: (minx, miny, maxx, maxy) in CRS coordinates
            max_size: Maximum dimension (will downsample if larger)

        Returns:
            Tuple of (image array, transform)
        """
        with rasterio.open(self.path) as src:
            # Create window from bounds
            window = from_bounds(*bounds, src.transform)

            # Calculate output shape (respecting max_size)
            height = int(window.height)
            width = int(window.width)

            if max(height, width) > max_size:
                scale = max_size / max(height, width)
                out_height = int(height * scale)
                out_width = int(width * scale)
            else:
                out_height = height
                out_width = width

            # Read with resampling
            data = src.read(
                window=window,
                out_shape=(src.count, out_height, out_width),
                resampling=rasterio.enums.Resampling.bilinear
            )

            # Get transform for the window
            win_transform = src.window_transform(window)

            # Transpose to (H, W, C) format for display
            if data.shape[0] >= 3:
                data = np.transpose(data[:3], (1, 2, 0))
            else:
                data = np.transpose(data, (1, 2, 0))

            return data, win_transform

    def load_thumbnail(self, max_dim: int = 1024) -> np.ndarray:
        """
        Load downsampled version of entire image for preview.

        Args:
            max_dim: Maximum dimension of output

        Returns:
            Downsampled image array (H, W, C)
        """
        with rasterio.open(self.path) as src:
            # Calculate output shape
            scale = max_dim / max(src.height, src.width)
            out_height = int(src.height * scale)
            out_width = int(src.width * scale)

            # Read with resampling
            data = src.read(
                out_shape=(src.count, out_height, out_width),
                resampling=rasterio.enums.Resampling.bilinear
            )

            # Transpose to (H, W, C) format
            if data.shape[0] >= 3:
                data = np.transpose(data[:3], (1, 2, 0))
            else:
                data = np.transpose(data, (1, 2, 0))

            return data

    def get_center(self) -> Tuple[float, float]:
        """Get center coordinates of the image"""
        bounds = self.metadata['bounds']
        center_x = (bounds[0] + bounds[2]) / 2
        center_y = (bounds[1] + bounds[3]) / 2
        return (center_y, center_x)  # (lat, lon) format


class RORLoader:
    """
    Load and parse ROR (Record of Rights) Excel data.

    Handles the anonymized ROR Excel files from AP Land Records.
    """

    # Common column name mappings (handle variations in Excel files)
    COLUMN_MAPPINGS = {
        'survey_no': ['survey_no', 'survey_number', 'sy_no', 'syno', 'survey no'],
        'extent_acres': ['extent_acres', 'extent_ac', 'area_acres', 'extent (acres)', 'acres'],
        'extent_guntas': ['extent_guntas', 'guntas', 'extent (guntas)'],
        'land_type': ['land_type', 'landtype', 'classification', 'type'],
        'owner_name': ['owner_name', 'owner', 'pattadar_name', 'pattadar'],
        'village': ['village', 'village_name'],
        'mandal': ['mandal', 'mandal_name'],
    }

    def __init__(self, excel_path: str):
        """
        Initialize ROR loader.

        Args:
            excel_path: Path to ROR Excel file
        """
        self.path = Path(excel_path)
        if not self.path.exists():
            raise FileNotFoundError(f"ROR file not found: {excel_path}")

        self._data: Optional[pd.DataFrame] = None
        self._summary: Optional[Dict] = None

    @property
    def data(self) -> pd.DataFrame:
        """Get ROR data (cached)"""
        if self._data is None:
            self._data = self.load()
        return self._data

    def load(self) -> pd.DataFrame:
        """
        Load and standardize ROR Excel data.

        Handles AP ROR format with Telugu headers and merged cells.

        Returns:
            Standardized DataFrame with consistent column names
        """
        # Read Excel - try to detect header row
        df_raw = pd.read_excel(self.path, header=None)

        # Find the row with actual column headers (contains "LP" or "Extent" or "ULPIN")
        header_row = None
        for idx, row in df_raw.iterrows():
            row_str = ' '.join(str(v) for v in row.values if pd.notna(v))
            if 'LP' in row_str and ('Extent' in row_str or 'ULPIN' in row_str):
                header_row = idx
                break

        if header_row is None:
            # Fall back to row 1 (common pattern)
            header_row = 1

        # Find the data start row (first row with numeric serial number)
        data_start = header_row + 1
        for idx in range(header_row + 1, min(header_row + 5, len(df_raw))):
            first_val = df_raw.iloc[idx, 0]
            if pd.notna(first_val):
                try:
                    int(float(first_val))
                    data_start = idx
                    break
                except (ValueError, TypeError):
                    continue

        # Read with proper header
        df = pd.read_excel(self.path, skiprows=data_start)

        # Assign standard column names based on position
        # AP ROR format: Serial, LP No, Extent(Acres), ULPIN, Survey No, ...
        col_mapping = {}
        for idx, col in enumerate(df.columns):
            col_str = str(col).lower()
            if idx == 0:
                col_mapping[col] = 'serial_no'
            elif idx == 1 or 'lp' in col_str:
                col_mapping[col] = 'lp_number'
            elif idx == 2 or 'extent' in col_str or 'acres' in col_str:
                col_mapping[col] = 'extent_acres'
            elif idx == 3 or 'ulpin' in col_str:
                col_mapping[col] = 'ulpin'
            elif idx == 4 or 'survey' in col_str or 'సర్వే' in col_str:
                col_mapping[col] = 'survey_no'
            elif 'స్వభావ' in col_str or 'nature' in col_str:
                col_mapping[col] = 'land_type'
            elif 'పేరు' in col_str or 'name' in col_str:
                col_mapping[col] = 'owner_name'

        df = df.rename(columns=col_mapping)

        # Parse extent (acres) - handle "Acres-Cents" format
        if 'extent_acres' in df.columns:
            df['extent_acres'] = pd.to_numeric(df['extent_acres'], errors='coerce').fillna(0)
            # Convert to sqm (1 acre = 4046.86 sqm)
            df['extent_sqm'] = df['extent_acres'] * 4046.86

        # Clean survey numbers - extract just the number part
        if 'survey_no' in df.columns:
            def clean_survey_no(val):
                if pd.isna(val):
                    return ''
                s = str(val).strip()
                # Remove "(SY No)" suffix and newlines
                s = s.replace('\n', ' ').replace('(SY No)', '').strip()
                return s

            df['survey_no'] = df['survey_no'].apply(clean_survey_no)

        # Remove rows with no valid data
        if 'extent_acres' in df.columns:
            df = df[df['extent_acres'] > 0].copy()

        return df

    def get_summary(self) -> Dict:
        """
        Get summary statistics for the ROR data.

        Returns:
            Dictionary with summary statistics
        """
        if self._summary is not None:
            return self._summary

        df = self.data

        self._summary = {
            'total_records': len(df),
            'total_area_sqm': df['extent_sqm'].sum() if 'extent_sqm' in df.columns else 0,
            'total_area_acres': df['extent_acres'].sum() if 'extent_acres' in df.columns else 0,
            'columns': list(df.columns),
            'land_types': df['land_type'].value_counts().to_dict() if 'land_type' in df.columns else {},
            'area_stats': df['extent_acres'].describe().to_dict() if 'extent_acres' in df.columns else {}
        }

        return self._summary

    def get_parcel_constraints(self) -> List[Dict]:
        """
        Get list of expected parcels with their constraints.

        Returns:
            List of dictionaries with parcel constraints
        """
        df = self.data
        constraints = []

        for _, row in df.iterrows():
            constraint = {
                'survey_no': row.get('survey_no', ''),
                'expected_area_sqm': row.get('extent_sqm', 0),
                'expected_area_acres': row.get('extent_acres', 0),
                'land_type': row.get('land_type', 'Unknown'),
                'owner': row.get('owner_name', 'Unknown')
            }
            constraints.append(constraint)

        return constraints

    def get_expected_count(self) -> int:
        """Get expected number of parcels"""
        return len(self.data)

    def get_area_distribution(self) -> Tuple[float, float, float]:
        """
        Get area distribution statistics.

        Returns:
            Tuple of (min_area, median_area, max_area) in sqm
        """
        df = self.data
        if 'extent_sqm' not in df.columns:
            return (0, 0, 0)

        areas = df['extent_sqm']
        return (areas.min(), areas.median(), areas.max())


class ShapefileLoader:
    """
    Load and handle ground truth shapefiles.

    Provides methods for loading, analyzing, and comparing parcel geometries.
    """

    def __init__(self, shp_path: str):
        """
        Initialize shapefile loader.

        Args:
            shp_path: Path to shapefile (.shp)
        """
        self.path = Path(shp_path)
        if not self.path.exists():
            raise FileNotFoundError(f"Shapefile not found: {shp_path}")

        self._gdf: Optional[gpd.GeoDataFrame] = None
        self._summary: Optional[VillageSummary] = None

    @property
    def gdf(self) -> gpd.GeoDataFrame:
        """Get GeoDataFrame (cached)"""
        if self._gdf is None:
            self._gdf = self.load()
        return self._gdf

    def load(self) -> gpd.GeoDataFrame:
        """
        Load shapefile into GeoDataFrame.

        Returns:
            GeoDataFrame with calculated area fields
        """
        gdf = gpd.read_file(self.path)

        # Calculate areas
        gdf['area_sqm'] = gdf.geometry.area
        gdf['area_acres'] = gdf['area_sqm'] / 4046.86

        # Add parcel ID if not present
        if 'parcel_id' not in gdf.columns:
            gdf['parcel_id'] = range(len(gdf))

        return gdf

    def get_bounds(self) -> Tuple[float, float, float, float]:
        """Get bounding box (minx, miny, maxx, maxy)"""
        return tuple(self.gdf.total_bounds)

    def get_center(self) -> Tuple[float, float]:
        """Get center point (lat, lon)"""
        bounds = self.get_bounds()
        center_x = (bounds[0] + bounds[2]) / 2
        center_y = (bounds[1] + bounds[3]) / 2
        return (center_y, center_x)

    def get_summary(self) -> VillageSummary:
        """
        Get village summary statistics.

        Returns:
            VillageSummary dataclass with statistics
        """
        if self._summary is not None:
            return self._summary

        gdf = self.gdf

        # Try to get village name from path or data
        village_name = self.path.stem

        # Get land type distribution if available
        land_types = {}
        for col in ['land_type', 'landtype', 'type', 'classification']:
            if col in gdf.columns:
                land_types = gdf[col].value_counts().to_dict()
                break

        self._summary = VillageSummary(
            name=village_name,
            total_parcels=len(gdf),
            total_area_sqm=gdf['area_sqm'].sum(),
            total_area_acres=gdf['area_acres'].sum(),
            min_area_sqm=gdf['area_sqm'].min(),
            max_area_sqm=gdf['area_sqm'].max(),
            land_types=land_types,
            bounds=self.get_bounds(),
            crs=str(gdf.crs)
        )

        return self._summary

    def to_geojson(self) -> Dict:
        """Convert to GeoJSON format"""
        return self.gdf.__geo_interface__

    def get_parcel(self, parcel_id: int) -> Optional[gpd.GeoDataFrame]:
        """Get a single parcel by ID"""
        mask = self.gdf['parcel_id'] == parcel_id
        if mask.any():
            return self.gdf[mask].iloc[0]
        return None


class VillageDataset:
    """
    Combined dataset for a village with ORI, ROR, and ground truth.

    Provides a unified interface for accessing all data for a village.
    """

    def __init__(
        self,
        name: str,
        ori_path: Optional[str] = None,
        ror_path: Optional[str] = None,
        shapefile_path: Optional[str] = None
    ):
        """
        Initialize village dataset.

        Args:
            name: Village name
            ori_path: Path to ORI GeoTIFF (optional)
            ror_path: Path to ROR Excel (optional)
            shapefile_path: Path to ground truth shapefile (optional)
        """
        self.name = name

        # Initialize loaders
        self.ori = ORILoader(ori_path) if ori_path else None
        self.ror = RORLoader(ror_path) if ror_path else None
        self.shapefile = ShapefileLoader(shapefile_path) if shapefile_path else None

    def get_summary(self) -> Dict:
        """Get combined summary of all data sources"""
        summary = {'name': self.name}

        if self.ori:
            summary['ori'] = self.ori.metadata

        if self.ror:
            summary['ror'] = self.ror.get_summary()

        if self.shapefile:
            shp_summary = self.shapefile.get_summary()
            summary['shapefile'] = {
                'total_parcels': shp_summary.total_parcels,
                'total_area_acres': shp_summary.total_area_acres,
                'bounds': shp_summary.bounds,
                'crs': shp_summary.crs
            }

        return summary

    def get_ror_constraints(self) -> List[Dict]:
        """Get ROR constraints for segmentation"""
        if self.ror:
            return self.ror.get_parcel_constraints()
        return []

    def get_ground_truth(self) -> Optional[gpd.GeoDataFrame]:
        """Get ground truth parcels"""
        if self.shapefile:
            return self.shapefile.gdf
        return None

    def get_center(self) -> Tuple[float, float]:
        """Get center coordinates for map display"""
        if self.shapefile:
            return self.shapefile.get_center()
        if self.ori:
            return self.ori.get_center()
        return (16.5, 80.6)  # Default to AP center


def discover_villages(base_path: str) -> List[Dict]:
    """
    Discover available villages from data directory.

    Args:
        base_path: Base directory to search

    Returns:
        List of dictionaries with village info
    """
    base = Path(base_path)
    villages = []

    # Look for shapefiles
    for shp_file in base.rglob('*.shp'):
        village_name = shp_file.stem
        village_dir = shp_file.parent

        # Look for matching ROR file
        ror_patterns = [
            f'{village_name}*ROR*.xlsx',
            f'{village_name}*.xlsx',
            f'*{village_name}*.xlsx'
        ]

        ror_file = None
        for pattern in ror_patterns:
            matches = list(village_dir.glob(pattern))
            if matches:
                ror_file = matches[0]
                break

        villages.append({
            'name': village_name,
            'shapefile': str(shp_file),
            'ror': str(ror_file) if ror_file else None,
            'directory': str(village_dir)
        })

    return villages


# Convenience functions

def load_village(
    name: str,
    shapefile_path: str,
    ror_path: Optional[str] = None,
    ori_path: Optional[str] = None
) -> VillageDataset:
    """
    Load a village dataset.

    Args:
        name: Village name
        shapefile_path: Path to shapefile
        ror_path: Path to ROR Excel (optional)
        ori_path: Path to ORI image (optional)

    Returns:
        VillageDataset instance
    """
    return VillageDataset(
        name=name,
        shapefile_path=shapefile_path,
        ror_path=ror_path,
        ori_path=ori_path
    )

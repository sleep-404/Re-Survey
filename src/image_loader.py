"""
Image Loader for Large ORI TIFF Files

Handles loading and tiling of large ortho-rectified drone imagery.
Supports Cloud Optimized GeoTIFFs (COG) for efficient access.
"""

import numpy as np
import rasterio
from rasterio.windows import Window
from pathlib import Path
from typing import Generator, Tuple, Optional
from dataclasses import dataclass


@dataclass
class ImageTile:
    """Represents a tile extracted from a large image."""
    data: np.ndarray  # RGB or RGBA array (H, W, C)
    window: Window    # Rasterio window (col_off, row_off, width, height)
    transform: rasterio.Affine  # Geo transform for this tile
    crs: str          # Coordinate reference system
    tile_id: Tuple[int, int]  # (row_idx, col_idx)


class ORILoader:
    """
    Loader for Ortho-Rectified Images (ORI) from drone surveys.

    Handles large TIFF files by processing them in tiles to avoid
    memory issues with 2-3 GB images.
    """

    def __init__(self, image_path: str, tile_size: int = 1024, overlap: int = 128):
        """
        Initialize the ORI loader.

        Args:
            image_path: Path to the TIFF file
            tile_size: Size of each tile in pixels (default 1024x1024)
            overlap: Overlap between tiles in pixels (helps with edge detection)
        """
        self.image_path = Path(image_path)
        self.tile_size = tile_size
        self.overlap = overlap
        self.stride = tile_size - overlap

        if not self.image_path.exists():
            raise FileNotFoundError(f"Image not found: {image_path}")

        # Open and get metadata
        with rasterio.open(self.image_path) as src:
            self.width = src.width
            self.height = src.height
            self.crs = src.crs
            self.transform = src.transform
            self.count = src.count  # Number of bands
            self.dtype = src.dtypes[0]

        # Calculate number of tiles
        self.n_tiles_x = (self.width + self.stride - 1) // self.stride
        self.n_tiles_y = (self.height + self.stride - 1) // self.stride
        self.total_tiles = self.n_tiles_x * self.n_tiles_y

    def get_metadata(self) -> dict:
        """Get image metadata."""
        return {
            'path': str(self.image_path),
            'width': self.width,
            'height': self.height,
            'crs': str(self.crs),
            'tile_size': self.tile_size,
            'overlap': self.overlap,
            'total_tiles': self.total_tiles,
            'n_tiles_x': self.n_tiles_x,
            'n_tiles_y': self.n_tiles_y,
        }

    def iter_tiles(self) -> Generator[ImageTile, None, None]:
        """
        Iterate over all tiles in the image.

        Yields:
            ImageTile objects containing tile data and metadata
        """
        with rasterio.open(self.image_path) as src:
            for row_idx in range(self.n_tiles_y):
                for col_idx in range(self.n_tiles_x):
                    # Calculate window
                    col_off = col_idx * self.stride
                    row_off = row_idx * self.stride

                    # Adjust size for edge tiles
                    width = min(self.tile_size, self.width - col_off)
                    height = min(self.tile_size, self.height - row_off)

                    window = Window(col_off, row_off, width, height)

                    # Read tile data
                    data = src.read(window=window)

                    # Convert from (C, H, W) to (H, W, C) for SAM
                    if data.shape[0] >= 3:
                        # Take RGB channels
                        data = np.transpose(data[:3], (1, 2, 0))
                    else:
                        # Grayscale - repeat to make RGB
                        data = np.transpose(data, (1, 2, 0))
                        data = np.repeat(data, 3, axis=2)

                    # Get transform for this tile
                    tile_transform = rasterio.windows.transform(window, src.transform)

                    yield ImageTile(
                        data=data,
                        window=window,
                        transform=tile_transform,
                        crs=str(src.crs),
                        tile_id=(row_idx, col_idx)
                    )

    def get_tile(self, row_idx: int, col_idx: int) -> Optional[ImageTile]:
        """
        Get a specific tile by index.

        Args:
            row_idx: Row index of tile
            col_idx: Column index of tile

        Returns:
            ImageTile or None if indices are out of bounds
        """
        if row_idx >= self.n_tiles_y or col_idx >= self.n_tiles_x:
            return None

        with rasterio.open(self.image_path) as src:
            col_off = col_idx * self.stride
            row_off = row_idx * self.stride

            width = min(self.tile_size, self.width - col_off)
            height = min(self.tile_size, self.height - row_off)

            window = Window(col_off, row_off, width, height)
            data = src.read(window=window)

            if data.shape[0] >= 3:
                data = np.transpose(data[:3], (1, 2, 0))
            else:
                data = np.transpose(data, (1, 2, 0))
                data = np.repeat(data, 3, axis=2)

            tile_transform = rasterio.windows.transform(window, src.transform)

            return ImageTile(
                data=data,
                window=window,
                transform=tile_transform,
                crs=str(src.crs),
                tile_id=(row_idx, col_idx)
            )

    def get_full_image_downsampled(self, max_size: int = 2048) -> Tuple[np.ndarray, float]:
        """
        Get a downsampled version of the full image for preview.

        Args:
            max_size: Maximum dimension of output image

        Returns:
            Tuple of (image array, scale factor)
        """
        scale = max_size / max(self.width, self.height)
        out_width = int(self.width * scale)
        out_height = int(self.height * scale)

        with rasterio.open(self.image_path) as src:
            # Read at reduced resolution
            data = src.read(
                out_shape=(src.count, out_height, out_width),
                resampling=rasterio.enums.Resampling.bilinear
            )

            if data.shape[0] >= 3:
                data = np.transpose(data[:3], (1, 2, 0))
            else:
                data = np.transpose(data, (1, 2, 0))
                data = np.repeat(data, 3, axis=2)

        return data, scale


def pixel_to_geo(transform: rasterio.Affine, col: int, row: int) -> Tuple[float, float]:
    """Convert pixel coordinates to geographic coordinates."""
    x, y = transform * (col, row)
    return x, y


def geo_to_pixel(transform: rasterio.Affine, x: float, y: float) -> Tuple[int, int]:
    """Convert geographic coordinates to pixel coordinates."""
    inv_transform = ~transform
    col, row = inv_transform * (x, y)
    return int(col), int(row)

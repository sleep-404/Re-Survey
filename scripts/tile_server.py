#!/usr/bin/env python3
"""
Simple tile server for ORI GeoTIFF files.
Serves XYZ tiles on-the-fly from a GeoTIFF.

Usage:
    python scripts/tile_server.py --input "AI Hackathon/nibanupudi.tif" --port 8080

Then configure the dashboard to use: http://localhost:8080/tiles/{z}/{x}/{y}.png

Dependencies:
    pip install rio-tiler fastapi uvicorn
"""

import argparse
from pathlib import Path

try:
    from fastapi import FastAPI, Response
    from fastapi.middleware.cors import CORSMiddleware
    from rio_tiler.io import Reader
    from rio_tiler.errors import TileOutsideBounds
    import uvicorn
except ImportError:
    print("Missing dependencies. Install with:")
    print("  pip install rio-tiler fastapi uvicorn")
    exit(1)


def create_app(tiff_path: str):
    app = FastAPI(title="ORI Tile Server")

    # Enable CORS for local development
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["GET"],
        allow_headers=["*"],
    )

    @app.get("/tiles/{z}/{x}/{y}.png")
    async def get_tile(z: int, x: int, y: int):
        """Serve a single tile from the GeoTIFF."""
        try:
            with Reader(tiff_path) as src:
                img = src.tile(x, y, z, tilesize=256)
                content = img.render(img_format="PNG")
                return Response(content=content, media_type="image/png")
        except TileOutsideBounds:
            # Return transparent tile for areas outside the image
            return Response(content=b"", status_code=204)
        except Exception as e:
            print(f"Error serving tile {z}/{x}/{y}: {e}")
            return Response(content=b"", status_code=500)

    @app.get("/info")
    async def get_info():
        """Get info about the GeoTIFF."""
        with Reader(tiff_path) as src:
            return {
                "bounds": src.bounds,
                "crs": str(src.crs),
                "minzoom": src.minzoom,
                "maxzoom": src.maxzoom,
            }

    @app.get("/health")
    async def health():
        return {"status": "ok", "file": tiff_path}

    return app


def main():
    parser = argparse.ArgumentParser(description="Serve GeoTIFF as XYZ tiles")
    parser.add_argument("--input", "-i", required=True, help="Path to GeoTIFF file")
    parser.add_argument("--port", "-p", type=int, default=8080, help="Port (default: 8080)")
    parser.add_argument("--host", default="0.0.0.0", help="Host (default: 0.0.0.0)")

    args = parser.parse_args()

    tiff_path = Path(args.input)
    if not tiff_path.exists():
        print(f"Error: File not found: {tiff_path}")
        exit(1)

    print(f"Starting tile server for: {tiff_path}")
    print(f"Tiles available at: http://localhost:{args.port}/tiles/{{z}}/{{x}}/{{y}}.png")
    print(f"Info endpoint: http://localhost:{args.port}/info")
    print()

    app = create_app(str(tiff_path.absolute()))
    uvicorn.run(app, host=args.host, port=args.port)


if __name__ == "__main__":
    main()

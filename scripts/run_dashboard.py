#!/usr/bin/env python3
"""
BoundaryAI Dashboard Runner

Quick script to launch the Streamlit dashboard.

Usage:
    python run_dashboard.py
    # or
    streamlit run ui/app.py
"""

import subprocess
import sys
from pathlib import Path


def main():
    """Launch the Streamlit dashboard."""
    # Get the app path
    app_path = Path(__file__).parent / "ui" / "app.py"

    if not app_path.exists():
        print(f"Error: Dashboard app not found at {app_path}")
        sys.exit(1)

    print("=" * 50)
    print("  BoundaryAI - Land Parcel Analysis Dashboard")
    print("=" * 50)
    print()
    print("Starting dashboard...")
    print("Open http://localhost:8501 in your browser")
    print()
    print("Press Ctrl+C to stop")
    print()

    # Launch Streamlit
    subprocess.run([
        sys.executable, "-m", "streamlit", "run",
        str(app_path),
        "--server.headless", "true",
        "--browser.gatherUsageStats", "false"
    ])


if __name__ == "__main__":
    main()

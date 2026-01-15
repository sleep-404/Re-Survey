# BoundaryAI - Land Parcel Analysis System

AI-powered land parcel boundary detection and validation system for the Andhra Pradesh Land Re-Survey project.

## Project Structure

```
Re-Survey/
├── README.md                 # This file
├── requirements.txt          # Python dependencies
├── requirements-gpu.txt      # GPU-enabled dependencies
│
├── docs/                     # Documentation
│   ├── CHALLENGE_SUMMARY.md  # Problem statement
│   ├── SOLUTION_APPROACHES.md
│   ├── IMPLEMENTATION_PLAN.md
│   ├── UI_WORKFLOW.md        # Officer workflow specs
│   ├── CLOUD_DEPLOY.md       # Deployment guide
│   ├── DEMO_SCRIPT.md        # Demo presentation
│   └── STATUS.md             # Project status
│
├── src/                      # Core ML/AI modules
│   ├── pipeline.py           # End-to-end processing
│   ├── sam_segmenter.py      # SAM model integration
│   ├── image_loader.py       # TIFF/tile loading
│   ├── vectorization.py      # Mask to polygon
│   ├── edge_detection.py     # Classical CV
│   ├── ror_engine.py         # ROR record matching
│   ├── confidence.py         # Confidence scoring
│   ├── topology.py           # Gap/overlap fixing
│   └── evaluation.py         # Metrics calculation
│
├── web/                      # Web application
│   ├── app.py                # Flask backend
│   ├── templates/            # Jinja2 HTML templates
│   │   ├── dashboard.html
│   │   ├── village_map.html
│   │   ├── review_queue.html
│   │   └── parcel_detail.html
│   └── static/               # CSS, JS, images
│
├── data/                     # Data files
│   ├── raw/                  # Source data
│   │   ├── kanumuru/         # Shapefiles + ROR
│   │   └── nibanupudi/
│   ├── processed/            # Processed GeoJSON
│   │   ├── villages.json
│   │   ├── kanumuru_parcels.geojson
│   │   └── nibanupudi_parcels.geojson
│   └── imagery/              # ECW/TIFF (gitignored)
│
├── scripts/                  # Utility scripts
│   ├── prepare_data.py       # Data preprocessing
│   ├── run_pipeline.py       # Run SAM pipeline
│   ├── deploy-aws.sh         # AWS deployment
│   └── deploy-gcp.sh         # GCP deployment
│
├── designs/                  # UI design assets
│   └── stitch/               # Stitch HTML exports
│
├── docker/                   # Container files
│   ├── Dockerfile
│   └── docker-compose.yml
│
├── tests/                    # Test files
└── archive/                  # Legacy/backup code
```

## Quick Start

### 1. Setup Environment

```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Run Web Demo

```bash
# Start Flask server
cd web
python app.py

# Open http://localhost:8503
```

### 3. Process Raw Data (Optional)

```bash
# Regenerate processed data from shapefiles
python scripts/prepare_data.py
```

## Features

- **AI Detection**: SAM-based parcel boundary extraction from drone imagery
- **ROR Matching**: Automatic matching of detected parcels to official records
- **Conflict Detection**: Flags parcels with >5% area mismatch
- **Interactive Dashboard**: Review and approve parcels with map visualization
- **Officer Workflow**: Approve, Edit, Split, Merge, Field Verify actions

## Demo Data

- **Kanumuru Village**: 1,125 parcels
- **Nibanupudi Village**: 857 parcels
- **Total**: 1,982 parcels with simulated AI detection and ROR matching

## Tech Stack

- **Backend**: Python, Flask, GeoPandas
- **Frontend**: HTML, Tailwind CSS, Leaflet.js
- **ML**: SAM (Segment Anything Model), OpenCV
- **Deployment**: Docker, AWS/GCP

## License

Developed for the AP Land Re-Survey Hackathon.

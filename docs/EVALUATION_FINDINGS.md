# SAM Evaluation Findings

## Objective
Evaluate SAM (Segment Anything Model) for automatic land parcel boundary detection from drone imagery.

---

## Test Setup

| Parameter | Value |
|-----------|-------|
| Village | Nibanupudi |
| Image | nibanupudi.tif (10 GB, converted from ECW) |
| Image Size | 23,137 × 25,939 pixels |
| Ground Truth | 105 parcels (subset for evaluation) |
| SAM Model | vit_h (best quality) |
| Tile Size | 2048 × 2048 |
| Tiles Processed | 195 |
| Processing Time | 54 minutes (on T4 GPU) |

---

## Results Summary

| Metric | Value | Interpretation |
|--------|-------|----------------|
| SAM Segments Detected | 12,032 | Over-segmented (~115 per parcel) |
| Ground Truth Parcels | 105 | Target |
| **Mean IoU** | **25.84%** | Low - segments don't match parcels |
| **Coverage** | **78.46%** | Good - SAM covers the land area |
| SAM Avg Segment Size | 66 sqm | Too small |
| GT Avg Parcel Size | 2,201 sqm | 33× larger than SAM segments |

### IoU Distribution
- IoU > 30%: 35/105 (33.3%)
- IoU > 50%: 6/105 (5.7%)
- IoU > 70%: 2/105 (1.9%)
- Missed parcels: 0/105 (0%)

### Best Matches
| Parcel | IoU | Area (sqm) |
|--------|-----|------------|
| 46 | 74.7% | 4,114 |
| 44 | 72.6% | 8,016 |
| 45 | 56.4% | 1,013 |

### Worst Matches
| Parcel | IoU | Area (sqm) |
|--------|-----|------------|
| 36 | 2.4% | 115 |
| 19 | 3.1% | 2,090 |
| 95 | 4.8% | 444 |

---

## Key Finding

**SAM detects the land but fragments it.**

- Coverage is 78% → SAM sees the land area
- IoU is 26% → SAM breaks each parcel into ~100 tiny segments
- SAM segments by visual texture (crops, shadows, soil) not by bunds (parcel boundaries)

---

## Root Cause

SAM was trained on general images, not satellite/drone agricultural imagery. It segments based on:
- Color differences (different crops)
- Texture changes (plowed vs unplowed)
- Shadows and lighting variations

It does NOT understand:
- Bunds (raised earth boundaries between fields)
- Parcel ownership boundaries
- Agricultural field semantics

---

## Next Steps

### Option 1: Post-Processing (Quick)
- Merge adjacent SAM segments into parcel-sized regions
- Filter by area (remove tiny segments)
- Apply topology rules (no gaps, no overlaps)

### Option 2: Edge Detection Hybrid
- Use edge detection to find bund lines
- Use SAM segments as seeds
- Merge segments within bund boundaries

### Option 3: Fine-tune SAM (Best but needs data)
- Fine-tune SAM on labeled parcel data
- Requires training dataset of parcel boundaries

### Option 4: Different Model
- Use models trained for satellite imagery (SpaceNet, etc.)
- Or semantic segmentation models for agriculture

---

## Files

| File | Description |
|------|-------------|
| `AI Hackathon/nibanupudi.tif` | 10GB GeoTIFF drone imagery |
| `evaluation_output/nibanupudi_105parcels/sam_raw_segments.geojson` | 12,032 SAM segments |
| `evaluation_output/nibanupudi_105parcels/ground_truth.geojson` | 105 GT parcels |
| `evaluation_output/nibanupudi_105parcels/run_metadata.json` | SAM run parameters |

---

## TODO

- [ ] Visualize one parcel: imagery + GT boundary + SAM segments
- [ ] Try merging adjacent SAM segments
- [ ] Test edge detection approach
- [ ] Calculate metrics after post-processing

---

*Last updated: 2026-01-17*

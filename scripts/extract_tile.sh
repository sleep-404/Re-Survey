#!/bin/bash
cd /Users/jeevan/RealTimeGovernance/prototypes/Re-Survey
docker run --rm -v "$(pwd)/AI Hackathon:/data" ginetto/gdal:2.4.4_ECW \
  gdal_translate -of GTiff -srcwin 50000 70000 2048 2048 \
  "/data/589571_kanumuru_reprocess_247.ecw" "/data/kanumuru_tile.tif"
echo "Done! Check AI Hackathon/kanumuru_tile.tif"

# BoundaryAI Cloud Deployment Guide

## Quick Start (Recommended)

### Option 1: AWS (Most Common)

**Cost: ~$0.53/hour** (g4dn.xlarge with T4 GPU)

```bash
# 1. Launch a g4dn.xlarge instance from AWS Console
#    - AMI: Ubuntu 22.04 LTS
#    - Instance type: g4dn.xlarge
#    - Storage: 100GB
#    - Security group: Allow ports 22 (SSH) and 8501 (Streamlit)

# 2. SSH into the instance
ssh -i your-key.pem ubuntu@<instance-ip>

# 3. Run setup script (installs Docker + NVIDIA)
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Install NVIDIA Container Toolkit
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
curl -s -L https://nvidia.github.io/libnvidia-container/$distribution/libnvidia-container.list | \
    sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
    sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list
sudo apt-get update
sudo apt-get install -y nvidia-container-toolkit
sudo nvidia-ctk runtime configure --runtime=docker
sudo systemctl restart docker

# Logout and login again for docker group to take effect
exit
```

```bash
# 4. From your LOCAL machine, upload the code
scp -i your-key.pem -r /path/to/Re-Survey ubuntu@<instance-ip>:~/boundaryai/

# 5. SSH back in and run
ssh -i your-key.pem ubuntu@<instance-ip>
cd ~/boundaryai
docker compose up --build -d

# 6. Access in browser
open http://<instance-ip>:8501
```

### Option 2: GCP

**Cost: ~$0.55/hour** (n1-standard-4 + T4 GPU)

```bash
# Launch instance
gcloud compute instances create boundaryai-gpu \
    --zone=us-central1-a \
    --machine-type=n1-standard-4 \
    --accelerator=type=nvidia-tesla-t4,count=1 \
    --maintenance-policy=TERMINATE \
    --image-family=ubuntu-2204-lts \
    --image-project=ubuntu-os-cloud \
    --boot-disk-size=100GB

# SSH and setup (same as AWS step 3)
gcloud compute ssh boundaryai-gpu --zone=us-central1-a

# Upload
gcloud compute scp --recurse ./Re-Survey boundaryai-gpu:~/boundaryai/ --zone=us-central1-a
```

---

## Data Transfer Strategy

### The Problem
- ECW/TIFF files are 2-3 GB each
- Uploading takes time on slow connections

### The Solution
Your data is already structured correctly:

```
data/
├── input/           # Put ECW/TIFF files here (on cloud)
│   └── kanumuru.tif
└── output/          # Results appear here (download these)
    ├── parcels.geojson   (~1-5 MB)
    └── stats.json        (~1 KB)
```

**Upload once, process many times:**

```bash
# Upload your ECW files to cloud (do this once)
scp -i key.pem "AI Hackathon/*.ecw" ubuntu@<ip>:~/boundaryai/data/input/

# Or use rsync for resumable upload
rsync -avz --progress -e "ssh -i key.pem" \
    "AI Hackathon/" ubuntu@<ip>:~/boundaryai/data/input/
```

**Download only results:**
```bash
# Results are tiny - just polygons
scp -i key.pem ubuntu@<ip>:~/boundaryai/data/output/* ./results/
```

---

## Converting ECW to TIFF (on cloud)

The cloud instance can convert ECW files since it runs x86:

```bash
# Inside the cloud instance
docker compose run --rm gdal-ecw \
    gdal_translate -of GTiff \
    /data/input/589571_kanumuru_reprocess_247.ecw \
    /data/input/kanumuru.tif

# Or extract just one tile for testing
docker compose run --rm gdal-ecw \
    gdal_translate -of GTiff -srcwin 50000 70000 2048 2048 \
    /data/input/589571_kanumuru_reprocess_247.ecw \
    /data/input/kanumuru_tile.tif
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                 CLOUD GPU INSTANCE                           │
│                                                              │
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│   │  ECW/TIFF    │───▶│  SAM + GPU   │───▶│  GeoJSON     │  │
│   │  (2-3 GB)    │    │  Processing  │    │  (1-5 MB)    │  │
│   └──────────────┘    └──────────────┘    └──────┬───────┘  │
│                                                   │          │
│   ┌──────────────────────────────────────────────┴───────┐  │
│   │              Streamlit Dashboard                      │  │
│   │              http://<ip>:8501                         │  │
│   └──────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────┬─┘
                                                            │
                        Browser Access ◀────────────────────┘
```

**Why the UI works without transferring huge files:**
- Map tiles come from OpenStreetMap (not your data)
- Parcel polygons are just coordinates (few KB each)
- You never need to view the full raw imagery in browser

---

## Cost Summary

| Provider | Instance | GPU | Cost/Hour | 2-Hour Session |
|----------|----------|-----|-----------|----------------|
| AWS | g4dn.xlarge | T4 | $0.53 | $1.06 |
| GCP | n1-standard-4 | T4 | $0.55 | $1.10 |
| AWS | g4dn.2xlarge | T4 | $0.75 | $1.50 |

**Remember to STOP your instance when done!**

```bash
# AWS
aws ec2 stop-instances --instance-ids <instance-id>

# GCP
gcloud compute instances stop boundaryai-gpu --zone=us-central1-a
```

---

## Troubleshooting

### "NVIDIA driver not found"
```bash
# Check if GPU is visible
nvidia-smi

# If not, reboot after driver install
sudo reboot
```

### "Docker permission denied"
```bash
# Add yourself to docker group
sudo usermod -aG docker $USER
# Logout and login again
```

### "Port 8501 not accessible"
```bash
# AWS: Check security group allows port 8501
# GCP: Check firewall rules
gcloud compute firewall-rules create allow-streamlit --allow=tcp:8501
```

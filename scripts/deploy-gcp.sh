#!/bin/bash
# Deploy BoundaryAI to Google Cloud GPU Instance
# Prerequisites: gcloud CLI configured

set -e

# Configuration - EDIT THESE
PROJECT_ID="your-project-id"
ZONE="us-central1-a"
INSTANCE_NAME="boundaryai-gpu"
MACHINE_TYPE="n1-standard-4"  # 4 vCPU, 15GB RAM
GPU_TYPE="nvidia-tesla-t4"    # ~$0.35/hour for GPU + ~$0.19 for machine

echo "=============================================="
echo "BoundaryAI GCP Deployment"
echo "=============================================="
echo "Machine: $MACHINE_TYPE + $GPU_TYPE (~\$0.55/hour total)"
echo ""

# Create instance with GPU
gcloud compute instances create $INSTANCE_NAME \
    --project=$PROJECT_ID \
    --zone=$ZONE \
    --machine-type=$MACHINE_TYPE \
    --accelerator=type=$GPU_TYPE,count=1 \
    --maintenance-policy=TERMINATE \
    --image-family=ubuntu-2204-lts \
    --image-project=ubuntu-os-cloud \
    --boot-disk-size=100GB \
    --boot-disk-type=pd-ssd \
    --tags=http-server,streamlit \
    --metadata=startup-script='#!/bin/bash
set -e

# Install NVIDIA drivers
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -s -L https://nvidia.github.io/libnvidia-container/$distribution/libnvidia-container.list | \
    sed "s#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g" | \
    tee /etc/apt/sources.list.d/nvidia-container-toolkit.list

apt-get update
apt-get install -y nvidia-driver-535 nvidia-container-toolkit

# Install Docker
curl -fsSL https://get.docker.com | sh
usermod -aG docker $USER
nvidia-ctk runtime configure --runtime=docker
systemctl restart docker

mkdir -p /home/$USER/boundaryai/data
'

# Create firewall rule for Streamlit
gcloud compute firewall-rules create allow-streamlit \
    --project=$PROJECT_ID \
    --allow=tcp:8501 \
    --target-tags=streamlit \
    --description="Allow Streamlit access" 2>/dev/null || true

# Get external IP
sleep 10
EXTERNAL_IP=$(gcloud compute instances describe $INSTANCE_NAME \
    --project=$PROJECT_ID \
    --zone=$ZONE \
    --format='get(networkInterfaces[0].accessConfigs[0].natIP)')

echo ""
echo "=============================================="
echo "DEPLOYMENT COMPLETE"
echo "=============================================="
echo "Instance: $INSTANCE_NAME"
echo "External IP: $EXTERNAL_IP"
echo ""
echo "Wait 5-10 minutes for setup, then:"
echo ""
echo "1. SSH into instance:"
echo "   gcloud compute ssh $INSTANCE_NAME --zone=$ZONE"
echo ""
echo "2. Upload code and data:"
echo "   gcloud compute scp --recurse ./* $INSTANCE_NAME:~/boundaryai/ --zone=$ZONE"
echo ""
echo "3. Build and run:"
echo "   cd ~/boundaryai && docker compose up --build -d"
echo ""
echo "4. Access dashboard:"
echo "   http://$EXTERNAL_IP:8501"
echo ""
echo "STOP when done to save costs:"
echo "   gcloud compute instances stop $INSTANCE_NAME --zone=$ZONE"
echo ""

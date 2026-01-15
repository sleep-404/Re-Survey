#!/bin/bash
# Deploy BoundaryAI to AWS EC2 GPU Instance
# Prerequisites: AWS CLI configured, Docker installed locally

set -e

# Configuration - EDIT THESE
INSTANCE_TYPE="g4dn.xlarge"  # $0.526/hour, 1x T4 GPU, 4 vCPU, 16GB RAM
AMI_ID="ami-0c7217cdde317cfec"  # Ubuntu 22.04 LTS (us-east-1) - change for your region
KEY_NAME="your-key-pair"  # Your EC2 key pair name
SECURITY_GROUP="boundaryai-sg"
INSTANCE_NAME="BoundaryAI-GPU"

echo "=============================================="
echo "BoundaryAI AWS Deployment"
echo "=============================================="
echo "Instance Type: $INSTANCE_TYPE (~\$0.53/hour)"
echo ""

# Check if security group exists, create if not
if ! aws ec2 describe-security-groups --group-names $SECURITY_GROUP 2>/dev/null; then
    echo "Creating security group..."
    SG_ID=$(aws ec2 create-security-group \
        --group-name $SECURITY_GROUP \
        --description "BoundaryAI - Streamlit access" \
        --query 'GroupId' --output text)

    # Allow SSH
    aws ec2 authorize-security-group-ingress \
        --group-id $SG_ID \
        --protocol tcp --port 22 --cidr 0.0.0.0/0

    # Allow Streamlit
    aws ec2 authorize-security-group-ingress \
        --group-id $SG_ID \
        --protocol tcp --port 8501 --cidr 0.0.0.0/0

    echo "Security group created: $SG_ID"
fi

# User data script to install Docker and NVIDIA drivers
USER_DATA=$(cat <<'EOF'
#!/bin/bash
set -e

# Update system
apt-get update
apt-get upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
usermod -aG docker ubuntu

# Install NVIDIA drivers and container toolkit
apt-get install -y nvidia-driver-535
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
curl -s -L https://nvidia.github.io/libnvidia-container/$distribution/libnvidia-container.list | \
    sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
    tee /etc/apt/sources.list.d/nvidia-container-toolkit.list
apt-get update
apt-get install -y nvidia-container-toolkit
nvidia-ctk runtime configure --runtime=docker
systemctl restart docker

# Create app directory
mkdir -p /home/ubuntu/boundaryai/data
chown -R ubuntu:ubuntu /home/ubuntu/boundaryai

echo "Setup complete! Reboot required for NVIDIA drivers."
reboot
EOF
)

echo "Launching EC2 instance..."
INSTANCE_ID=$(aws ec2 run-instances \
    --image-id $AMI_ID \
    --instance-type $INSTANCE_TYPE \
    --key-name $KEY_NAME \
    --security-groups $SECURITY_GROUP \
    --user-data "$USER_DATA" \
    --block-device-mappings '[{"DeviceName":"/dev/sda1","Ebs":{"VolumeSize":100,"VolumeType":"gp3"}}]' \
    --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=$INSTANCE_NAME}]" \
    --query 'Instances[0].InstanceId' --output text)

echo "Instance launched: $INSTANCE_ID"
echo "Waiting for instance to be running..."

aws ec2 wait instance-running --instance-ids $INSTANCE_ID

PUBLIC_IP=$(aws ec2 describe-instances \
    --instance-ids $INSTANCE_ID \
    --query 'Reservations[0].Instances[0].PublicIpAddress' --output text)

echo ""
echo "=============================================="
echo "DEPLOYMENT COMPLETE"
echo "=============================================="
echo "Instance ID: $INSTANCE_ID"
echo "Public IP: $PUBLIC_IP"
echo ""
echo "Wait 5-10 minutes for setup to complete, then:"
echo ""
echo "1. SSH into the instance:"
echo "   ssh -i ~/.ssh/$KEY_NAME.pem ubuntu@$PUBLIC_IP"
echo ""
echo "2. Upload your code and data:"
echo "   scp -i ~/.ssh/$KEY_NAME.pem -r ./* ubuntu@$PUBLIC_IP:~/boundaryai/"
echo ""
echo "3. Build and run Docker:"
echo "   cd ~/boundaryai && docker compose up --build -d"
echo ""
echo "4. Access the dashboard:"
echo "   http://$PUBLIC_IP:8501"
echo ""
echo "COST REMINDER: ~\$0.53/hour. Stop when done:"
echo "   aws ec2 stop-instances --instance-ids $INSTANCE_ID"
echo ""

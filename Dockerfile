# BoundaryAI - GPU-enabled Docker image for land parcel extraction
# Base: NVIDIA CUDA with Python for GPU-accelerated SAM

FROM nvidia/cuda:11.8-cudnn8-runtime-ubuntu22.04

# Prevent interactive prompts
ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1

# Install system dependencies
RUN apt-get update && apt-get install -y \
    python3.10 \
    python3-pip \
    python3.10-venv \
    gdal-bin \
    libgdal-dev \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    wget \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Set Python 3.10 as default
RUN update-alternatives --install /usr/bin/python python /usr/bin/python3.10 1
RUN update-alternatives --install /usr/bin/pip pip /usr/bin/pip3 1

# Set GDAL environment
ENV CPLUS_INCLUDE_PATH=/usr/include/gdal
ENV C_INCLUDE_PATH=/usr/include/gdal

# Create app directory
WORKDIR /app

# Install Python dependencies
COPY requirements-gpu.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements-gpu.txt

# Download SAM checkpoint (vit_b - smallest, good for demo)
RUN mkdir -p /app/checkpoints && \
    wget -q https://dl.fbaipublicfiles.com/segment_anything/sam_vit_b_01ec64.pth \
    -O /app/checkpoints/sam_vit_b_01ec64.pth

# Copy application code
COPY src/ /app/src/
COPY dashboard.py /app/
COPY validate_output.py /app/
COPY run_pipeline.py /app/

# Copy Streamlit config
COPY .streamlit/ /app/.streamlit/

# Create data directories
RUN mkdir -p /app/data/input /app/data/output /app/output

# Expose Streamlit port
EXPOSE 8501

# Environment variables for SAM checkpoint
ENV SAM_CHECKPOINT_PATH=/app/checkpoints/sam_vit_b_01ec64.pth
ENV SAM_MODEL_TYPE=vit_b

# Default command: run Streamlit dashboard
CMD ["streamlit", "run", "dashboard.py", "--server.address", "0.0.0.0", "--server.port", "8501"]

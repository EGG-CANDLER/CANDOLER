# CANDOLER backend — Flask API (Python 3.11-slim)
# Ready for Hugging Face Spaces or Render.
FROM python:3.11-slim

# System libs required by opencv-python (libgl) and Pillow.
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# CPU-only torch keeps the image small; requirements.txt then installs
# ultralytics on top without re-downloading a CUDA build.
RUN pip install --no-cache-dir torch torchvision \
    --index-url https://download.pytorch.org/whl/cpu

# Dependencies first for better layer caching.
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Application code + trained model (training/ is intentionally NOT deployed).
COPY app.py predict.py config.py stage_mapping.py ./
COPY models/ ./models/

EXPOSE 8000

# Render / HF Spaces provide $PORT.
CMD gunicorn --bind 0.0.0.0:${PORT:-8000} --workers 1 --threads 4 --timeout 180 app:app

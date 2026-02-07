#!/bin/bash

# SpoolMan Docker Container Rebuild Script
# Run this script from your SpoolMan root directory

set -e  # Exit on error

SPOOLMAN_DIR="."  # Current directory (where script is run from)
IMAGE_NAME="spoolman:custom"
CONTAINER_NAME="spoolman2"
DB_CONTAINER="Spoolman2-DB"

echo "=========================================="
echo "SpoolMan Container Rebuild Script"
echo "=========================================="
echo ""

# Verify we're in the right directory
if [ ! -f "Dockerfile" ]; then
  echo "❌ Error: Dockerfile not found in current directory"
  echo "   Please run this script from the SpoolMan root directory"
  exit 1
fi

echo "📁 Working directory: $(pwd)"
echo ""

# Build the client
echo ""
echo "🔨 Building client application..."
docker run --rm -v "$(pwd)/client:/app" -w /app node:20 bash -c "npm install && npm run build"
if [ $? -eq 0 ]; then
  echo "✅ Client build successful"
else
  echo "❌ Client build failed"
  exit 1
fi

# Build the Docker image
echo ""
echo "🐳 Building Docker image..."
docker build -t "$IMAGE_NAME" \
  --build-arg GIT_COMMIT=nfc-feature \
  --build-arg BUILD_DATE="$(date -u +'%Y-%m-%dT%H:%M:%SZ')" \
  .
if [ $? -eq 0 ]; then
  echo "✅ Docker image build successful"
else
  echo "❌ Docker image build failed"
  exit 1
fi

# Stop the old container
echo ""
echo "🛑 Stopping old container..."
docker stop "$CONTAINER_NAME" 2>/dev/null || echo "   (Container not running)"

# Remove the old container
echo "🗑️  Removing old container..."
docker rm "$CONTAINER_NAME" 2>/dev/null || echo "   (Container not found)"

# Start the new container
echo ""
echo "🚀 Starting new container..."
docker run -d \
  --name "$CONTAINER_NAME" \
  --hostname "$CONTAINER_NAME" \
  --restart unless-stopped \
  -p 7913:8000 \
  -e SPOOLMAN_DB_TYPE=postgres \
  -e SPOOLMAN_DB_HOST="${DB_CONTAINER}" \
  -e SPOOLMAN_DB_PORT=5432 \
  -e SPOOLMAN_DB_NAME=spoolman2 \
  -e SPOOLMAN_DB_USERNAME=spoolmanuser \
  -e SPOOLMAN_DB_PASSWORD=J@ckL0rdisSpoolman \
  -e PUID=1026 \
  -e PGID=100 \
  -e TZ=America/Chicago \
  -e FORWARDED_ALLOW_IPS="*" \
  -e SPOOLMAN_DEBUG_MODE=TRUE \
  -v /volume2/docker/spoolman2/data:/home/app/.local/share/spoolman \
  --link "${DB_CONTAINER}:${DB_CONTAINER}" \
  "$IMAGE_NAME"

if [ $? -eq 0 ]; then
  CONTAINER_ID=$(docker ps -q -f name="$CONTAINER_NAME")
  echo "✅ Container started successfully (ID: ${CONTAINER_ID:0:12})"
else
  echo "❌ Failed to start container"
  exit 1
fi

echo ""
echo "=========================================="
echo "✅ Rebuild complete!"
echo "=========================================="
echo ""
echo "SpoolMan is available at: http://localhost:7913"
echo ""
echo "To view logs:"
echo "  docker logs -f $CONTAINER_NAME"
echo ""
echo "To check container status:"
echo "  docker ps -f name=$CONTAINER_NAME"
echo ""

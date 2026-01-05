# Build script for Spoolman with client
# This script builds the client application first, then builds the Docker image

Write-Host "Building Spoolman Docker image with client..." -ForegroundColor Green

# Step 1: Build the client using a Node.js Docker container
Write-Host "`nStep 1: Building client application..." -ForegroundColor Yellow
docker run --rm -v "${PWD}/client:/app" -w /app node:20 bash -c "npm install && npm run build"

if ($LASTEXITCODE -ne 0) {
    Write-Host "Client build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "Client built successfully!" -ForegroundColor Green

# Step 2: Build the Docker image
Write-Host "`nStep 2: Building Docker image..." -ForegroundColor Yellow
docker build -t spoolman:nfc-feature .

if ($LASTEXITCODE -ne 0) {
    Write-Host "Docker build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "`nBuild completed successfully!" -ForegroundColor Green
Write-Host "You can now restart your container with: docker-compose restart" -ForegroundColor Cyan

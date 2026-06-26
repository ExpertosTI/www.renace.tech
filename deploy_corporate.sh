#!/bin/bash
# ==============================================================================
# RENACE.TECH - Automated Deployment Script
# ==============================================================================
# Usage: ./deploy.sh
# This script will safely deploy or update the renace.tech Docker stack.

set -e

REPO_URL="https://github.com/ExpertosTI/www.renace.tech.git"
PROJECT_DIR="/opt/www.renace.tech"

echo "========================================================"
echo "🚀 Starting RENACE.TECH Deployment..."
echo "========================================================"

# 1. Check if project directory exists
if [ -d "$PROJECT_DIR" ]; then
    echo "📁 Directory $PROJECT_DIR exists. Pulling latest changes..."
    cd "$PROJECT_DIR"
    git fetch origin main
    git reset --hard origin/main
    # Preserve local secrets: nunca tocar .env
else
    echo "📥 Directory does not exist. Cloning repository to $PROJECT_DIR..."
    git clone $REPO_URL $PROJECT_DIR
    cd $PROJECT_DIR
fi

# 2. Check for .env file
if [ ! -f "$PROJECT_DIR/.env" ]; then
    echo "⚠️  No .env file found. Creating from .env.example..."
    cp .env.example .env
    echo "❌ ACTION REQUIRED: Please edit $PROJECT_DIR/.env with your production secrets."
    echo "You can edit it via: nano $PROJECT_DIR/.env"
    echo "Then re-run this script: ./deploy.sh"
    exit 1
fi

# 2.5 Cleanup duplicates and temp files
echo "🧹 Cleaning up duplicate and temporary files..."
find . -name "* 2.html" -delete 2>/dev/null || true
find . -name "* 2.js" -delete 2>/dev/null || true
find . -name "* 2.css" -delete 2>/dev/null || true
find . -name "creds.json.bak" -delete 2>/dev/null || true
rm -rf www/ 2>/dev/null || true

# 2.6 Disk check (VPS was at ~91% — build needs free space)
DISK_USE=$(df / | awk 'NR==2 {print $5}' | tr -d '%')
if [ "$DISK_USE" -gt 88 ]; then
    echo "⚠️  Disco al ${DISK_USE}%. Liberando imágenes huérfanas antes del build..."
    docker image prune -f 2>/dev/null || true
fi

if [ ! -f docker-compose.yml ] || [ ! -f Dockerfile ]; then
    echo "❌ Faltan docker-compose.yml o Dockerfile. Asegúrate de tener el repo actualizado."
    exit 1
fi

# 3. Build ONLY the app image — NO stack deploy (preserva env vars en Swarm)
echo "🐳 Building renace-app image (solo servicio app)..."
docker compose -f docker-compose.yml build app

echo "🔄 Reiniciando solo renace_app para cargar la imagen nueva..."
docker service update --force renace_app

# 4. Clean up unused builder resources to save space
echo "🧹 Cleaning up unused Docker images..."
docker image prune -f

# 5. Verify deployment health
echo "⏳ Waiting for service to become healthy..."
RETRIES=0
MAX_RETRIES=30
while [ $RETRIES -lt $MAX_RETRIES ]; do
  HEALTH=$(docker inspect --format='{{.Status.Health.Status}}' $(docker ps -q -f name=renace_app) 2>/dev/null || echo "starting")
  if [ "$HEALTH" = "healthy" ]; then
    break
  fi
  RETRIES=$((RETRIES + 1))
  sleep 5
done

if [ "$HEALTH" = "healthy" ]; then
  echo "========================================================"
  echo "✅ Deployment successful! Service is healthy."
  echo "📡 Check logs with: docker service logs -f renace_app"
  echo "========================================================"
else
  echo "========================================================"
  echo "⚠️  Deployment completed but health check not confirmed after $((MAX_RETRIES * 5))s."
  echo "📡 Check logs with: docker service logs -f renace_app"
  echo "========================================================"
  exit 1
fi

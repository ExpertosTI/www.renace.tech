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

# 3. Build and deploy the stack
echo "🐳 Building Docker image locally..."
docker compose build

echo "🚀 Stopping old standalone containers if they exist..."
docker compose down 2>/dev/null || true

echo "🚀 Deploying stack to Docker Swarm with resolved environment..."
set -a
source .env
set +a
docker stack deploy -c docker-compose.yml renace

echo "📌 Recuerda: las variables sensibles (SMTP_*, ADMIN_EMAIL, etc.) vienen de .env."
echo "📌 Si Swarm hereda valores antiguos, usa: docker service update --env-add SMTP_PASSWORD=... --env-add SMTP_PORT=... renace_app --force"

# 3b. Propagar credenciales críticas al servicio (solo si existen en .env)
if [ -n "${SMTP_HOST:-}" ]; then
  echo "🔐 Actualizando variables SMTP/ADMIN en renace_app desde .env..."
  docker service update \
    --env-rm SMTP_HOST --env-add SMTP_HOST="$SMTP_HOST" \
    --env-rm SMTP_PORT --env-add SMTP_PORT="$SMTP_PORT" \
    --env-rm SMTP_USER --env-add SMTP_USER="$SMTP_USER" \
    --env-rm SMTP_PASSWORD --env-add SMTP_PASSWORD="$SMTP_PASSWORD" \
    --env-rm SMTP_FROM --env-add SMTP_FROM="$SMTP_FROM" \
    --env-rm ADMIN_EMAIL --env-add ADMIN_EMAIL="$ADMIN_EMAIL" \
    renace_app --force
fi

# For local Swarm without a registry, Swarm ignores the newly built 'latest' image
# if the tag hasn't changed. We MUST force the service to restart to pick up the new code.
echo "🔄 Forcing Swarm to restart the app and pick up the new local image..."
docker service update --force renace_app 2>/dev/null || true

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

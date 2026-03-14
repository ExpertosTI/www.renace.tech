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
    cd $PROJECT_DIR
    git reset --hard
    git clean -fd -e .env
    git pull origin main
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

echo "🚀 Deploying stack to Docker Swarm with resolved environment..."
docker compose config | docker stack deploy -c - renace

# 4. Clean up unused builder resources to save space
echo "🧹 Cleaning up unused Docker images..."
docker image prune -f

echo "========================================================"
echo "✅ Deployment successful!"
echo "📡 Check logs with: cd $PROJECT_DIR && docker compose logs -f"
echo "========================================================"

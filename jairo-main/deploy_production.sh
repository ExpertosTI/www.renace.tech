#!/bin/bash

# JairoApp Production Deployment Protocol (The Law)
# Usage: ./deploy_production.sh

set -e # Exit on first error

echo "🚀 [1/5] Starting Deployment Protocol..."
echo "📂 Updating code from Git..."
git pull

echo "🛑 [2/5] Cleaning up previous stack to avoid race conditions..."
docker stack rm jairo || true
echo "⏳ Waiting 20s for network cleanup..."
sleep 20

echo "🏗️ [3/5] Building API Image (No Cache)..."
docker build --no-cache -t ghcr.io/expertosti/jairo-api:latest -f apps/api/Dockerfile .

echo "🏗️ [4/5] Building Web Image (No Cache)..."
docker build --no-cache -t ghcr.io/expertosti/jairo-web:latest -f apps/web/Dockerfile .

echo "🚀 [5/5] Deploying Stack..."
if [ -f ".env" ]; then
    echo "🔑 Loading environment variables from .env..."
    set -a; source .env; set +a
fi
docker stack deploy -c docker-stack.yml jairo --with-registry-auth

echo "✅ Deployment Command Sent. Waiting for services to stabilize..."
sleep 10
docker service ls

echo "📜 Checking Logs (API)..."
echo "--- API LOGS ---"
docker service logs jairo_api --tail 20

echo "🎉 Deployment Protocol Complete."

#!/bin/bash
# ==============================================================================
# JARVIX (OpenClaw) - Automated Deployment Script
# ==============================================================================
# Protocol: RENACE.TECH (Local Build + Swarm Stack)

set -e

# Configuración del Repositorio
REPO_URL="https://github.com/ExpertosTI/www.renace.tech.git"
PROJECT_DIR="/opt/www.renace.tech"
STACK_NAME="jarvix"
SERVICE_NAME="jarvix_jarvix"

echo "========================================================"
echo "🚀 Iniciando despliegue de JARVIX (OpenClaw)..."
echo "========================================================"

# 1. Sincronizar Código vía Git
if [ -d "$PROJECT_DIR" ]; then
    echo "📁 Actualizando directorio existente en $PROJECT_DIR..."
    cd "$PROJECT_DIR"
    git fetch origin main
    git reset --hard origin/main
else
    echo "📥 Clonando repositorio en $PROJECT_DIR..."
    git clone $REPO_URL $PROJECT_DIR
    cd $PROJECT_DIR
fi

# Navegar a la subcarpeta del stack
cd openclaw-migration

# 2. Construir y Desplegar
echo "🐳 Construyendo imagen de Jarvix localmente..."
docker compose build --no-cache

echo "🚀 Desplegando stack '$STACK_NAME' en Docker Swarm (RenaceNet)..."
# Asegurar que la red existe
docker network ls | grep RenaceNet > /dev/null || docker network create --driver overlay RenaceNet

docker stack deploy -c docker-compose.yml $STACK_NAME

# 3. Forzar actualización del servicio
# Esto asegura que Swarm use la nueva imagen construida localmente
echo "🔄 Forzando reinicio del servicio para aplicar cambios..."
docker service update --force $SERVICE_NAME --detach=false

# 4. Limpieza
echo "🧹 Limpiando imágenes antiguas dDocker..."
docker image prune -f

echo "========================================================"
echo "✅ Despliegue completado con éxito!"
echo "📡 URL: https://renace.tech/jarvix"
echo "========================================================"

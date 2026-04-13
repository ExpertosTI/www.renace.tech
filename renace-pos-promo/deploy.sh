#!/bin/bash
set -e

# Configuración del proyecto
STACK_NAME="renace-crm-promo"
PROJECT_DIR="/opt/renace-crm-promo"
REPO_URL="https://github.com/ExpertosTI/www.renace.tech.git"

echo "🚀 Iniciando despliegue de $STACK_NAME..."

# 1. Sincronizar código
if [ -d "$PROJECT_DIR" ]; then
    echo "📂 Actualizando repositorio..."
    cd "$PROJECT_DIR"
    git fetch origin main
    git reset --hard origin/main
else
    echo "📂 Clonando repositorio..."
    git clone $REPO_URL $PROJECT_DIR
    cd $PROJECT_DIR
fi

# 2. Entrar a la carpeta del componente
cd renace-pos-promo

# 3. Construir imagen local
echo "🛠️ Construyendo imagen Docker..."
docker compose build

# 4. Asegurar que RenaceNet existe
docker network ls | grep RenaceNet > /dev/null || \
    docker network create --driver overlay RenaceNet

# 5. Desplegar stack
echo "🚢 Desplegando stack en Swarm..."
docker stack deploy -c docker-compose.yml $STACK_NAME

# 6. Forzar actualización para recoger la nueva imagen local
echo "🔄 Forzando actualización del servicio..."
docker service update --force ${STACK_NAME}_web

# 7. Limpieza
echo "🧹 Limpiando imágenes antiguas..."
docker image prune -f

echo "✅ ¡Despliegue completado! Verifica en: https://renace.tech/crm"

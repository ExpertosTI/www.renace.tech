#!/bin/bash
set -e

# JairoApp Production Deployment Protocol
# Arquitectura: Stack autocontenido con Postgres propio
# Seguridad: Carga robusta de variables desde .env

echo "🚀 [1/5] Iniciando Protocolo de Despliegue..."
git pull origin main

# Carga de variables de entorno de forma robusta para Docker Swarm
if [ -f ".env" ]; then
    echo "🔑 Cargando variables de entorno desde .env..."
    while IFS='=' read -r key value || [ -n "$key" ]; do
        if [[ ! $key =~ ^# && -n $key ]]; then
            # Eliminar comillas y espacios
            key=$(echo "$key" | xargs)
            value=$(echo "$value" | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")
            export "$key"="$value"
        fi
    done < .env
fi

echo "🛑 [2/5] Limpiando stack anterior..."
docker stack rm jairo || true
echo "⏳ Esperando 20s para limpieza de redes..."
sleep 20

echo "🏗️ [3/5] Construyendo imagen de la API..."
docker build --no-cache -t ghcr.io/expertosti/jairo-api:latest -f apps/api/Dockerfile .

echo "🏗️ [4/5] Construyendo imagen del Web..."
docker build --no-cache -t ghcr.io/expertosti/jairo-web:latest -f apps/web/Dockerfile .

echo "🚀 [5/5] Desplegando Stack..."
docker stack deploy -c docker-stack.yml jairo --with-registry-auth

echo "✅ Stack desplegado. Esperando estabilización..."
sleep 15
docker service ls | grep jairo

echo "📜 Logs de la API..."
docker service logs jairo_api --tail 30

echo "🎉 ¡Despliegue Completo!"

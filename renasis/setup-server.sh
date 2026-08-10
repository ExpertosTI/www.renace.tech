#!/bin/bash
# ==============================================================================
# SCRIPT DE INSTALACIÓN DE SERVIDORES DE CONTROL REMOTO RENASIS
# Dominio: remote.renace.tech
# ==============================================================================

set -e

echo "🚀 Iniciando despliegue de RENASIS Server en remote.renace.tech..."

# 1. Crear directorio de trabajo
INSTALL_DIR="/opt/renasis"
mkdir -p "$INSTALL_DIR"
cd "$INSTALL_DIR"

# 2. Crear docker-compose.yml
cat << 'EOF' > docker-compose.yml
services:
  hbbs:
    container_name: renasis-hbbs
    image: rustdesk/rustdesk-server:latest
    command: hbbs -r remote.renace.tech:21117 -k _
    volumes:
      - ./data:/root
    network_mode: "host"
    depends_on:
      - hbbr
    restart: unless-stopped

  hbbr:
    container_name: renasis-hbbr
    image: rustdesk/rustdesk-server:latest
    command: hbbr -k _
    volumes:
      - ./data:/root
    network_mode: "host"
    restart: unless-stopped

  renasis-api:
    container_name: renasis-api-server
    image: ghcr.io/kingmo888/rustdesk-api-server:latest
    restart: unless-stopped
    ports:
      - "21114:21114"
    environment:
      - CSRF_TRUSTED_ORIGINS=http://remote.renace.tech:21114,https://remote.renace.tech
      - ID_SERVER=remote.renace.tech
    volumes:
      - ./api_data:/rustdesk-api-server/db
      - /etc/timezone:/etc/timezone:ro
      - /etc/localtime:/etc/localtime:ro
EOF

echo "📦 Levantando contenedores Docker para RENASIS..."
docker compose up -d

echo "⏳ Esperando 5 segundos a que el servidor hbbs genere las claves de cifrado..."
sleep 5

KEY_FILE="$INSTALL_DIR/data/id_ed25519.pub"

echo ""
echo "=========================================================================="
echo "      🎉 ¡DESPLIEGUE DE RENASIS COMPLETADO EXITOSAMENTE! 🎉"
echo "=========================================================================="
echo ""
if [ -f "$KEY_FILE" ]; then
    PUBLIC_KEY=$(cat "$KEY_FILE")
    echo "🔑 TU CLAVE PÚBLICA DE CIFRADO (KEY):"
    echo "--------------------------------------------------------------------------"
    echo "$PUBLIC_KEY"
    echo "--------------------------------------------------------------------------"
else
    echo "⚠️ La clave pública aún se está generando. Puedes verla ejecutando:"
    echo "cat /opt/renasis/data/id_ed25519.pub"
fi

echo ""
echo "🌐 DATOS DE CONEXIÓN PARA CONFIGURAR LOS CLIENTES RENASIS:"
echo "   - ID Server:     remote.renace.tech:21116"
echo "   - Relay Server:  remote.renace.tech:21117"
echo "   - API Server:    http://remote.renace.tech:21114"
echo "   - Key Pública:   (La clave mostrada arriba)"
echo ""
echo "🖥️ CONSOLA WEB Y LIBRETA DE DIRECCIONES:"
echo "   Accede vía navegador a: http://remote.renace.tech:21114"
echo "=========================================================================="

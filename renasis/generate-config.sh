#!/bin/bash
# ==============================================================================
# SCRIPT DE GENERACIÓN DE INSTALADOR CLIENTE "RENASIS REMOTE"
# ==============================================================================

if [ -z "$1" ]; then
    echo "Uso: ./generate-config.sh <TU_CLAVE_PUBLICA_KEY>"
    echo "Ejemplo: ./generate-config.sh 4A8x9Z...="
    exit 1
fi

KEY="$1"
HOST="remote.renace.tech"
API_URL="http://remote.renace.tech:21114"

FILENAME="RENASIS-Remote-host-${HOST}-key=${KEY}.exe"

echo "=========================================================================="
echo "🎯 NOMBRE DEL EJECUTABLE PRE-CONFIGURADO PARA CLIENTES WINDOWS:"
echo "=========================================================================="
echo "$FILENAME"
echo "=========================================================================="
echo ""
echo "💡 CÓMO FUNCIONA:"
echo " Al descargar e iniciar este archivo (.exe), RENASIS detecta automáticamente:"
echo "  1. Servidor de ID / Relay: $HOST"
echo "  2. Clave de Cifrado: $KEY"
echo "  3. El cliente NO tiene que escribir ninguna IP ni configuración manual."
echo "=========================================================================="

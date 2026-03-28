# Dockerfile para Jarvix (OpenClaw) - Estándar del Proyecto
FROM node:20-alpine
WORKDIR /app

# Añadir compatibilidad para binarios compilados en Alpine
RUN apk add --no-cache libc6-compat tzdata

RUN npm install openclaw

# Exponer el puerto del gateway
EXPOSE 18789

# Copiar el branding a la ruta estándar de node_modules
# Nota: La ruta es fija al instalar localmente en /app
COPY branding/favicon.svg ./node_modules/openclaw/dist/control-ui/favicon.svg
COPY branding/favicon-32.png ./node_modules/openclaw/dist/control-ui/favicon-32.png
COPY branding/apple-touch-icon.png ./node_modules/openclaw/dist/control-ui/apple-touch-icon.png

# Desactivar el entrypoint de node para que no interfiera con el binario
ENTRYPOINT []

# Ejecutar el binario directamente usando el shell
CMD openclaw gateway --port 18789

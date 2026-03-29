# Dockerfile para Jarvix (OpenClaw) - Estándar del Proyecto
FROM node:22-alpine
WORKDIR /app

# Compatibilidad Alpine
RUN apk add --no-cache libc6-compat tzdata git

# Copiar y extraer el paquete real de OpenClaw (v2026.3.x)
COPY openclaw-real.tar.gz ./
RUN tar -xzf openclaw-real.tar.gz && rm openclaw-real.tar.gz

# Instalar dependencias de OpenClaw
RUN npm install --production --ignore-scripts

# Aplicar branding de renace.tech
COPY branding/favicon.svg ./dist/control-ui/favicon.svg
COPY branding/favicon-32.png ./dist/control-ui/favicon-32.png
COPY branding/apple-touch-icon.png ./dist/control-ui/apple-touch-icon.png

# Exponer el puerto del gateway
EXPOSE 18789

# Ejecutar con el entry point correcto del paquete real
CMD ["node", "openclaw.mjs", "gateway", "--port", "18789"]

# Dockerfile para Jarvix (OpenClaw) - Estándar del Proyecto
FROM node:20-alpine
WORKDIR /app

# Instalar dependencias locales (más estable en contenedores)
RUN npm install openclaw

# Exponer el puerto del gateway
EXPOSE 18789

# Copiar el branding a la ruta estándar de node_modules
# Nota: La ruta es fija al instalar localmente en /app
COPY branding/favicon.svg ./node_modules/openclaw/dist/control-ui/favicon.svg
COPY branding/favicon-32.png ./node_modules/openclaw/dist/control-ui/favicon-32.png
COPY branding/apple-touch-icon.png ./node_modules/openclaw/dist/control-ui/apple-touch-icon.png

# Añadir los binarios de node_modules al PATH
ENV PATH /app/node_modules/.bin:$PATH

# Comando simplificado
CMD ["openclaw", "gateway", "--port", "18789"]

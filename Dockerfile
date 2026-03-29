# ── Build stage ──
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# Copy only what the production server needs
COPY server.js ./
COPY www/ ./www/
COPY css/ ./css/
COPY js/ ./js/
COPY images/ ./images/
COPY form/ ./form/
COPY data/ ./data/
COPY migrations/ ./migrations/
COPY odoo-modules/ ./odoo-modules/
COPY *.html ./

# ── Production stage ──
FROM node:20-alpine AS runner
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 appuser

COPY --from=builder --chown=appuser:nodejs /app .

USER appuser
EXPOSE 3000
ENV NODE_ENV=production
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:3000/api/health/live || exit 1
CMD ["node", "server.js"]

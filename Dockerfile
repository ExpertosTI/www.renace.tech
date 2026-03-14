# ── Build stage ──
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .

# ── Production stage ──
FROM node:20-alpine AS runner
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 appuser
COPY --from=builder --chown=appuser:nodejs /app .
USER appuser
EXPOSE 3000
ENV NODE_ENV=production
CMD ["node", "server.js"]

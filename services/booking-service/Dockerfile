# =============================================================================
# AeroLink Booking Service — Multi-Stage Dockerfile (Enhancement #5)
# =============================================================================

# ---- Stage 1: Builder ----
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install
COPY . .

# ---- Stage 2: Production ----
FROM node:22-alpine AS production

ENV NODE_ENV=production
ENV PORT=3003

WORKDIR /app

# Create non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY package*.json ./
RUN npm install --only=production && npm cache clean --force

COPY --from=builder /app/src ./src

USER appuser

EXPOSE 3003

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "const http = require('http'); http.get('http://localhost:3003/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); }).on('error', () => process.exit(1));"

CMD ["node", "src/app.js"]

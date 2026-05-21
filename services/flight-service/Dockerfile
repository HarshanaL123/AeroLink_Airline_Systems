# =============================================================================
# AeroLink Flight Service — Multi-Stage Dockerfile (Enhancement #5)
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
ENV PORT=3002

WORKDIR /app

# Create non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy dependency files first (Docker layer caching optimization)
COPY package*.json ./

# Install ALL dependencies (including devDependencies for build)
RUN npm install && npm cache clean --force

COPY --from=builder /app/src ./src

USER appuser

EXPOSE 3002

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "const http = require('http'); http.get('http://localhost:3002/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); }).on('error', () => process.exit(1));"

CMD ["node", "src/app.js"]

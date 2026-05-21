# =============================================================================
# AeroLink Auth Service — Multi-Stage Dockerfile (Enhancement #5)
# =============================================================================
# Stage 1: Builder — installs all dependencies and prepares the app
# Stage 2: Production — copies only what's needed for a lean, secure image
# =============================================================================

# ---- Stage 1: Builder ----
FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependency files first (Docker layer caching optimization)
COPY package*.json ./

# Install ALL dependencies (including devDependencies for build)
RUN npm install

# Copy source code
COPY . .

# ---- Stage 2: Production ----
FROM node:22-alpine AS production

# Set environment
ENV NODE_ENV=production
ENV PORT=3001

WORKDIR /app

# Create non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy dependency files
COPY package*.json ./

# Install ONLY production dependencies (no devDependencies)
RUN npm install --only=production && npm cache clean --force

# Copy application code from builder stage
COPY --from=builder /app/src ./src

# Switch to non-root user
USER appuser

# Expose service port
EXPOSE 3001

# Health check (Enhancement #2)
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "const http = require('http'); http.get('http://localhost:3001/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); }).on('error', () => process.exit(1));"

# Start the service
CMD ["node", "src/app.js"]

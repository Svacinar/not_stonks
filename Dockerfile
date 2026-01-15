# =============================================================================
# Stage 1: Build
# =============================================================================
FROM node:20-alpine AS builder

# Install build dependencies for better-sqlite3 (native module)
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files for dependency installation
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/
COPY shared/package*.json ./shared/

# Install all dependencies (including devDependencies for building)
RUN npm ci

# Copy source code
COPY backend/ ./backend/
COPY frontend/ ./frontend/
COPY shared/ ./shared/

# Build the application (shared -> backend -> frontend)
RUN npm run build

# =============================================================================
# Stage 2: Production
# =============================================================================
FROM node:20-alpine

# Install build dependencies for better-sqlite3 native module compilation
# These are needed because npm ci will rebuild native modules
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files for production dependency installation
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY shared/package*.json ./shared/

# Install only production dependencies for backend and shared
RUN npm ci --omit=dev -w backend -w shared && \
    # Clean up build tools after native module compilation
    apk del python3 make g++ && \
    rm -rf /root/.npm /tmp/*

# Copy built artifacts from builder stage
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/frontend/dist ./frontend/dist
COPY --from=builder /app/shared/*.js ./shared/
COPY --from=builder /app/shared/*.d.ts ./shared/

# Create data directory for SQLite database
RUN mkdir -p /app/data

# Set environment variables
ENV NODE_ENV=production
ENV DB_PATH=/app/data/spending.db
ENV PORT=3001

# Expose the application port
EXPOSE 3001

# Run as non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

# Start the application
CMD ["node", "backend/dist/index.js"]

# Multi-stage Dockerfile for the entire application
FROM node:18-alpine as base

# Install system dependencies
RUN apk add --no-cache python3 make g++

# Set working directory
WORKDIR /app

# Copy root package files for shared dependencies
COPY package*.json ./

# Frontend build stage
FROM base as frontend-build

# Set working directory for frontend
WORKDIR /app/frontend

# Copy frontend package files
COPY frontend/package*.json ./

# Install frontend dependencies with optimizations
RUN npm ci --only=production --silent --no-audit --no-fund

# Copy frontend source code
COPY frontend/ .

# Set environment variables for React build
ENV GENERATE_SOURCEMAP=false
ENV CI=false
ENV SKIP_PREFLIGHT_CHECK=true

# Build the frontend application
RUN npm run build

# Backend build stage
FROM base as backend-build

# Set working directory for backend
WORKDIR /app/backend

# Copy backend package files
COPY backend/package*.json ./

# Install backend dependencies
RUN npm ci --only=production --silent --no-audit --no-fund

# Copy backend source code
COPY backend/ .

# Build TypeScript
RUN npm run build

# Production stage for frontend
FROM nginx:alpine as frontend-prod

# Copy built files from frontend build stage
COPY --from=frontend-build /app/frontend/build /usr/share/nginx/html

# Copy nginx configuration
COPY frontend/nginx.conf /etc/nginx/nginx.conf

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]

# Production stage for backend
FROM node:18-alpine as backend-prod

# Install system dependencies
RUN apk add --no-cache python3 make g++

# Set working directory
WORKDIR /app

# Copy backend package files
COPY backend/package*.json ./

# Install only production dependencies
RUN npm ci --only=production --silent --no-audit --no-fund

# Copy built backend from build stage
COPY --from=backend-build /app/backend/dist ./dist

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership of the app directory
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
CMD ["node", "dist/index.js"]

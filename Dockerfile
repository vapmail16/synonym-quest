# Frontend Dockerfile
FROM node:18-alpine as build

# Set working directory
WORKDIR /app

# Copy package files from frontend directory
COPY frontend/package*.json ./

# Show package.json for debugging
RUN cat package.json

# Install dependencies (including dev dependencies for build)
RUN npm ci --verbose

# Copy frontend source code
COPY frontend/ .

# Show directory structure for debugging
RUN ls -la

# Build the application
RUN npm run build

# Clean up dev dependencies to reduce image size
RUN npm prune --production

# Production stage
FROM nginx:alpine

# Copy built files from build stage
COPY --from=build /app/build /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]

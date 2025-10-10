# Frontend Dockerfile
FROM node:16-alpine as build

# Set working directory
WORKDIR /app

# Copy only package.json first
COPY frontend/package.json ./

# Show package.json for debugging
RUN cat package.json

# Show npm version for debugging
RUN npm --version

# Clear npm cache and install dependencies with error handling
RUN npm cache clean --force || true
RUN npm install --verbose --no-optional --legacy-peer-deps

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

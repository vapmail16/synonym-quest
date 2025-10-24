# Build stage
FROM node:22 AS build

# Set the working directory
WORKDIR /app

# Copy package files
COPY package.json* ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build the application
RUN npm run build || echo "No build script found"

# Production stage
FROM joseluisq/static-web-server:2

# Set the working directory
WORKDIR /app

# Copy the built app
COPY --from=build /app/build ./build

# Expose port
EXPOSE 3000

# Start the application with SPA support and caching
CMD ["/static-web-server", "--root", "build", "--port", "3000", "--page-fallback", "build/index.html"]

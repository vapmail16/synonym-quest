#!/bin/bash

# Build script for Synonym Quest deployment
set -e

echo "🚀 Starting Synonym Quest deployment build..."

# Clean up any existing containers and images
echo "🧹 Cleaning up existing containers and images..."
docker-compose down --remove-orphans || true
docker system prune -f || true

# Build with optimized settings
echo "🔨 Building application with Docker Compose..."
docker-compose build --no-cache --parallel

# Start the services
echo "▶️  Starting services..."
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check service health
echo "🏥 Checking service health..."
docker-compose ps

# Show logs for debugging
echo "📋 Recent logs:"
docker-compose logs --tail=50

echo "✅ Deployment complete!"
echo "🌐 Frontend: http://localhost:3000"
echo "🔧 Backend API: http://localhost:3001"
echo "🗄️  Database: localhost:5432"

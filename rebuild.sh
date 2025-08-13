#!/bin/bash

echo "🔄 Rebuilding and restarting wweb-service..."

# Stop and remove existing container
echo "⏹️  Stopping existing container..."
docker-compose down

# Remove existing images to force rebuild
echo "🗑️  Removing existing images..."
docker-compose down --rmi all

# Build and start the service
echo "🔨 Building new image..."
docker-compose build --no-cache

echo "🚀 Starting service..."
docker-compose up -d

echo "📊 Checking service status..."
docker-compose ps

echo "📋 Service logs:"
docker-compose logs -f wweb-service

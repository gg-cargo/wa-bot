#!/bin/bash

echo "🧹 Cleaning up everything and rebuilding..."

# Stop all containers
echo "⏹️  Stopping all containers..."
docker-compose down

# Remove all containers, images, and volumes
echo "🗑️  Removing containers, images, and volumes..."
docker-compose down -v --rmi all --remove-orphans

# Clean up any dangling images
echo "🧽 Cleaning up dangling images..."
docker image prune -f

# Clean up any dangling volumes
echo "🧽 Cleaning up dangling volumes..."
docker volume prune -f

# Build and start fresh
echo "🔨 Building fresh image..."
docker-compose build --no-cache

echo "🚀 Starting service..."
docker-compose up -d

echo "📊 Checking service status..."
docker-compose ps

echo "📋 Service logs:"
docker-compose logs -f wweb-service

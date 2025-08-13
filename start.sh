#!/bin/bash

# Script startup untuk container wweb
set -e

echo "🚀 Starting wweb service..."

# Set environment variables
export NODE_ENV=${NODE_ENV:-production}
export PORT=${PORT:-3001}
export PUPPETEER_EXECUTABLE_PATH=${PUPPETEER_EXECUTABLE_PATH:-/usr/bin/chromium}
export CHROME_BIN=${CHROME_BIN:-/usr/bin/chromium}
export CHROME_PATH=${CHROME_PATH:-/usr/bin/chromium}

# Ensure directories exist (they should already be created in Dockerfile)
echo " Checking necessary directories..."
if [ ! -d ".wwebjs_auth" ] || [ ! -d ".wwebjs_cache" ] || [ ! -d ".wwebjs_auth/session" ]; then
    echo "⚠️  Directories not found, creating them..."
    mkdir -p .wwebjs_auth .wwebjs_cache .wwebjs_auth/session
fi

# Check if Chromium is available
if [ ! -f "$PUPPETEER_EXECUTABLE_PATH" ]; then
    echo "❌ Error: Chromium not found at $PUPPETEER_EXECUTABLE_PATH"
    echo "Available browsers:"
    ls -la /usr/bin/chromium* 2>/dev/null || echo "No chromium found in /usr/bin/"
    exit 1
fi

echo "✅ Chromium found at: $PUPPETEER_EXECUTABLE_PATH"
echo "✅ Node.js version: $(node --version)"
echo "✅ NPM version: $(npm --version)"
echo "✅ Environment: $NODE_ENV"
echo "✅ Port: $PORT"

# Wait for dependencies if needed
if [ "$WAIT_FOR_DEPENDENCIES" = "true" ]; then
    echo "⏳ Waiting for dependencies..."
    sleep 10
fi

# Start the application
echo "🚀 Starting Node.js application..."
exec node server.js
#!/bin/bash

# Configuration
SERVICE_NAME="expo-mobile"

echo "🛒 Managing $SERVICE_NAME..."

# 1. Stop existing containers
echo "Stopping $SERVICE_NAME..."
docker compose stop $SERVICE_NAME

# 2. Check for the "clear" flag
if [[ "$1" == "--clear" ]]; then
    echo "Removing docker $SERVICE_NAME"
    docker compose rm -f $SERVICE_NAME
    echo "🧹 Clearing cache and pulling latest..."
    
    echo "Removing folders: mobile/node_modules mobile/package-lock.json mobile/.expo"
    rm -rf mobile/node_modules mobile/package-lock.json mobile/.expo
    echo "Setting user permissions:"
    chown -R 4096:4096 mobile
    # Start with build to ensure latest dev changes are baked in
    docker compose up -d --force-recreate $SERVICE_NAME
else
    # Standard start
    echo "🚀 Starting $SERVICE_NAME..."
    docker compose up -d $SERVICE_NAME
fi

# 3. Tail the logs
echo "📋 Tailing logs (Ctrl+C to stop viewing, container will keep running)..."
docker compose logs -f $SERVICE_NAME

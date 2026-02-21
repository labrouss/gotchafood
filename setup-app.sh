#!/bin/bash

# Project: Modern Food Ordering System
# Description: Automated setup script for development environment (Local or Docker)

set -e # Exit on error

echo "🍕 Starting Food Ordering App Setup..."
echo "======================================"

# Function to setup .env files
setup_env() {
    echo "📂 Setting up environment files..."
    if [ ! -f "backend/.env" ]; then
        cp backend/.env.example backend/.env && echo "✅ Created backend/.env" || echo "⚠️  Could not create backend/.env"
    fi
    if [ ! -f "frontend/.env" ]; then
        cp frontend/.env.example frontend/.env && echo "✅ Created frontend/.env" || echo "⚠️  Could not create frontend/.env"
    fi
}

echo "How would you like to install the application?"
echo "1) 💻 Local Installation (requires Node.js & MySQL/MariaDB installed)"
echo "2) 🐳 Docker Installation (requires Docker & Docker Compose)"
read -p "Select an option (1-2): " choice

case $choice in
    1)
        echo "🚀 Starting Local Installation..."
        setup_env

        echo "📦 Installing Dependencies..."
        (cd backend && npm install)
        (cd frontend && npm install)

        echo "🗄️  Setting up Database (Prisma)..."
        cd backend
        npx prisma generate
        npx prisma migrate dev --name init || echo "⚠️  Migration failed. Ensure your database is running."
        npm run prisma:seed || echo "⚠️  Seeding failed."
        cd ..

        echo "======================================"
        echo "🎉 Local Setup Complete!"
        echo "Start with: 'cd backend && npm run dev' and 'cd frontend && npm run dev'"
        ;;

    2)
        echo "🚀 Starting Docker Installation..."
        setup_env

        if [ ! -f "docker-compose.yml" ]; then
            echo "❌ docker-compose.yml not found!"
            exit 1
        fi

        echo "📦 Starting containers..."
        docker-compose up -d

        echo "⏳ Waiting for services to initialize (approx 30s)..."
        sleep 30

        echo "🗄️  Initializing database inside container..."
        docker exec food-ordering-backend npx prisma generate
        docker exec food-ordering-backend npx prisma migrate deploy || echo "⚠️  Migration failed."
        docker exec food-ordering-backend npm run prisma:seed || echo "⚠️  Seeding failed."

        echo "======================================"
        echo "🎉 Docker Setup Complete!"
        echo "App is running at: http://localhost:5173"
        ;;

    *)
        echo "❌ Invalid option selected."
        exit 1
        ;;
esac

echo "======================================"
echo "Admin Login: admin@foodapp.com / admin123"
echo "======================================"

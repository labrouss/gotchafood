# Project: Modern Food Ordering System
# Description: Automated setup script for development environment (Local or Docker - PowerShell)

Write-Host "🍕 Starting Food Ordering App Setup..." -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green

function Setup-Env {
    Write-Host "📂 Setting up environment files..." -ForegroundColor Cyan
    if (-not (Test-Path "backend/.env")) {
        Copy-Item backend/.env.example backend/.env
        Write-Host "✅ Created backend/.env" -ForegroundColor Green
    }
    if (-not (Test-Path "frontend/.env")) {
        Copy-Item frontend/.env.example frontend/.env
        Write-Host "✅ Created frontend/.env" -ForegroundColor Green
    }
}

Write-Host "How would you like to install the application?"
Write-Host "1) 💻 Local Installation (requires Node.js & MySQL/MariaDB installed)"
Write-Host "2) 🐳 Docker Installation (requires Docker & Docker Desktop)"
$choice = Read-Host "Select an option (1-2)"

switch ($choice) {
    "1" {
        Write-Host "� Starting Local Installation..." -ForegroundColor Green
        Setup-Env

        Write-Host "� Installing Dependencies..." -ForegroundColor Cyan
        Set-Location backend
        npm install
        Set-Location ..

        Set-Location frontend
        npm install
        Set-Location ..

        Write-Host "🗄️ Setting up Database (Prisma)..." -ForegroundColor Cyan
        Set-Location backend
        npx prisma generate
        try { npx prisma migrate dev --name init } catch { Write-Host "⚠️ Migration failed. Ensure DB is running." -ForegroundColor Yellow }
        try { npm run prisma:seed } catch { Write-Host "⚠️ Seeding failed." -ForegroundColor Yellow }
        Set-Location ..

        Write-Host "======================================" -ForegroundColor Green
        Write-Host "🎉 Local Setup Complete!" -ForegroundColor Green
        Write-Host "Start with: 'npm run dev' in both backend and frontend folders."
    }

    "2" {
        Write-Host "🚀 Starting Docker Installation..." -ForegroundColor Green
        Setup-Env

        if (-not (Test-Path "docker-compose.yml")) {
            Write-Host "❌ docker-compose.yml not found!" -ForegroundColor Red
            exit 1
        }

        Write-Host "📦 Starting containers..." -ForegroundColor Cyan
        docker-compose up -d

        Write-Host "⏳ Waiting for services to initialize (approx 30s)..." -ForegroundColor Cyan
        Start-Sleep -Seconds 30

        Write-Host "�️ Initializing database inside container..." -ForegroundColor Cyan
        docker exec food-ordering-backend npx prisma generate
        try { docker exec food-ordering-backend npx prisma migrate deploy } catch { Write-Host "⚠️ Migration failed." -ForegroundColor Yellow }
        try { docker exec food-ordering-backend npm run prisma:seed } catch { Write-Host "⚠️ Seeding failed." -ForegroundColor Yellow }

        Write-Host "======================================" -ForegroundColor Green
        Write-Host "🎉 Docker Setup Complete!" -ForegroundColor Green
        Write-Host "App is running at: http://localhost:5173"
    }

    Default {
        Write-Host "❌ Invalid option selected." -ForegroundColor Red
        exit 1
    }
}

Write-Host "======================================" -ForegroundColor White
Write-Host "Admin Login: admin@foodapp.com / admin123" -ForegroundColor White
Write-Host "======================================" -ForegroundColor White

# 🚀 Quick Start Guide - Food Ordering App

## ✅ What's Included Now

- ✅ **Backend**: Complete Node.js + Express + TypeScript API
- ✅ **Frontend**: React + TypeScript + Tailwind CSS app
- ✅ **Database**: MySQL with Prisma ORM
- ✅ **Docker**: One-command setup
- ✅ **Authentication**: JWT-based login/register
- ✅ **Menu System**: Browse Greek food menu
- ✅ **Seed Data**: Sample menu items ready to use

---

## 🏃 Start in 3 Steps

### Step 1: Extract and Navigate
```bash
tar -xzf food-ordering-app-complete.tar.gz
cd food-ordering-app
```

### Step 2: Start with Docker
```bash
# Start all services (this will take 3-4 minutes on first run)
docker-compose up -d

# Watch the logs to see progress
docker-compose logs -f backend

# Wait until you see:
# "Server is running on port 3000"
# Then press Ctrl+C to stop watching logs
```

### Step 3: Setup Database
```bash
# Create database tables
docker exec food-ordering-backend npx prisma migrate dev --name init

# Fill database with sample Greek food menu
docker exec food-ordering-backend npm run prisma:seed
```

**Note**: If you see OpenSSL or Prisma errors, run:
```bash
docker-compose down
docker-compose up -d
# Wait 2 minutes, then try the prisma commands again
```

---

## 🎉 You're Done!

Access your application:

- **Frontend Website**: http://localhost:5173
- **Backend API**: http://localhost:3000
- **API Docs (Swagger)**: http://localhost:3000/api-docs
- **phpMyAdmin**: http://localhost:8080

---

## 🔐 Test Login

Use these credentials on the website:

**Admin Account:**
- Email: `admin@foodapp.com`
- Password: `admin123`

**Customer Account:**
- Email: `customer@example.com`
- Password: `customer123`

---

## 🛑 Troubleshooting

### "npm install" taking too long?
This is normal on first run. It's downloading all dependencies.
Watch progress: `docker-compose logs -f backend`

### Port already in use?
```bash
# Check what's using the ports
lsof -i :3000  # Backend
lsof -i :5173  # Frontend
lsof -i :3306  # Database

# Stop the conflicting service or change ports in docker-compose.yml
```

### Database connection failed?
```bash
# Check if database is ready
docker exec food-ordering-db mysqladmin ping -h localhost -u foodapp -pfoodapp123

# View database logs
docker logs food-ordering-db

# Restart everything
docker-compose down
docker-compose up -d
```

### Frontend not loading?
```bash
# Check frontend logs
docker logs food-ordering-frontend -f

# Rebuild if needed
docker-compose restart frontend
```

### "Prisma migrate" error?
```bash
# Make sure database is fully started first
docker exec food-ordering-db mysqladmin ping -h localhost -u foodapp -pfoodapp123

# If it responds "mysqld is alive", then run:
docker exec food-ordering-backend npx prisma migrate dev --name init
```

### Start fresh?
```bash
# Stop and remove everything
docker-compose down -v

# Start again
docker-compose up -d
```

---

## 📱 Features Available Now

✅ User registration and login  
✅ Browse menu with categories  
✅ Filter items by category  
✅ View popular items  
✅ Responsive design (works on mobile)  
✅ Greek language support  
✅ Beautiful modern UI

---

## 🔧 Development Without Docker

If you prefer not to use Docker:

### Prerequisites
- Node.js 20+
- MySQL 8.0 or MariaDB 10.6+

### Backend
```bash
cd backend
npm install

# Create database manually in MySQL
# Then edit .env with your credentials
cp .env.example .env
nano .env  # Edit DATABASE_URL

npx prisma migrate dev
npm run prisma:seed
npm run dev
```

### Frontend
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

---

## 📚 Next Steps

1. **Explore the menu** at http://localhost:5173/menu
2. **Login** with demo credentials  
3. **Register** a new account
4. **Check API docs** at http://localhost:3000/api-docs
5. **View database** with phpMyAdmin at http://localhost:8080
   - Server: database
   - Username: foodapp
   - Password: foodapp123

---

## 💡 What to Build Next

The foundation is complete! Now add:

1. **Shopping Cart** - Add/remove items, save to localStorage
2. **Checkout Process** - Order form with address selection
3. **Order Tracking** - Real-time order status updates
4. **Payment Integration** - Stripe or PayPal
5. **Admin Dashboard** - Manage orders, menu items, users
6. **Email Notifications** - Order confirmations
7. **Reviews & Ratings** - Customer feedback system

See `IMPLEMENTATION_GUIDE.md` for detailed implementation instructions!

---

## 🆘 Common Issues

**Issue**: Can't access http://localhost:5173
**Solution**: Frontend might still be installing packages. Wait 2-3 minutes on first run.

**Issue**: API returns CORS error
**Solution**: Make sure backend is running on port 3000 and frontend on 5173.

**Issue**: Database connection refused
**Solution**: Wait for MySQL to fully start (30-60 seconds on first run).

**Issue**: Prisma errors
**Solution**: Run `docker exec food-ordering-backend npx prisma generate` first.

---

## 📊 View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker logs food-ordering-backend -f
docker logs food-ordering-frontend -f
docker logs food-ordering-db -f

# Stop watching logs: Ctrl+C
```

---

**Enjoy your food ordering app! 🍕🚀**

Made with ❤️ using Node.js, React, TypeScript, and MySQL

# 🍕 Modern Food Ordering & Management System

A comprehensive, production-ready full-stack application designed for restaurants, cafes, and delivery services. Built with **Node.js**, **React**, **TypeScript**, and **MySQL/MariaDB**, it features a multi-role ecosystem for customers, staff, and administrators.

---

## 🎨 Role-Based Features

### 👔 Waiter & Staff
- **Waiter Dashboard:** Manage active table sessions, view pending reservations, and track daily shift stats.
- **Walk-in Sessions:** Start quick sessions for walk-in customers on available tables.
- **Order Taking:** Handheld-friendly interface for creating and adding items to table orders.
- **Table Management:** Real-time visibility into table occupancy and location (Main, Terrace, etc.).
- **Shift Management:** Clock-in/out functionality with shift history tracking.

### 🍳 Kitchen & Operations
- **Kitchen Display System (KDS):** Real-time display of pending orders categorized by station (Kitchen, Bar, etc.) with automated item completion.
- **Counter POS:** Optimized interface for over-the-counter orders with integrated loyalty scanning.
- **Delivery Dashboard:** Specialized view for managing "Out for Delivery" and "Delivered" statuses for online orders.

### 📈 Admin & Insights
- **Enhanced Insights:** Granular revenue breakdown by channel (Waiter, Counter, Online) with interactive time-period filters (Today, 7/30/90 days).
- **Staff HR:** Comprehensive staff management, including role assignment, performance metrics, and shift scheduling.
- **Menu Management:** Full control over categories, products (with variations and options), and availability.
- **System Settings:** Customize store name, theme (primary colors), logo, and automated loyalty tiers.
- **Backup & Restore:** Secure database backup and restoration interface.

### 👤 Customer Experience
- **Online Ordering:** Modern UI for browsing menu items, customizing selections, and tracking orders.
- **Loyalty Program:** Secure, QR-based loyalty system. Earn points on every purchase and unlock discounts at Bronze, Silver, Gold, and Platinum tiers.
- **Table Reservations:** Integrated booking system with real-time availability checking.
- **Customer Portal:** Manage addresses, view order history, track loyalty progress, and leave reviews.

---

## 🚀 Technology Stack

### Backend
- **Framework:** Express.js (Node.js 20+) with TypeScript.
- **ORM:** Prisma 5+ for type-safe database queries.
- **Database:** MySQL 8.0 / MariaDB 10.6+.
- **Real-Time:** Socket.IO for instant order notifications and status updates.
- **Validation:** Zod for robust schema validation.
- **Security:** JWT (Authentication), Bcrypt (Hashing), Helmet (Headers), and AES-256-CBC for secure loyalty tokens.

### Frontend
- **Framework:** React 18 with Vite.
- **State Management:** Zustand (Global) & TanStack Query (Server-side cache).
- **Styling:** Tailwind CSS with dynamic theme injection via React Context.
- **Interactive:** Chart.js (Analytics), React Hook Form, and integrated QR scanning (jsQR/qrcode).

---

## 📁 Project Structure

```
food-ordering-app/
├── backend/                 # Express API & Prisma Schema
│   ├── src/
│   │   ├── controllers/     # Business logic handlers
│   │   ├── middleware/      # Auth, Error, & Security middleware
│   │   ├── routes/          # API endpoint definitions
│   │   ├── utils/           # Encryption & Helper functions
│   │   └── server.ts        # Entry point & Socket.IO setup
│   └── prisma/              # Database schema & migrations
├── frontend/                # React/Vite Application
│   ├── src/
│   │   ├── components/      # Reusable UI & Complex modules (POS, KDS)
│   │   ├── pages/           # View components organized by role
│   │   ├── services/        # API client (Axios)
│   │   └── store/           # Zustand state definitions
├── docker-compose.yml       # Production/Dev containerization
└── scripts/                 # Utility scripts (SETUP.sh, etc.)
```

---

## 🏃 Quick Start

### 1. Requirements
- Node.js **20.0.0+**
- MySQL **8.0** or MariaDB **10.6+**
- Docker (optional but recommended)

### 2. Deployment via Docker (Fastest)
```bash
# Clone the repository
git clone <repository-url>
cd food-ordering-app

# Start the environment
docker-compose up -d
```
*Frontend: http://localhost:5173 | Backend API: http://localhost:3000*

### 3. Manual Development Setup
**Backend:**
```bash
cd backend
npm install
cp .env.example .env      # Configure your DB URL & Secret
npx prisma migrate dev    # Setup database
npm run dev
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

---

## 📊 Roadmap & Upcoming
- [x] **Loyalty Program:** QR-based points and tiered discounts.
- [x] **Admin Insights:** Multi-channel revenue analytics.
- [x] **Kitchen Sync:** Real-time KDS with status synchronization.
- [ ] **Payment Integration:** Stripe/PayPal integration for online payments.
- [ ] **Mobile App:** Dedicated React Native application for Waiters.
- [ ] **Inventory Management:** Low-stock alerts and ingredient tracking.

---

## 🛡️ Security & Performance
- **Encrypted QR Tokens:** Loyalty codes expire every 5 minutes and are encrypted using AES-256 to prevent cloning.
- **Optimized Queries:** Database indexes and filtered fetching for active orders.
- **Rate Limiting:** Protection against brute-force on auth and sensitive endpoints.

---
Built with ❤️ by the development team. Distributed under the MIT License.

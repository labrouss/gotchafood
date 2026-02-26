# 🍕 Modern Food Ordering & Management System

A comprehensive, production-ready full-stack application designed for restaurants, cafés, and delivery services. Built with **Node.js**, **React**, **TypeScript**, and **MySQL/MariaDB**, it features a multi-role ecosystem for customers, staff, and administrators — plus a dedicated **React Native mobile app** for waiters.

---

## 🎨 Role-Based Features

### 📱 Waiter Mobile App (React Native / Expo)
A dedicated handheld app for waiters, separate from the web frontend.

- **Dashboard:** Real-time view of all active table sessions, pending orders per table, and available free tables. Auto-refreshes every 30 seconds.
- **Customer Check-in Modal:** When opening a table, waiters can identify the customer via:
  - **QR Code Scanner** — scans the customer's encrypted loyalty card using the device camera. Decrypts the token, resolves the customer profile, and fetches live loyalty stats.
  - **Phone Number Search** — searches both walk-in (`Customer`) and registered app user (`LoyaltyReward`) tables with automatic fallback between the two.
- **Loyalty-Aware Sessions:** Once a customer is identified, their tier discount is stored and automatically applied to every order placed during that session.
- **Take Order Screen:** Category-filtered menu grid with cart management. Displays live discount preview per item and a full breakdown (subtotal / discount / total) in the cart when a loyalty customer is active.
- **Order Management:** Place orders directly to the kitchen. Mark orders as served from the dashboard.
- **Loyalty Points on Serve:** When a waiter marks an order as served, loyalty points are automatically awarded to the customer (1 pt/€1 spent) with tier-upgrade detection and bonus points.
- **Shift Management:** Clock in/out, view shift history, and daily stats.
- **Internationalisation (i18n):** Full i18next integration for multi-language support.
- **Keyboard-Safe Modals:** All input modals use `KeyboardAvoidingView` + `ScrollView` so the phone input is never obscured by the on-screen keyboard.

### 👔 Waiter & Staff (Web)
- **Waiter Dashboard:** Manage active table sessions, view pending reservations, and track daily shift stats.
- **Walk-in Sessions:** Start quick sessions for walk-in customers on available tables.
- **Order Taking:** Handheld-friendly interface for creating and adding items to table orders.
- **Table Management:** Real-time visibility into table occupancy and location (Main, Terrace, etc.).
- **Shift Management:** Clock-in/out functionality with shift history tracking.

### 🍳 Kitchen & Operations
- **Kitchen Display System (KDS):** Real-time display of pending orders categorised by station (Kitchen, Bar, etc.) with automated item completion.
- **Counter POS:** Optimised interface for over-the-counter orders with integrated loyalty scanning.
- **Delivery Dashboard:** Specialised view for managing "Out for Delivery" and "Delivered" statuses for online orders.

### 📈 Admin & Insights
- **Enhanced Insights:** Granular revenue breakdown by channel (Waiter, Counter, Online) with interactive time-period filters (Today, 7/30/90 days).
- **Staff HR:** Comprehensive staff management, including role assignment, performance metrics, and shift scheduling.
- **Menu Management:** Full control over categories, products (with variations and options), and availability.
- **System Settings:** Customise store name, theme (primary colours), logo, and automated loyalty tiers.
- **Backup & Restore:** Secure database backup and restoration interface.
- **Reservations Calendar:** Admin view of all reservations with seat/cancel controls.
- **Customer Management:** View all registered customers, their loyalty tier, points, and order history.

### 👤 Customer Experience
- **Online Ordering:** Modern UI for browsing menu items, customising selections, and tracking orders.
- **Loyalty Program:** Secure, QR-based loyalty system. Earn points on every purchase (online, counter, and dine-in) and unlock discounts at Bronze, Silver, Gold, and Platinum tiers.
- **Loyalty Card:** Auto-refreshing QR code (rotates every 4 minutes) that waiters scan to identify the customer and apply their discount instantly.
- **Table Reservations:** Integrated booking system with real-time availability checking.
- **Customer Portal:** Manage addresses, update profile (including phone number), view order history, track loyalty progress, and leave reviews.

---

## 🔐 Loyalty System — Deep Dive

The loyalty system spans all ordering channels and is unified under a single point ledger per registered user.

### Points Accumulation
| Channel | Trigger | Rate |
|---|---|---|
| Online order | Order marked `DELIVERED` | 1 pt / €1 spent |
| Counter POS | Order marked `DELIVERED` | 1 pt / €1 spent |
| Waiter table | Order marked `SERVED` | 1 pt / €1 spent |

### Tier Thresholds
Tiers are configurable via Admin → Loyalty Tiers. Default thresholds:

| Tier | Lifetime Points | Bonus on Unlock |
|---|---|---|
| 🥉 Bronze | 0 | — |
| 🥈 Silver | 100 | +10 pts |
| 🥇 Gold | 200 | +25 pts |
| 💎 Platinum | 500 | +50 pts |

### QR Token Security
- Tokens are AES-256-CBC encrypted with a server-side `LOYALTY_SECRET`.
- Each token encodes `userId|timestamp` and expires after **5 minutes**.
- The frontend refreshes the QR every 4 minutes to ensure it is always valid when scanned.
- The mobile scanner handles both encrypted tokens (new format) and plain phone-number QRs (legacy/fallback).

### Dual Customer Model
The system maintains two separate customer data stores:
- **`User` + `LoyaltyReward`** — registered app users with full loyalty history.
- **`Customer`** — walk-in customers tracked by phone number only.

Phone lookup and QR scanning automatically detect which table to query and fall back gracefully, so waiters always get the right result regardless of whether the customer has a registered account.

---

## 🚀 Technology Stack

### Backend
- **Framework:** Express.js (Node.js 20+) with TypeScript
- **ORM:** Prisma 5+ for type-safe database queries
- **Database:** MySQL 8.0 / MariaDB 10.6+
- **Real-Time:** Socket.IO for instant order notifications and status updates
- **Validation:** Zod for robust schema validation
- **Security:** JWT, Bcrypt, Helmet, and AES-256-CBC for loyalty tokens

### Frontend (Web)
- **Framework:** React 18 with Vite
- **State Management:** Zustand (global) & TanStack Query (server cache)
- **Styling:** Tailwind CSS with dynamic theme injection via React Context
- **Charts:** Chart.js for analytics
- **QR:** qrcode library for loyalty card generation

### Mobile App (Waiter)
- **Framework:** React Native 0.81 with Expo SDK 54
- **Navigation:** Expo Router (file-based)
- **Camera / QR:** `expo-camera` `CameraView` with `onBarcodeScanned`
- **State:** Zustand + TanStack Query
- **i18n:** i18next + react-i18next
- **Secure Storage:** expo-secure-store for JWT persistence
- **Notifications:** expo-notifications (push requires dev build, not Expo Go)

---

## 📁 Project Structure

```
food-ordering-app/
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── waiter.controller.ts   # Sessions, orders, shifts, points awarding
│   │   │   ├── loyalty.controller.ts  # Token gen/verify, dual-table customer lookup
│   │   │   ├── admin.controller.ts    # Admin ops + points helper
│   │   │   └── counter.controller.ts  # POS + points awarding on delivery
│   │   ├── middleware/                # Auth, error, security
│   │   ├── routes/                    # API endpoint definitions
│   │   └── utils/
│   │       └── crypto.util.ts         # AES-256-CBC encrypt/decrypt
│   └── prisma/
│       └── schema.prisma              # DB schema (uses db push)
│
├── frontend/                          # React/Vite web app
│   └── src/
│       ├── pages/
│       │   ├── admin/                 # Dashboard, insights, HR, KDS, reservations
│       │   ├── customer/              # Loyalty card, reservations
│       │   ├── waiter/                # Web waiter dashboard
│       │   └── counter/               # Counter POS
│       └── store/                     # Zustand state
│
├── mobile/                            # React Native / Expo waiter app
│   ├── app/
│   │   ├── (auth)/login.tsx           # JWT login
│   │   └── (app)/
│   │       ├── index.tsx              # Dashboard + check-in modal
│   │       ├── take-order/[tableId].tsx  # Menu + cart + loyalty display
│   │       └── order-detail/[orderId].tsx
│   ├── components/
│   │   └── QRScannerModal.tsx         # Camera scanner, dual-path token/phone logic
│   └── services/api.ts                # All API calls incl. loyalty endpoints
│
├── setup-wizard.html              # Browser-based config generator (no server needed)
├── customer.config.json           # Deployment config (generated by wizard or edited manually)
├── initial-setup.sh               # Automated setup: validates config, generates .env files,
│                                  #   builds docker-compose.yml, starts containers, seeds DB
└── docker-compose.yml             # Auto-generated by initial-setup.sh (or edit manually)
```

---

## 🏃 Quick Start

### Requirements
- Docker & Docker Compose
- Python 3 (for config parsing in `initial-setup.sh`)
- A modern browser (for `setup-wizard.html`)

---

### 🧙 Option A — Setup Wizard (Recommended for new deployments)

The easiest way to deploy. Open **`setup-wizard.html`** in any browser — no server needed, it runs entirely client-side.

The wizard walks through **5 steps**:

| Step | What you configure |
|---|---|
| 01 Restaurant | Name, slug, language, timezone, currency, admin credentials |
| 02 Server | Host, backend/frontend/mobile ports, optional SMTP email |
| 03 Database | DB name, user, passwords, JWT secret, optional mobile (Expo/ngrok) tokens |
| 04 Features | Toggle individual features on/off (Delivery, Table Ordering, Reservations, Loyalty, Reviews, KDS, Counter POS, Demo data) |
| 05 Export | Review summary, copy or **download `customer.config.json`** |

Once you download the config, proceed to Option B below.

---

### ⚙️ Option B — `initial-setup.sh` (Automated Docker deployment)

```bash
# 1. Fill in your settings (or use the wizard above to generate this)
cp customer.config.json.example customer.config.json
# edit customer.config.json — set all CHANGE_ME values

# 2. Run the setup script
chmod +x initial-setup.sh
./initial-setup.sh

# 3. Optional flags
./initial-setup.sh --config path/to/other.config.json   # use a different config file
./initial-setup.sh --reset                               # wipe DB volumes and start fresh
```

The script will:
1. Validate all required config fields (refuses to run with placeholder `CHANGE_ME` values)
2. Generate `backend/.env`, `frontend/.env`, and `mobile/.env` automatically
3. Generate a `docker-compose.yml` tailored to your ports and enabled services
4. Start all Docker containers
5. Wait for the backend to be healthy, then run `prisma db push`
6. Optionally seed the database with demo data
7. Print a summary with all access URLs and admin credentials

**On first run (~3 min):** Docker pulls images and runs `npm install` inside each container.

---

### 🐳 Option C — Manual Docker (existing `docker-compose.yml`)

```bash
docker-compose up -d
```
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- phpMyAdmin: http://localhost:8080
- Mobile (Expo): http://localhost:8081

---

### `customer.config.json` reference

All deployment settings live in a single JSON file:

```jsonc
{
  "customer": {
    "name": "My Restaurant",       // Display name used throughout the app
    "slug": "my-restaurant",       // Used for Docker container names
    "defaultLanguage": "en",       // en, el, etc.
    "timezone": "Europe/Athens",
    "currency": "EUR",
    "currencySymbol": "€"
  },
  "server": {
    "host": "localhost",           // Set to your server IP/domain for remote deploys
    "backendPort": 3000,
    "frontendPort": 5173,
    "mobileMetroPort": 8081
  },
  "database": {
    "name": "food_ordering",
    "user": "foodapp",
    "password": "CHANGE_ME",
    "rootPassword": "CHANGE_ME",
    "port": 3306
  },
  "auth": {
    "jwtSecret": "CHANGE_ME_MIN_32_CHARS",
    "jwtExpiresIn": "7d"
  },
  "adminUser": {
    "email": "admin@myrestaurant.com",
    "password": "CHANGE_ME",
    "firstName": "Admin",
    "lastName": "User",
    "phone": ""
  },
  "mobile": {
    "enabled": true,
    "expoToken": "",               // Optional: Expo account token
    "ngrokAuthToken": ""           // Optional: for external tunnel access
  },
  "email": {
    "enabled": false,              // Set true + fill SMTP fields to enable notifications
    "smtpHost": "", "smtpPort": 587, "smtpUser": "", "smtpPass": "",
    "fromName": "My Restaurant", "fromEmail": ""
  },
  "features": {
    "delivery": true,
    "tableOrdering": true,
    "reservations": true,
    "loyalty": true,
    "reviews": true,
    "kitchenDisplay": true,
    "counterPOS": true
  },
  "seed": {
    "loadDemoData": true,          // Load sample categories, menu items, and orders
    "demoDataLanguage": "en"
  }
}
```

> ⚠️ The backend uses `ts-node --transpile-only` (no hot reload). Restart the container after backend file changes.

---

## 🔌 Key API Endpoints

### Waiter
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/waiter/dashboard` | Active sessions, free tables, shift info |
| `POST` | `/api/waiter/sessions` | Start table session |
| `POST` | `/api/waiter/sessions/:sessionId/orders` | Create order (applies discount via `loyaltyPhone`) |
| `PATCH` | `/api/waiter/sessions/:sessionId/orders/:orderId/served` | Mark served + award points |
| `POST` | `/api/waiter/clock-in` / `clock-out` | Shift management |

### Loyalty
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/loyalty/card-token` | Generate encrypted QR token (5 min expiry) |
| `POST` | `/api/user/identify-loyalty` | Decrypt QR token → user profile |
| `GET` | `/api/loyalty/lookup/:phone` | Look up walk-in Customer by phone |
| `GET` | `/api/loyalty/user-lookup/:phone` | Look up registered User's LoyaltyReward by phone |
| `GET` | `/api/loyalty/my-loyalty` | Current user's points, tier, transactions |

---

## 📊 Roadmap

- [x] Loyalty program — QR-based points and tiered discounts
- [x] Admin insights — multi-channel revenue analytics
- [x] Kitchen sync — real-time KDS with status synchronisation
- [x] **Mobile waiter app** — React Native with QR scanning, loyalty check-in, discount-aware ordering
- [x] **Table-side loyalty** — discount applied and points awarded for all dine-in orders
- [x] **Dual customer lookup** — unified phone/QR search across both customer models
- [ ] Payment integration — Stripe/PayPal for online payments
- [ ] Inventory management — low-stock alerts and ingredient tracking
- [ ] Mobile push notifications — requires Expo development build

---

## 🛡️ Security & Performance

- **Encrypted QR Tokens:** AES-256-CBC with 5-minute expiry prevents cloning and replay attacks.
- **Server-Side Pricing:** Item prices are always resolved from the DB — client-supplied prices are ignored.
- **Role-Based Access:** Every route protected by `authenticate` + `authorize` middleware.
- **Non-Fatal Points:** Loyalty point awarding is wrapped in try/catch so a failure never blocks an order or serve operation.
- **Optimised Queries:** Database indexes on active sessions, orders, and loyalty lookups.

---

Built with ❤️ by the development team. Distributed under the MIT License.

# Food Ordering Application - Full Stack Rewrite

A modern, production-ready food ordering system built with Node.js, React, TypeScript, and MySQL/MariaDB.

## 🚀 Technology Stack

### Backend
- **Runtime**: Node.js 20+
- **Framework**: Express.js with TypeScript
- **Database**: MySQL 8.0 / MariaDB 10.6+
- **ORM**: Prisma 5
- **Authentication**: JWT with bcrypt
- **Validation**: Zod
- **API Documentation**: Swagger/OpenAPI

### Frontend
- **Framework**: React 18
- **Language**: TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **State Management**: Zustand + React Query
- **Forms**: React Hook Form + Zod
- **Routing**: React Router v6

### DevOps
- **Containerization**: Docker & Docker Compose
- **Process Manager**: PM2
- **Environment**: dotenv
- **API Testing**: Thunder Client / Postman collections included

## 📁 Project Structure

```
food-ordering-app/
├── backend/                 # Node.js API server
│   ├── src/
│   │   ├── controllers/     # Request handlers
│   │   ├── routes/          # API routes
│   │   ├── middleware/      # Auth, validation, error handling
│   │   ├── services/        # Business logic
│   │   ├── utils/           # Helper functions
│   │   └── types/           # TypeScript types
│   ├── prisma/              # Database schema & migrations
│   ├── tests/               # API tests
│   └── package.json
│
├── frontend/                # React application
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── pages/           # Page components
│   │   ├── hooks/           # Custom hooks
│   │   ├── services/        # API client
│   │   ├── store/           # State management
│   │   ├── types/           # TypeScript types
│   │   └── utils/           # Helper functions
│   └── package.json
│
├── database/                # Database scripts & documentation
├── docker-compose.yml       # Local development setup
└── README.md
```

## 🏃 Quick Start

### Prerequisites
- Node.js 20+ and npm/yarn/pnpm
- Docker and Docker Compose (optional, recommended)
- MySQL 8.0 or MariaDB 10.6+

### Option 1: Using Docker (Recommended)

```bash
# Clone the repository
git clone <repository-url>
cd food-ordering-app

# Start all services
docker-compose up -d

# The application will be available at:
# - Frontend: http://localhost:5173
# - Backend API: http://localhost:3000
# - API Docs: http://localhost:3000/api-docs
```

### Option 2: Manual Setup

```bash
# 1. Setup Backend
cd backend
npm install
cp .env.example .env
# Edit .env with your database credentials
npx prisma migrate dev
npx prisma generate
npm run dev

# 2. Setup Frontend (in a new terminal)
cd frontend
npm install
cp .env.example .env
npm run dev
```

## 🗄️ Database Setup

The application uses Prisma ORM for database management.

### Run Migrations
```bash
cd backend
npx prisma migrate dev
```

### Seed Database (Sample Data)
```bash
npm run seed
```

### View Database (Prisma Studio)
```bash
npx prisma studio
```

## 🔑 Environment Variables

### Backend (.env)
```env
DATABASE_URL="mysql://user:password@localhost:3306/food_ordering"
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_EXPIRES_IN="7d"
NODE_ENV="development"
PORT=3000
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:3000/api
```

## 📚 API Documentation

Once the backend is running, visit:
- **Swagger UI**: http://localhost:3000/api-docs
- **OpenAPI JSON**: http://localhost:3000/api-docs.json

### Key Endpoints

#### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh token
- `GET /api/auth/me` - Get current user

#### Menu
- `GET /api/menu` - Get all menu items
- `GET /api/menu/:id` - Get menu item details
- `GET /api/categories` - Get categories

#### Orders
- `POST /api/orders` - Create new order
- `GET /api/orders` - Get user's orders
- `GET /api/orders/:id` - Get order details
- `PATCH /api/orders/:id/status` - Update order status (admin)

#### Admin
- `POST /api/admin/menu` - Create menu item
- `PUT /api/admin/menu/:id` - Update menu item
- `DELETE /api/admin/menu/:id` - Delete menu item
- `GET /api/admin/orders` - Get all orders

## 🧪 Testing

### Backend Tests
```bash
cd backend
npm test                 # Run all tests
npm run test:watch      # Watch mode
npm run test:coverage   # Coverage report
```

### Frontend Tests
```bash
cd frontend
npm test
```

## 🚀 Deployment

### Build for Production

```bash
# Backend
cd backend
npm run build
npm start

# Frontend
cd frontend
npm run build
# Serve the 'dist' folder with nginx or static hosting
```

### Docker Production Build
```bash
docker-compose -f docker-compose.prod.yml up -d
```

## 📊 Database Schema

### Key Tables
- **users** - User accounts and authentication
- **menu_items** - Food items available for order
- **categories** - Menu categories
- **orders** - Customer orders
- **order_items** - Items within each order
- **addresses** - Delivery addresses
- **payments** - Payment records

See `backend/prisma/schema.prisma` for complete schema.

## 🔐 Security Features

- Password hashing with bcrypt (10 rounds)
- JWT authentication with HTTP-only cookies
- Input validation using Zod schemas
- SQL injection protection via Prisma ORM
- XSS prevention
- CORS configuration
- Rate limiting on sensitive endpoints
- Helmet.js security headers

## 🎨 Features

### Customer Features
- User registration and authentication
- Browse menu by categories
- Search and filter items
- Shopping cart management
- Multiple delivery addresses
- Order tracking
- Order history
- User profile management

### Admin Features
- Dashboard with analytics
- Menu management (CRUD)
- Order management
- User management
- Category management
- Real-time order notifications

## 🛠️ Development

### Available Scripts

**Backend:**
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm test` - Run tests
- `npm run lint` - Lint code
- `npm run format` - Format code with Prettier

**Frontend:**
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Lint code

## 📝 License

MIT License - feel free to use this project for commercial purposes.

## 👥 Support

For issues, questions, or contributions, please open an issue or pull request.

## 🗺️ Roadmap

- [ ] Payment integration (Stripe/PayPal)
- [ ] Real-time order tracking
- [ ] Push notifications
- [ ] Email notifications
- [ ] SMS notifications
- [ ] Admin analytics dashboard
- [ ] Inventory management
- [ ] Loyalty program
- [ ] Multi-language support (Greek/English)
- [ ] Mobile app (React Native)
- [ ] PWA support
- [ ] Social media login
- [ ] Reviews and ratings
- [ ] Delivery time slot selection
- [ ] Promotional codes and discounts

---

Built with ❤️ using modern web technologies

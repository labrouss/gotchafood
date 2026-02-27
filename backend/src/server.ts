import express, { Application } from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import { Server } from 'socket.io';
import http from 'http';

// Import routes
import authRoutes from './routes/auth.routes';
import menuRoutes from './routes/menu.routes';
import categoryRoutes from './routes/category.routes';
import orderRoutes from './routes/order.routes';
import adminRoutes from './routes/admin.routes';
import userRoutes from './routes/user.routes';
import analyticsRoutes from './routes/analytics.routes';
import reviewRoutes from './routes/review.routes';
import loyaltyRoutes from './routes/loyalty.routes';
import staffhrRoutes from './routes/staffhr.routes';
import imageRoutes from './routes/image.routes';
import settingsRoutes from './routes/settings.routes';
import loyaltyTiersRoutes from './routes/loyalty-tiers.routes';
import counterRoutes from './routes/counter.routes';
import tablesRoutes from './routes/tables.routes';
import reservationsRoutes from './routes/reservations.routes';
import waiterRoutes from './routes/waiter.routes';
import loyaltyRoutes from './routes/loyalty.routes';


// Import middleware
import { errorHandler } from './middleware/error.middleware';
import { notFound } from './middleware/notFound.middleware';

// Load environment variables
dotenv.config();

// Build allowed origins once from env — used by both Express CORS and Socket.IO
const getAllowedOrigins = (): string[] => {
  const origins = new Set<string>(['http://localhost:5173']);
  if (process.env.FRONTEND_URL) origins.add(process.env.FRONTEND_URL);
  return Array.from(origins);
};

const app: Application = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: getAllowedOrigins(),
    methods: ['GET', 'POST'],
  },
});

export { io };
const PORT = process.env.PORT || 3000;

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Food Ordering API',
      version: '1.0.0',
      description: 'API documentation for the Food Ordering Application',
      contact: {
        name: 'API Support',
        email: 'support@foodapp.com',
      },
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: ['./src/routes/*.ts'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
})); // Security headers with CORS resource policy

// CORS configuration — origins are derived from environment variables so no
// hardcoded IPs or hostnames are needed here. FRONTEND_URL is set by
// initial-setup.sh (or manually in backend/.env) and always added alongside
// localhost:5173 as a safe fallback for local development.
const corsOptions = {
  origin: getAllowedOrigins(),
  credentials: true,
};

app.use(cors(corsOptions));
app.use(morgan('dev')); // Logging
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.use(cookieParser()); // Parse cookies

// API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/user', userRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/loyalty', loyaltyRoutes);
app.use('/api/staffhr', staffhrRoutes);
app.use('/api/images', imageRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/loyalty-tiers', loyaltyTiersRoutes);
app.use('/api/counter', counterRoutes);
app.use('/api/tables', tablesRoutes);
app.use('/api/reservations', reservationsRoutes);
app.use('/api/waiter', waiterRoutes);

// Serve uploaded images as static files with CORS headers
app.use('/uploads', cors(corsOptions), express.static(path.join(process.cwd(), 'public', 'uploads')));
app.use('/stock-images', cors(corsOptions), express.static(path.join(process.cwd(), 'public', 'stock-images')));

// Error handling
app.use(notFound);
app.use(errorHandler);

// loyalty routes
app.use('/api/loyalty', loyaltyRoutes);


// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('A user connected via Socket.IO:', socket.id);

  socket.on('join', (room) => {
    socket.join(room);
    console.log(`User ${socket.id} joined room: ${room}`);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`
🚀 Server is running on port ${PORT}
📚 API Documentation: http://localhost:${PORT}/api-docs
🏥 Health Check: http://localhost:${PORT}/health
🌍 Environment: ${process.env.NODE_ENV || 'development'}
🌐 Network: Listening on all interfaces (0.0.0.0:${PORT})
📡 Real-time: Socket.IO enabled
  `);
});

export default app;

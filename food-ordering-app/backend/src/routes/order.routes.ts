import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  createOrder,
  getUserOrders,
  getOrderById,
  cancelOrder,
} from '../controllers/order.controller';

const router = Router();

// All order routes require authentication
router.use(authenticate);

// Create order (checkout from cart)
router.post('/', createOrder);

// Get user's orders
router.get('/', getUserOrders);

// Get order details
router.get('/:id', getOrderById);

// Cancel order
router.post('/:id/cancel', cancelOrder);

export default router;

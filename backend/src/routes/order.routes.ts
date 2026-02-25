import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import {
  createOrder,
  getUserOrders,
  getOrderById,
  cancelOrder,
} from '../controllers/order.controller';
import { markOrderServed } from '../controllers/waiter.controller';

const router = Router();

// All order routes require authentication
router.use(authenticate);

// Create order (checkout from cart)
router.post('/', createOrder);

// Get user's orders
router.get('/', getUserOrders);

// Get order details (staff can view any order; customers only their own — handled inside controller)
router.get('/:id', getOrderById);

// Cancel order
router.post('/:id/cancel', cancelOrder);

// Mark order as served — used by mobile waiter app from order detail screen
// Staff/admin only; controller validates order is in READY status
router.patch('/:id/served', authorize('ADMIN', 'STAFF'), markOrderServed);

export default router;

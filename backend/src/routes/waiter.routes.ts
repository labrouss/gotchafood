import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import {
  getWaiterDashboard,
  startTableSession,
  getTableSession,
  endTableSession,
  createSessionOrder,
  getActiveSessions,
  getMyShifts,
  clockIn,
  clockOut,
  getWaiterStats,
  addItemsToOrder,
  getAvailableTables,
  markOrderServed,
} from '../controllers/waiter.controller';

const router = Router();

// All routes require authentication + staff/admin role
router.use(authenticate);
router.use(authorize('ADMIN', 'STAFF'));

// Dashboard & stats
router.get('/dashboard', getWaiterDashboard);
router.get('/stats', getWaiterStats);
router.get('/stats/:waiterId', authorize('ADMIN'), getWaiterStats);

// Available tables
router.get('/available-tables', getAvailableTables);

// Shifts
router.get('/shifts', getMyShifts);
router.post('/clock-in', clockIn);
router.post('/clock-out', clockOut);

// Table sessions
router.get('/sessions', getActiveSessions);
router.post('/sessions', startTableSession);
router.get('/sessions/:id', getTableSession);
router.post('/sessions/:id/end', endTableSession);

// Orders within a session
router.post('/sessions/:sessionId/orders', createSessionOrder);
router.post('/sessions/:sessionId/orders/:orderId/items', addItemsToOrder);

// Mark order as served
// Fixed: added /sessions/ prefix to match what the mobile client sends
router.patch('/sessions/:sessionId/orders/:orderId/served', markOrderServed);

export default router;

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
} from '../controllers/waiter.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);
router.use(authorize('ADMIN', 'STAFF'));

// Waiter Dashboard
router.get('/dashboard', getWaiterDashboard);

// Table Sessions
router.get('/sessions', getActiveSessions);
router.post('/sessions', startTableSession);
router.get('/sessions/:id', getTableSession);
router.post('/sessions/:id/end', endTableSession);
router.post('/sessions/:sessionId/orders', createSessionOrder);

// Shifts
router.get('/shifts', getMyShifts);
router.post('/clock-in', clockIn);
router.post('/clock-out', clockOut);

// Stats
router.get('/stats', getWaiterStats);
router.get('/stats/:waiterId', authorize('ADMIN'), getWaiterStats);

export default router;

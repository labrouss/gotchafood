import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import {
  createCounterOrder,
  getAllOrders,
  getCounterStats,
} from '../controllers/counter.controller';

const router = Router();

// All routes require staff or admin authentication
router.use(authenticate);
router.use(authorize('ADMIN', 'STAFF'));

router.get('/', getAllOrders);
router.post('/', createCounterOrder);
router.get('/stats', getCounterStats);

export default router;

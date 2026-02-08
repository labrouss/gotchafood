import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { getAnalytics } from '../controllers/analytics.controller';

const router = Router();

// Analytics route - Admin/Staff only
router.get('/', authenticate, authorize('ADMIN', 'STAFF'), getAnalytics);

export default router;

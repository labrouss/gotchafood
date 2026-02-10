import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { getInsights } from '../controllers/analytics.controller';

const router = Router();

// Analytics route - Admin/Staff only
router.get('/',        authenticate, authorize('ADMIN', 'STAFF'), getInsights);
router.get('/insights', authenticate, authorize('ADMIN', 'STAFF'), getInsights);

export default router;

import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import {
  getAllTiers,
  createTier,
  updateTier,
  deleteTier,
  initializeDefaultTiers,
} from '../controllers/loyalty-tiers.controller';

const router = Router();

// All routes require admin authentication
router.use(authenticate);
router.use(authorize('ADMIN'));

router.get('/', getAllTiers);
router.post('/', createTier);
router.post('/initialize', initializeDefaultTiers);
router.put('/:id', updateTier);
router.delete('/:id', deleteTier);

export default router;

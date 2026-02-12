import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import {
  getAllSettings,
  getSetting,
  updateSetting,
  bulkUpdateSettings,
  initializeDefaults,
} from '../controllers/settings.controller';

const router = Router();

// All routes require admin authentication
router.use(authenticate);
router.use(authorize('ADMIN'));

router.get('/', getAllSettings);
router.get('/:key', getSetting);
router.put('/:key', updateSetting);
router.post('/bulk', bulkUpdateSettings);
router.post('/initialize', initializeDefaults);

export default router;

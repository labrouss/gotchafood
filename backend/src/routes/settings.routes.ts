import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import {
  getAllSettings,
  getSetting,
  updateSetting,
  bulkUpdateSettings,
  initializeDefaults,
} from '../controllers/settings.controller';
import {
  createBackup,
  listBackups,
  downloadBackup,
  restoreBackup,
} from '../controllers/backup.controller';

const router = Router();

// Public routes (anyone can view settings for theming etc)
router.get('/', getAllSettings);

// Protected routes (Only ADMIN can update or backup)
router.use(authenticate);
router.use(authorize('ADMIN'));

// Backup routes
router.post('/backup', createBackup);
router.get('/backup', listBackups);
router.get('/backup/:filename', downloadBackup);
router.post('/backup/:filename/restore', restoreBackup);

router.post('/bulk', bulkUpdateSettings);
router.post('/initialize', initializeDefaults);

// Parametric routes must be last
router.get('/:key', getSetting);
router.put('/:key', updateSetting);

export default router;

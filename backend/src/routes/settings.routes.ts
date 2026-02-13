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

// All routes require admin authentication
router.use(authenticate);
router.use(authorize('ADMIN'));

// Backup routes (Must be before /:key to avoid capturing)
router.post('/backup', createBackup);
router.get('/backup', listBackups);
router.get('/backup/:filename', downloadBackup);
router.post('/backup/:filename/restore', restoreBackup);

router.get('/', getAllSettings);
router.post('/bulk', bulkUpdateSettings);
router.post('/initialize', initializeDefaults);
router.get('/:key', getSetting);
router.put('/:key', updateSetting);

export default router;

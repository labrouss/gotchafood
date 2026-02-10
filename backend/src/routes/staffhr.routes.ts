import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import {
  getAllStaff,
  hireStaff,
  updateStaff,
  toggleStaffLogin,
  fireStaff,
  rehireStaff,
  resetStaffPassword,
  upsertSchedule,
  getWeeklySchedule,
} from '../controllers/staffhr.controller';

const router = Router();

// All routes require admin
router.use(authenticate);
router.use(authorize('ADMIN'));

router.get('/',                       getAllStaff);
router.post('/',                      hireStaff);
router.patch('/:id',                  updateStaff);
router.patch('/:id/toggle-login',     toggleStaffLogin);
router.post('/:id/fire',              fireStaff);
router.post('/:id/rehire',            rehireStaff);
router.post('/:id/reset-password',    resetStaffPassword);
router.put('/:id/schedule',           upsertSchedule);
router.get('/schedule/weekly',        getWeeklySchedule);

export default router;

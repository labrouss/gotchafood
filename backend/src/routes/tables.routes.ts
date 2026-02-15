import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import {
  getAllTables,
  getTableById,
  createTable,
  updateTable,
  deleteTable,
  updateTableStatus,
  getAvailableTables,
  generateTableQR,
  getFloorPlan,
} from '../controllers/tables.controller';

const router = Router();

// Public routes
router.get('/available', getAvailableTables); // For customer booking
router.get('/floor-plan', getFloorPlan); // For display screens

// Protected routes
router.use(authenticate);

// Admin only
router.post('/', authorize('ADMIN'), createTable);
router.put('/:id', authorize('ADMIN'), updateTable);
router.delete('/:id', authorize('ADMIN'), deleteTable);
router.post('/:id/qr', authorize('ADMIN'), generateTableQR);

// Admin and Staff
router.get('/', authorize('ADMIN', 'STAFF'), getAllTables);
router.get('/:id', authorize('ADMIN', 'STAFF'), getTableById);
router.patch('/:id/status', authorize('ADMIN', 'STAFF'), updateTableStatus);

export default router;

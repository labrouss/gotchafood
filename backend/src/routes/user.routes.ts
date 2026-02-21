import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  getUserAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
  identifyCustomer,
} from '../controllers/user.controller';
import { authorize } from '../middleware/auth.middleware';

const router = Router();

// All user routes require authentication
router.use(authenticate);

// Identify customer via loyalty token (Staff/Admin only)
router.post('/identify-loyalty', authorize('ADMIN', 'STAFF', 'WAITER', 'COUNTER'), identifyCustomer);

// Address Management
router.get('/addresses', getUserAddresses);
router.post('/addresses', createAddress);
router.put('/addresses/:id', updateAddress);
router.delete('/addresses/:id', deleteAddress);
router.patch('/addresses/:id/default', setDefaultAddress);

export default router;

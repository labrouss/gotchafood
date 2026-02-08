import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  getUserAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
} from '../controllers/user.controller';

const router = Router();

// All user routes require authentication
router.use(authenticate);

// Address Management
router.get('/addresses', getUserAddresses);
router.post('/addresses', createAddress);
router.put('/addresses/:id', updateAddress);
router.delete('/addresses/:id', deleteAddress);
router.patch('/addresses/:id/default', setDefaultAddress);

export default router;

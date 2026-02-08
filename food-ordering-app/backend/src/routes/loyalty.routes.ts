import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { getMyLoyalty } from '../controllers/loyalty.controller';

const router = Router();

router.get('/my-loyalty', authenticate, getMyLoyalty);

export default router;

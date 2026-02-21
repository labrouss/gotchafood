import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { getMyLoyalty, getLoyaltyToken } from '../controllers/loyalty.controller';

const router = Router();

router.get('/my-loyalty', authenticate, getMyLoyalty);
router.get('/card-token', authenticate, getLoyaltyToken);

export default router;

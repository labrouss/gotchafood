import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { getMyLoyalty, getLoyaltyToken, lookupCustomer, lookupUserLoyalty } from '../controllers/loyalty.controller';


const router = Router();

router.get('/my-loyalty', authenticate, getMyLoyalty);
router.get('/card-token', authenticate, getLoyaltyToken);
router.get('/lookup/:phone', authenticate, lookupCustomer);
// Staff endpoint: get app-user loyalty (LoyaltyReward) by phone — used by QR scanner
router.get('/user-lookup/:phone', authenticate, lookupUserLoyalty);

export default router;

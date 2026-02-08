import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import {
  createReview,
  getMyReviews,
  getAllReviews,
  updateReviewStatus,
} from '../controllers/review.controller';

const router = Router();

router.post('/', authenticate, createReview);
router.get('/my-reviews', authenticate, getMyReviews);
router.get('/all', authenticate, authorize('ADMIN', 'STAFF'), getAllReviews);
router.patch('/:id', authenticate, authorize('ADMIN'), updateReviewStatus);

export default router;

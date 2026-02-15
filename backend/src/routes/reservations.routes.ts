import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import {
  getAllReservations,
  getReservationById,
  createReservation,
  updateReservation,
  confirmReservation,
  seatReservation,
  cancelReservation,
  markNoShow,
  completeReservation,
  getMyReservations,
  getReservationsByDateRange,
} from '../controllers/reservations.controller';

const router = Router();

// Public routes (guest reservations)
router.post('/', createReservation); // Allow guests to book

// Protected routes
router.use(authenticate);

// Customer routes
router.get('/my-reservations', getMyReservations);
router.patch('/:id/cancel', cancelReservation); // Customer can cancel their own

// Staff routes
router.get('/calendar', authorize('ADMIN', 'STAFF'), getReservationsByDateRange);
router.get('/', authorize('ADMIN', 'STAFF'), getAllReservations);
router.get('/:id', authorize('ADMIN', 'STAFF'), getReservationById);

// Admin routes
router.put('/:id', authorize('ADMIN'), updateReservation);
router.post('/:id/confirm', authorize('ADMIN'), confirmReservation);
router.post('/:id/no-show', authorize('ADMIN'), markNoShow);

// Waiter routes
router.post('/:id/seat', authorize('ADMIN', 'STAFF'), seatReservation);
router.post('/:id/complete', authorize('ADMIN', 'STAFF'), completeReservation);

export default router;

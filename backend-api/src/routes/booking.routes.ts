import { Router } from 'express';
import { getBookings, toggleBooking, getHeadcount } from '../controllers/booking.controller';
import { authenticate, authorizeRoles } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

// Students get their own bookings
router.get('/', authorizeRoles('STUDENT', 'MESS_COMMITTEE'), getBookings);

// Students toggle their bookings
router.put('/toggle', authorizeRoles('STUDENT', 'MESS_COMMITTEE'), toggleBooking);

// Staff/committee/admin gets headcount summary for a date range
router.get('/headcount', authorizeRoles('MESS_COMMITTEE', 'WARDEN_ADMIN'), getHeadcount);

export default router;

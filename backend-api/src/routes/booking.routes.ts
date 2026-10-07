import { Router } from 'express';
import { getBookings, toggleBooking, getHeadcount } from '../controllers/booking.controller';
import { authenticate, authorizeRoles } from '../middleware/auth.middleware';
import { HOSTEL_ADMIN_ROLES } from '../constants/roles';

const router = Router();

router.use(authenticate);

// Students get their own bookings
router.get('/', authorizeRoles('STUDENT', 'MESS_COMMITTEE'), getBookings);

// Students toggle their bookings
router.put('/toggle', authorizeRoles('STUDENT', 'MESS_COMMITTEE'), toggleBooking);

// Staff/committee/admin gets headcount summary for a date range
router.get('/headcount', authorizeRoles('MESS_COMMITTEE', ...HOSTEL_ADMIN_ROLES), getHeadcount);

export default router;

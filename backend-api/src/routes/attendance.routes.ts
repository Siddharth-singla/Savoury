import { Router } from 'express';
import { getRoster, markServed, overrideAttendance } from '../controllers/attendance.controller';
import { authenticate, authorizeRoles } from '../middleware/auth.middleware';
import { HOSTEL_ADMIN_ROLES } from '../constants/roles';

const router = Router();

router.use(authenticate);

// Counter Staff gets the roster
router.get('/roster', authorizeRoles('COUNTER_STAFF', 'MESS_COMMITTEE', ...HOSTEL_ADMIN_ROLES), getRoster);

// Staff marks a student as served (old)
router.post('/mark-served', authorizeRoles('COUNTER_STAFF', 'MESS_COMMITTEE', ...HOSTEL_ADMIN_ROLES), markServed);

// New checkin route for offline-first check-in
router.post('/checkin', authorizeRoles('COUNTER_STAFF', 'MESS_COMMITTEE', ...HOSTEL_ADMIN_ROLES), markServed);

// Override attendance
router.post('/override', authorizeRoles('MESS_COMMITTEE', ...HOSTEL_ADMIN_ROLES), overrideAttendance);

export default router;

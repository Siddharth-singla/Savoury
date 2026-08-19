import { Router } from 'express';
import { getRoster, markServed, overrideAttendance } from '../controllers/attendance.controller';
import { authenticate, authorizeRoles } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

// Counter Staff gets the roster
router.get('/roster', authorizeRoles('COUNTER_STAFF', 'MESS_COMMITTEE', 'WARDEN_ADMIN'), getRoster);

// Staff marks a student as served (old)
router.post('/mark-served', authorizeRoles('COUNTER_STAFF', 'MESS_COMMITTEE', 'WARDEN_ADMIN'), markServed);

// New checkin route for offline-first check-in
router.post('/checkin', authorizeRoles('COUNTER_STAFF', 'MESS_COMMITTEE', 'WARDEN_ADMIN'), markServed);

// Override attendance
router.post('/override', authorizeRoles('MESS_COMMITTEE', 'WARDEN_ADMIN'), overrideAttendance);

export default router;

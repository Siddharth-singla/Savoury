import { Router } from 'express';
import { listNotices, createNotice, deleteNotice, latestTimestamp } from '../controllers/notice.controller';
import { authenticate, authorizeRoles } from '../middleware/auth.middleware';
import { HOSTEL_ADMIN_ROLES } from '../constants/roles';

const router = Router();

router.use(authenticate);

// All authenticated users can view notices
router.get('/', listNotices);

// Cheap polling endpoint — mobile clients hit this every 30s
router.get('/latest-timestamp', latestTimestamp);

// Only MESS_COMMITTEE and hostel-admins (Warden/Co-Warden/Caretaker) can create notices
router.post('/', authorizeRoles('MESS_COMMITTEE', ...HOSTEL_ADMIN_ROLES), createNotice);

// Hostel-admins can delete any, MESS_COMMITTEE can delete their own (enforced in controller)
router.delete('/:id', authorizeRoles('MESS_COMMITTEE', ...HOSTEL_ADMIN_ROLES), deleteNotice);

export default router;

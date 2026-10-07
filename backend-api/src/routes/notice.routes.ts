import { Router } from 'express';
import { listNotices, createNotice, deleteNotice, latestTimestamp } from '../controllers/notice.controller';
import { authenticate, authorizeRoles } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

// All authenticated users can view notices
router.get('/', listNotices);

// Cheap polling endpoint — mobile clients hit this every 30s
router.get('/latest-timestamp', latestTimestamp);

// Only MESS_COMMITTEE and WARDEN_ADMIN can create notices
router.post('/', authorizeRoles('MESS_COMMITTEE', 'WARDEN_ADMIN'), createNotice);

// WARDEN_ADMIN can delete any, MESS_COMMITTEE can delete their own (enforced in controller)
router.delete('/:id', authorizeRoles('MESS_COMMITTEE', 'WARDEN_ADMIN'), deleteNotice);

export default router;

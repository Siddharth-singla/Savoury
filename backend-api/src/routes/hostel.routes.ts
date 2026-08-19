import { Router } from 'express';
import { listHostels, setFeePlan, listFeePlans, createHostel, deleteHostel, updateHostel } from '../controllers/hostel.controller';
import { authenticate, authorizeRoles } from '../middleware/auth.middleware';

const router = Router();

// Intentionally public (no authenticate middleware) 
// required for the mobile app registration screen to populate the hostel picker
router.get('/', listHostels);

router.post(
  '/',
  authenticate,
  authorizeRoles('SUPER_ADMIN'),
  createHostel
);

router.put(
  '/:id',
  authenticate,
  authorizeRoles('SUPER_ADMIN'),
  updateHostel
);

router.delete(
  '/:id',
  authenticate,
  authorizeRoles('SUPER_ADMIN'),
  deleteHostel
);

router.post(
  '/:id/fee-plans',
  authenticate,
  authorizeRoles('SUPER_ADMIN'),
  setFeePlan
);

router.get(
  '/fee-plans',
  authenticate,
  authorizeRoles('SUPER_ADMIN'),
  listFeePlans
);

export default router;

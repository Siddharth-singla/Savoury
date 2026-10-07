import { Router } from 'express';
import { authenticate, authorizeRoles } from '../middleware/auth.middleware';
import { getSemesterEnd, setSemesterEnd } from '../controllers/config.controller';

const router = Router();

router.use(authenticate);

// Any authenticated user can read the semester end date
router.get('/semester-end', getSemesterEnd);

// Only super admin can set it
router.put('/semester-end', authorizeRoles('SUPER_ADMIN'), setSemesterEnd);

export default router;

import { Router } from 'express';
import { register, login, checkSetupStatus, setupSuperAdmin } from '../controllers/auth.controller';

const router = Router();

// One-time initial setup — auto-disables once a SUPER_ADMIN exists
router.get('/setup-status', checkSetupStatus);
router.post('/setup', setupSuperAdmin);

// Standard auth
router.post('/register', register);
router.post('/login', login);

export default router;

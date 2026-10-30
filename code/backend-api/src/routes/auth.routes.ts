import { Router } from 'express';
import { register, login, checkSetupStatus, setupSuperAdmin, verifyEmail } from '../controllers/auth.controller';

const router = Router();

// One-time initial setup — auto-disables once a SUPER_ADMIN exists
router.get('/setup-status', checkSetupStatus);
router.post('/setup', setupSuperAdmin);

// Standard auth
router.post('/register', register);
router.post('/login', login);

// Link from the verification email
router.get('/verify-email', verifyEmail);

export default router;

import { Router } from 'express';
import { listUsers, updateUserRole, deleteUser } from '../controllers/user.controller';
import { authenticate, authorizeRoles } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);
router.use(authorizeRoles('WARDEN_ADMIN', 'SUPER_ADMIN'));

router.get('/', listUsers);
router.patch('/:id/role', updateUserRole);

// Only SUPER_ADMIN can delete users
router.delete('/:id', authorizeRoles('SUPER_ADMIN'), deleteUser);

export default router;

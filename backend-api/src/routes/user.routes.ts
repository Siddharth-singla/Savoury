import { Router } from 'express';
import { listUsers, createUser, updateUser, updateUserRole, deleteUser, getMe, updateMe } from '../controllers/user.controller';
import { authenticate, authorizeRoles } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/me', getMe);
router.put('/me', updateMe);

router.use(authorizeRoles('WARDEN_ADMIN', 'SUPER_ADMIN'));

router.get('/', listUsers);
router.post('/', createUser);
router.put('/:id', updateUser);
router.patch('/:id/role', updateUserRole);
router.delete('/:id', deleteUser);

export default router;

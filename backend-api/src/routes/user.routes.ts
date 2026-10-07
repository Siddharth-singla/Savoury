import { Router } from 'express';
import { listUsers, createUser, updateUser, updateUserRole, deleteUser, getMe, updateMe } from '../controllers/user.controller';
import { authenticate, authorizeRoles } from '../middleware/auth.middleware';
import { HOSTEL_ADMIN_ROLES } from '../constants/roles';

const router = Router();

router.use(authenticate);

router.get('/me', getMe);
router.put('/me', updateMe);

// Hostel admins (Warden/Co-Warden/Caretaker) and Super Admin can manage users.
// Fine-grained rules (who can create/edit/delete which role) are enforced in
// the controller — e.g. Caretakers cannot add Mess Staff.
router.use(authorizeRoles(...HOSTEL_ADMIN_ROLES, 'SUPER_ADMIN'));

router.get('/', listUsers);
router.post('/', createUser);
router.put('/:id', updateUser);
router.patch('/:id/role', updateUserRole);
router.delete('/:id', deleteUser);

export default router;

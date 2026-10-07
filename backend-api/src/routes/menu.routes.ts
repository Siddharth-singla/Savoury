import { Router } from 'express';
import { getMenu, updateMenu, getMealTypes } from '../controllers/menu.controller';
import { authenticate, authorizeRoles } from '../middleware/auth.middleware';
import { HOSTEL_ADMIN_ROLES } from '../constants/roles';

const router = Router();

router.use(authenticate);

// Everyone can view menus
router.get('/', getMenu);

// Meal type config (cutoff times, serving windows)
router.get('/meal-types', getMealTypes);

// Only managers can update menus
router.put('/', authorizeRoles('MESS_COMMITTEE', ...HOSTEL_ADMIN_ROLES), updateMenu);

export default router;

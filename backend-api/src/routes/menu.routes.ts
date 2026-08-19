import { Router } from 'express';
import { getMenu, updateMenu, getMealTypes } from '../controllers/menu.controller';
import { authenticate, authorizeRoles } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

// Everyone can view menus
router.get('/', getMenu);

// Meal type config (cutoff times, serving windows)
router.get('/meal-types', getMealTypes);

// Only managers can update menus
router.put('/', authorizeRoles('MESS_COMMITTEE', 'WARDEN_ADMIN'), updateMenu);

export default router;

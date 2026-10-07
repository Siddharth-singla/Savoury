import { Router } from 'express';
import { authenticate, authorizeRoles } from '../middleware/auth.middleware';
import { getOptOuts, setOptOuts, removeOptOut, removeOptOutRange } from '../controllers/optout.controller';

const router = Router();

router.use(authenticate);
router.use(authorizeRoles('STUDENT', 'MESS_COMMITTEE'));

router.get('/', getOptOuts);
router.post('/', setOptOuts);
router.delete('/', removeOptOutRange);   // range re-opt-in via body { startDate, endDate }
router.delete('/:date', removeOptOut);   // single-date re-opt-in (backward compat)

export default router;

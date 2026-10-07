import { Router } from 'express';
import * as walletController from '../controllers/wallet.controller';
import { authenticate, authorizeRoles } from '../middleware/auth.middleware';
import { HOSTEL_ADMIN_ROLES } from '../constants/roles';

const router = Router();

// All wallet endpoints require authentication
router.use(authenticate);

// Student endpoints
router.get(
  '/me',
  authorizeRoles('STUDENT', 'MESS_COMMITTEE'),
  walletController.getMyWallet
);

router.get(
  '/me/transactions',
  authorizeRoles('STUDENT', 'MESS_COMMITTEE'),
  walletController.getMyTransactions
);

router.post(
  '/cashout-request',
  authorizeRoles('STUDENT', 'MESS_COMMITTEE'),
  walletController.requestCashout
);

// Admin/Warden endpoints (Warden, Co-Warden, Caretaker)
router.post(
  '/topup',
  authorizeRoles(...HOSTEL_ADMIN_ROLES),
  walletController.topupWallet
);

router.get(
  '/cashout-requests',
  authorizeRoles(...HOSTEL_ADMIN_ROLES),
  walletController.getCashoutRequests
);

router.post(
  '/cashout-requests/:id/resolve',
  authorizeRoles(...HOSTEL_ADMIN_ROLES),
  walletController.resolveCashoutRequest
);

export default router;

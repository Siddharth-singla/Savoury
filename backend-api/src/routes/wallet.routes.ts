import { Router } from 'express';
import * as walletController from '../controllers/wallet.controller';
import { authenticate, authorizeRoles } from '../middleware/auth.middleware';

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

// Admin/Warden endpoints
router.post(
  '/topup',
  authorizeRoles('WARDEN_ADMIN'),
  walletController.topupWallet
);

router.get(
  '/cashout-requests',
  authorizeRoles('WARDEN_ADMIN'),
  walletController.getCashoutRequests
);

router.post(
  '/cashout-requests/:id/resolve',
  authorizeRoles('WARDEN_ADMIN'),
  walletController.resolveCashoutRequest
);

export default router;

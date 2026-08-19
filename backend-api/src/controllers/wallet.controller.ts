import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../db';

// ---------------------------------------------------------
// STUDENT ENDPOINTS
// ---------------------------------------------------------

export const getMyWallet = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const studentId = req.user!.userId;
    const activeWallet = await prisma.walletAccount.findFirst({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
    });

    if (!activeWallet) {
      return res.status(200).json({ success: true, wallet: null });
    }

    res.status(200).json({ success: true, wallet: activeWallet });
  } catch (err) {
    next(err);
  }
};

const getTransactionsSchema = z.object({
  page: z.string().regex(/^\d+$/).optional().default('1'),
  limit: z.string().regex(/^\d+$/).optional().default('20'),
});

export const getMyTransactions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const studentId = req.user!.userId;
    const { page, limit } = getTransactionsSchema.parse(req.query);
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const activeWallet = await prisma.walletAccount.findFirst({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
    });

    if (!activeWallet) {
      return res.status(200).json({ success: true, transactions: [], total: 0 });
    }

    const [transactions, total] = await Promise.all([
      prisma.walletTransaction.findMany({
        where: { walletAccountId: activeWallet.id },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.walletTransaction.count({
        where: { walletAccountId: activeWallet.id },
      }),
    ]);

    res.status(200).json({ success: true, transactions, total, page: parseInt(page), limit: take });
  } catch (err) {
    next(err);
  }
};

const cashoutRequestSchema = z.object({
  requestedAmount: z.number().positive(),
});

export const requestCashout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const studentId = req.user!.userId;
    const { requestedAmount } = cashoutRequestSchema.parse(req.body);

    const activeWallet = await prisma.walletAccount.findFirst({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
    });

    if (!activeWallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    if (activeWallet.balance.toNumber() < requestedAmount) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    const request = await prisma.cashoutRequest.create({
      data: {
        studentId,
        semesterLabel: activeWallet.semesterLabel,
        requestedAmount,
        status: 'PENDING',
      }
    });

    res.status(201).json({ success: true, request });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------
// ADMIN/WARDEN ENDPOINTS
// ---------------------------------------------------------

const topupSchema = z.object({
  studentId: z.string(),
  amount: z.number().positive(),
  semesterLabel: z.string(),
  note: z.string().optional(),
});

export const topupWallet = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { studentId, amount, semesterLabel, note } = topupSchema.parse(req.body);
    const { hostelId: wardenHostelId, role } = req.user!;

    // Hostel guard: warden can only top-up students from their own hostel
    if (role !== 'SUPER_ADMIN' && wardenHostelId) {
      const student = await prisma.user.findUnique({
        where: { id: studentId },
        select: { hostelId: true, role: true },
      });
      if (!student) return res.status(404).json({ error: 'Student not found' });
      if (student.role !== 'STUDENT' && student.role !== 'MESS_COMMITTEE') return res.status(400).json({ error: 'Target user is not a student or mess committee' });
      if (student.hostelId !== wardenHostelId) {
        return res.status(403).json({ error: 'You can only top-up wallets of students in your hostel' });
      }
    }

    // Create wallet if it doesn't exist, else update it
    const result = await prisma.$transaction(async (tx) => {
      let wallet = await tx.walletAccount.findUnique({
        where: { studentId_semesterLabel: { studentId, semesterLabel } }
      });

      if (!wallet) {
        wallet = await tx.walletAccount.create({
          data: { studentId, semesterLabel, balance: amount }
        });
      } else {
        wallet = await tx.walletAccount.update({
          where: { id: wallet.id },
          data: { balance: { increment: amount } }
        });
      }

      const transaction = await tx.walletTransaction.create({
        data: {
          walletAccountId: wallet.id,
          type: 'TOPUP',
          amount,
          note: note || 'Manual top-up'
        }
      });

      return { wallet, transaction };
    });

    res.status(200).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

const getCashoutRequestsSchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'PAID']).optional(),
  page: z.string().regex(/^\d+$/).optional().default('1'),
  limit: z.string().regex(/^\d+$/).optional().default('20'),
});

export const getCashoutRequests = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, page, limit } = getCashoutRequestsSchema.parse(req.query);
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);
    const { hostelId: wardenHostelId, role } = req.user!;

    // Build where clause with hostel scoping
    const where: any = {};
    if (status) where.status = status;

    // WARDEN_ADMIN can only see cashout requests from their hostel's students
    if (role !== 'SUPER_ADMIN' && wardenHostelId) {
      where.student = { hostelId: wardenHostelId };
    }

    const [requests, total] = await Promise.all([
      prisma.cashoutRequest.findMany({
        where,
        include: { student: { select: { name: true, rollNo: true, email: true, hostelId: true } } },
        orderBy: { requestedAt: 'desc' },
        skip,
        take,
      }),
      prisma.cashoutRequest.count({ where }),
    ]);

    res.status(200).json({ success: true, requests, total, page: parseInt(page), limit: take });
  } catch (err) {
    next(err);
  }
};

const resolveCashoutSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  resolutionNote: z.string().optional(),
});

export const resolveCashoutRequest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status, resolutionNote } = resolveCashoutSchema.parse(req.body);
    const adminId = req.user!.userId;
    const { hostelId: wardenHostelId, role } = req.user!;

    const result = await prisma.$transaction(async (tx) => {
      const cashoutRequest = await tx.cashoutRequest.findUnique({
        where: { id },
        include: { student: { select: { hostelId: true } } },
      });
      if (!cashoutRequest) {
        throw { status: 404, message: 'Cashout request not found' };
      }
      if (cashoutRequest.status !== 'PENDING') {
        throw { status: 400, message: 'Request is already resolved' };
      }

      // Hostel guard for warden
      if (role !== 'SUPER_ADMIN' && wardenHostelId) {
        if ((cashoutRequest as any).student?.hostelId !== wardenHostelId) {
          throw { status: 403, message: 'You can only resolve cashouts for students in your hostel' };
        }
      }

      if (status === 'APPROVED') {
        const wallet = await tx.walletAccount.findUnique({
          where: { studentId_semesterLabel: { studentId: cashoutRequest.studentId, semesterLabel: cashoutRequest.semesterLabel } }
        });

        if (!wallet || wallet.balance.toNumber() < cashoutRequest.requestedAmount.toNumber()) {
          throw { status: 400, message: 'Insufficient balance for cashout' };
        }

        const updatedWallet = await tx.walletAccount.update({
          where: { id: wallet.id },
          data: { balance: { decrement: cashoutRequest.requestedAmount } }
        });

        await tx.walletTransaction.create({
          data: {
            walletAccountId: wallet.id,
            type: 'CASHOUT',
            amount: cashoutRequest.requestedAmount,
            relatedCashoutRequestId: cashoutRequest.id,
            note: resolutionNote || 'Cashout approved'
          }
        });
      }

      const updatedRequest = await tx.cashoutRequest.update({
        where: { id },
        data: {
          status,
          resolutionNote,
          resolvedAt: new Date(),
          resolvedById: adminId,
        }
      });

      return updatedRequest;
    });

    res.status(200).json({ success: true, request: result });
  } catch (err) {
    next(err);
  }
};

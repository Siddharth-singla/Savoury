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
  page: z.string().regex(/^\d{1,6}$/).optional().default('1').refine(v => parseInt(v) >= 1, 'page must be >= 1'),
  limit: z.string().regex(/^\d{1,3}$/).optional().default('20').refine(v => parseInt(v) >= 1 && parseInt(v) <= 100, 'limit must be 1-100'),
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
  requestedAmount: z.number().positive().max(1_000_000),
});

export const requestCashout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const studentId = req.user!.userId;
    const { requestedAmount } = cashoutRequestSchema.parse(req.body);

    const student = await prisma.user.findUnique({
      where: { id: studentId },
      select: { hostelId: true },
    });

    const activeWallet = await prisma.walletAccount.findFirst({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
    });

    if (!activeWallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    // ── Per-Hostel Semester End Gate ──────────────────────────────
    let semEndDate: Date | null = null;

    if (student?.hostelId) {
      const feePlan = await prisma.hostelFeePlan.findFirst({
        where: {
          hostelId: student.hostelId,
          semesterLabel: activeWallet.semesterLabel,
          semesterEndDate: { not: null },
        },
      });
      if (feePlan?.semesterEndDate) {
        semEndDate = new Date(feePlan.semesterEndDate);
      }
    }

    // Fallback to global config if no hostel-specific date found
    if (!semEndDate) {
      const semConfig = await prisma.systemConfig.findUnique({
        where: { key: 'semester_end_date' },
      });
      if (semConfig?.value) {
        semEndDate = new Date(semConfig.value + 'T00:00:00.000Z');
      } else {
        // Fallback: strictly lock until May 31 or Dec 31
        const now = new Date();
        const year = now.getUTCFullYear();
        const month = now.getUTCMonth(); // 0 to 11
        if (month <= 4) {
          semEndDate = new Date(Date.UTC(year, 4, 31));
        } else {
          semEndDate = new Date(Date.UTC(year, 11, 31));
        }
      }
    }

    if (semEndDate) {
      const tomorrow = new Date(semEndDate);
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
      if (new Date() < tomorrow) {
        const formatted = semEndDate.toLocaleDateString('en-IN', {
          day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
        });
        return res.status(403).json({
          error: `Cashout is only available after your hostel's semester ends on ${formatted}.`,
          semesterEndDate: semEndDate.toISOString().split('T')[0],
        });
      }
    }
    // ─────────────────────────────────────────────────────────────

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
  studentId: z.string().min(1).max(50),
  amount: z.number().positive().max(1_000_000),
  semesterLabel: z.string().trim().min(1).max(50),
  note: z.string().max(500).optional(),
});

export const topupWallet = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { studentId, amount, semesterLabel, note } = topupSchema.parse(req.body);
    const { hostelId: wardenHostelId, role } = req.user!;

    // Hostel guard: warden can only top-up students from their own hostel
    if (role !== 'SUPER_ADMIN') {
      const student = await prisma.user.findUnique({
        where: { id: studentId },
        select: { hostelId: true, role: true },
      });
      if (!student) return res.status(404).json({ error: 'Student not found' });
      if (student.role !== 'STUDENT' && student.role !== 'MESS_COMMITTEE') return res.status(400).json({ error: 'Target user is not a student or mess committee' });
      if (!wardenHostelId || student.hostelId !== wardenHostelId) {
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
  page: z.string().regex(/^\d{1,6}$/).optional().default('1').refine(v => parseInt(v) >= 1, 'page must be >= 1'),
  limit: z.string().regex(/^\d{1,3}$/).optional().default('20').refine(v => parseInt(v) >= 1 && parseInt(v) <= 100, 'limit must be 1-100'),
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
    if (role !== 'SUPER_ADMIN') {
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
  resolutionNote: z.string().max(500).optional(),
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
      if (role !== 'SUPER_ADMIN') {
        if (!wardenHostelId || (cashoutRequest as any).student?.hostelId !== wardenHostelId) {
          throw { status: 403, message: 'You can only resolve cashouts for students in your hostel' };
        }
      }

      // Atomically claim the request so two concurrent approvals (double-click,
      // two admins) can't both pass the PENDING check and debit twice.
      const claimed = await tx.cashoutRequest.updateMany({
        where: { id, status: 'PENDING' },
        data: { status, resolutionNote, resolvedAt: new Date(), resolvedById: adminId },
      });
      if (claimed.count === 0) {
        throw { status: 400, message: 'Request is already resolved' };
      }

      if (status === 'APPROVED') {
        const wallet = await tx.walletAccount.findUnique({
          where: { studentId_semesterLabel: { studentId: cashoutRequest.studentId, semesterLabel: cashoutRequest.semesterLabel } }
        });

        if (!wallet) {
          throw { status: 400, message: 'Insufficient balance for cashout' };
        }

        // Conditional decrement: only succeeds if the balance still covers it.
        const debited = await tx.walletAccount.updateMany({
          where: { id: wallet.id, balance: { gte: cashoutRequest.requestedAmount } },
          data: { balance: { decrement: cashoutRequest.requestedAmount } }
        });
        if (debited.count === 0) {
          throw { status: 400, message: 'Insufficient balance for cashout' };
        }

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

      const updatedRequest = await tx.cashoutRequest.findUniqueOrThrow({ where: { id } });

      return updatedRequest;
    });

    res.status(200).json({ success: true, request: result });
  } catch (err) {
    next(err);
  }
};

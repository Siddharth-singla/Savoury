import prisma from '../db';
export const getRoster = async (hostelId: string, mealTypeId: string, date: Date) => {
  // Fetch all students in the hostel
  const students = await prisma.user.findMany({
    where: { hostelId, role: { in: ['STUDENT', 'MESS_COMMITTEE'] } },
    select: { id: true, name: true, rollNo: true },
    orderBy: { name: 'asc' },
  });

  // Fetch their bookings and attendance for this meal
  const bookings = await prisma.booking.findMany({
    where: {
      mealTypeId,
      date,
      studentId: { in: students.map(s => s.id) },
    },
    include: {
      attendance: true,
    }
  });

  const bookingMap = new Map(bookings.map(b => [b.studentId, b]));

  return students.map(student => {
    const booking = bookingMap.get(student.id);
    // Implicit opt-in if no booking exists
    const status = booking?.status ?? 'OPTED_IN';
    const isServed = booking?.attendance !== null && booking?.attendance !== undefined;

    return {
      studentId: student.id,
      name: student.name,
      rollNo: student.rollNo,
      status, // OPTED_IN, OPTED_OUT, LOCKED
      isServed,
    };
  });
};

export const markServed = async (
  studentId: string,
  mealTypeId: string,
  date: Date,
  staffId: string
) => {
  const booking = await prisma.booking.upsert({
    where: {
      studentId_mealTypeId_date: { studentId, mealTypeId, date },
    },
    update: {}, // Do nothing if it exists
    create: {
      studentId,
      mealTypeId,
      date,
      status: 'OPTED_IN',
      lockedAt: new Date(), 
    },
  });

  if (booking.status === 'OPTED_OUT') {
    const error = new Error('Student opted out of this meal');
    (error as any).status = 400;
    throw error;
  }

  // Rely on the DB @unique constraint on bookingId for atomic duplicate prevention.
  try {
    return await prisma.$transaction(async (tx) => {
      const attendance = await tx.attendance.create({
        data: { bookingId: booking.id, checkedInById: staffId, result: 'SERVED' },
        include: {
          booking: {
            include: {
              student: { select: { id: true, name: true, email: true } },
              mealType: { select: { id: true, displayName: true, perMealRate: true } },
            },
          },
        },
      });

      const activeWallet = await tx.walletAccount.findFirst({
        where: { studentId },
        orderBy: { createdAt: 'desc' },
      });

      if (!activeWallet) {
        throw new Error('No active wallet account found for this student');
      }

      const updatedWallet = await tx.walletAccount.update({
        where: { id: activeWallet.id },
        data: { balance: { decrement: attendance.booking.mealType.perMealRate } },
      });

      await tx.walletTransaction.create({
        data: {
          walletAccountId: updatedWallet.id,
          type: 'MEAL_DEDUCTION',
          amount: attendance.booking.mealType.perMealRate,
          relatedAttendanceId: attendance.id,
          note: `Meal deduction for ${attendance.booking.mealType.displayName}`,
        }
      });

      return attendance;
    });
  } catch (err: any) {
    if (err?.code === 'P2002') {
      const dupError = new Error('Student has already been served for this meal');
      (dupError as any).status = 409;
      throw dupError;
    }
    throw err;
  }
};

export const createOverride = async (
  studentId: string,
  mealTypeId: string,
  date: Date,
  staffId: string,
  reason: string
) => {
  if (!reason || reason.trim() === '') {
    const error = new Error('Override reason is required');
    (error as any).status = 400;
    throw error;
  }

  const booking = await prisma.booking.upsert({
    where: {
      studentId_mealTypeId_date: { studentId, mealTypeId, date },
    },
    update: {},
    create: {
      studentId,
      mealTypeId,
      date,
      status: 'OPTED_IN',
      lockedAt: new Date(),
    },
  });

  try {
    return await prisma.$transaction(async (tx) => {
      const attendance = await tx.attendance.create({
        data: { 
          bookingId: booking.id, 
          checkedInById: staffId, 
          result: 'OVERRIDE',
          overrideReason: reason 
        },
        include: {
          booking: {
            include: {
              student: { select: { id: true, name: true, email: true } },
              mealType: { select: { id: true, displayName: true, perMealRate: true } },
            },
          },
        },
      });

      const activeWallet = await tx.walletAccount.findFirst({
        where: { studentId },
        orderBy: { createdAt: 'desc' },
      });

      if (!activeWallet) {
        throw new Error('No active wallet account found for this student');
      }

      const updatedWallet = await tx.walletAccount.update({
        where: { id: activeWallet.id },
        data: { balance: { decrement: attendance.booking.mealType.perMealRate } },
      });

      await tx.walletTransaction.create({
        data: {
          walletAccountId: updatedWallet.id,
          type: 'MEAL_DEDUCTION',
          amount: attendance.booking.mealType.perMealRate,
          relatedAttendanceId: attendance.id,
          note: `Override meal deduction for ${attendance.booking.mealType.displayName}`,
        }
      });

      return attendance;
    });
  } catch (err: any) {
    if (err?.code === 'P2002') {
      const dupError = new Error('Student has already scanned for this meal');
      (dupError as any).status = 409;
      throw dupError;
    }
    throw err;
  }
};

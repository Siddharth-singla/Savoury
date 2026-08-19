// ============================================================
// SmartMess — Prisma Seed File
// Seeds only infrastructure data: hostels, messes, meal types.
// NO users — use the web setup page to create the first SUPER_ADMIN.
// Run with: npx prisma db seed
// ============================================================

import { PrismaClient, MealSlot } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // ─────────────────────────────────────────────────────────────
  // 1. CLEANUP — wipe in dependency order (leaf → root)
  // ─────────────────────────────────────────────────────────────
  console.log('🧹 Cleaning existing data...');
  await prisma.walletTransaction.deleteMany();
  await prisma.cashoutRequest.deleteMany();
  await prisma.walletAccount.deleteMany();
  await prisma.hostelFeePlan.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.notice.deleteMany();
  await prisma.feedback.deleteMany();
  await prisma.guestMeal.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.menu.deleteMany();
  await prisma.mealType.deleteMany();
  await prisma.user.deleteMany();
  await prisma.mess.deleteMany();
  await prisma.hostel.deleteMany();

  // Hostels and Messes are no longer seeded. They should be created by SUPER_ADMIN via the web app.

  // ─────────────────────────────────────────────────────────────
  // 4. MEAL TYPES (global config — one row per slot)
  // ─────────────────────────────────────────────────────────────
  console.log('⏰ Seeding meal types...');
  await prisma.mealType.create({
    data: {
      slot: MealSlot.BREAKFAST,
      displayName: 'Breakfast',
      defaultCutoffTime: '00:00', // midnight — locks the night before
      servingStart: '07:30',
      servingEnd: '09:30',
      perMealRate: 75.00,
    },
  });
  await prisma.mealType.create({
    data: {
      slot: MealSlot.LUNCH,
      displayName: 'Lunch',
      defaultCutoffTime: '09:00',
      servingStart: '12:00',
      servingEnd: '14:00',
      perMealRate: 75.00,
    },
  });
  await prisma.mealType.create({
    data: {
      slot: MealSlot.DINNER,
      displayName: 'Dinner',
      defaultCutoffTime: '14:00', // 2 PM same day
      servingStart: '19:30',
      servingEnd: '21:30',
      perMealRate: 75.00,
    },
  });

  // ─────────────────────────────────────────────────────────────
  // Done
  // ─────────────────────────────────────────────────────────────
  console.log('\n✅ Seed complete! Summary:');
  console.log(`   Hostels    : ${await prisma.hostel.count()}`);
  console.log(`   Messes     : ${await prisma.mess.count()}`);
  console.log(`   Meal Types : ${await prisma.mealType.count()}`);
  console.log(`   Users      : ${await prisma.user.count()} (none — create via web setup)`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

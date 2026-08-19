// SmartMess — Delete all users from the database
// Usage: npx ts-node clear-users.ts

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('Deleting all users and dependent data...');
  // Delete in dependency order
  await prisma.walletTransaction.deleteMany();
  await prisma.cashoutRequest.deleteMany();
  await prisma.walletAccount.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.notice.deleteMany();
  await prisma.feedback.deleteMany();
  await prisma.guestMeal.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.user.deleteMany();
  console.log('✅ All users deleted. Database is clean.');
  console.log('   Now visit http://localhost:5173/setup to create the first SUPER_ADMIN.');
}

main().catch(console.error).finally(() => prisma.$disconnect());

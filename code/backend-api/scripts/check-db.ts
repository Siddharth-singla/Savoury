import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

async function main() {
  const messes = await p.mess.findMany();
  const hostels = await p.hostel.findMany();
  const students = await p.user.findMany({ where: { role: 'STUDENT' }, select: { id: true, name: true, hostelId: true } });

  console.log('Messes:', JSON.stringify(messes, null, 2));
  console.log('Hostels:', JSON.stringify(hostels, null, 2));
  console.log('Students (first 3):', JSON.stringify(students.slice(0, 3), null, 2));
}

main().finally(() => p.$disconnect());

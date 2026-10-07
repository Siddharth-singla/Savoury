import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const hostels = await prisma.hostel.findMany();
  console.log("Hostels:", hostels);
  if (hostels.length > 0) {
    try {
      const user = await prisma.user.create({
        data: {
          name: "Test User",
          email: `test_${Date.now()}@example.com`,
          passwordHash: "dummyhash",
          hostelId: hostels[0].id,
          role: "STUDENT"
        }
      });
      console.log("Created User:", user);
    } catch (e: any) {
      console.error("Prisma Error:", e);
    }
  }
}
main().finally(() => prisma.$disconnect());

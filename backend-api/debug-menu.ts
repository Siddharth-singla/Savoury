import prisma from './src/db';
import * as jwt from 'jsonwebtoken';
import 'dotenv/config';

async function test() {
  console.log("=== Debugging Menu Issue ===");
  
  // 1. Get the first student
  const student = await prisma.user.findFirst({ where: { role: 'STUDENT' } });
  if (!student) {
    console.log("No student found!");
    return;
  }
  console.log("Found student:", student.email, "hostelId:", student.hostelId);

  // 2. Check if hostel has a mess
  if (!student.hostelId) {
    console.log("Student has no hostelId!");
    return;
  }
  const mess = await prisma.mess.findUnique({ where: { hostelId: student.hostelId } });
  if (!mess) {
    console.log("Hostel", student.hostelId, "has no mess!");
    return;
  }
  console.log("Found mess:", mess.name);

  // 3. Check menus for this mess
  const menus = await prisma.menu.findMany({ where: { messId: mess.id } });
  console.log(`Found ${menus.length} menus for this mess.`);
  if (menus.length > 0) {
    console.log("Sample menu date:", menus[0].date);
  } else {
    // Check if menus exist for any OTHER mess
    const allMenus = await prisma.menu.findMany();
    console.log(`Found ${allMenus.length} menus total across all messes.`);
    if (allMenus.length > 0) {
      console.log("Sample menu is in messId:", allMenus[0].messId);
    }
  }

  // 4. Test the Zod coerce date logic
  const { z } = require('zod');
  const schema = z.coerce.date();
  try {
    const d = schema.parse("2026-08-16T12:00:00.000Z");
    console.log("Zod parse success:", d);
  } catch (e) {
    console.log("Zod parse failed:", e);
  }
}

test().finally(() => prisma.$disconnect());

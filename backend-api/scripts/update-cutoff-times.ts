/**
 * One-off script to update MealType cutoff times to:
 *   Breakfast → 00:00 (midnight — locks the night before)
 *   Lunch     → 09:00 (9 AM same day)
 *   Dinner    → 14:00 (2 PM same day)
 *
 * Run with:
 *   npx ts-node --skip-project --compiler-options '{"module":"CommonJS"}' scripts/update-cutoff-times.ts
 */

import { PrismaClient, MealSlot } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('⏰ Updating meal type cutoff times...');

  await prisma.mealType.updateMany({
    where: { slot: MealSlot.BREAKFAST },
    data: { defaultCutoffTime: '00:00' },
  });
  console.log('  ✅ Breakfast → 00:00 (midnight)');

  await prisma.mealType.updateMany({
    where: { slot: MealSlot.LUNCH },
    data: { defaultCutoffTime: '09:00' },
  });
  console.log('  ✅ Lunch     → 09:00');

  await prisma.mealType.updateMany({
    where: { slot: MealSlot.DINNER },
    data: { defaultCutoffTime: '14:00' },
  });
  console.log('  ✅ Dinner    → 14:00');

  console.log('\n✅ Done!');
}

main()
  .catch((e) => {
    console.error('❌ Failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

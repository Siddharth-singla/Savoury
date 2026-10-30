/*
  Warnings:

  - You are about to drop the column `qrSecret` on the `users` table. All the data in the column will be lost.
  - You are about to drop the `billing_cycles` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `bills` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "billing_cycles" DROP CONSTRAINT "billing_cycles_messId_fkey";

-- DropForeignKey
ALTER TABLE "bills" DROP CONSTRAINT "bills_cycleId_fkey";

-- DropForeignKey
ALTER TABLE "bills" DROP CONSTRAINT "bills_studentId_fkey";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "qrSecret";

-- DropTable
DROP TABLE "billing_cycles";

-- DropTable
DROP TABLE "bills";

-- DropEnum
DROP TYPE "BillingCycleStatus";

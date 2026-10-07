-- AlterEnum
-- Adds two new hostel-admin roles. In PostgreSQL, enum values added via
-- ALTER TYPE ... ADD VALUE cannot be used in the same transaction that adds
-- them, so each value is added in its own statement. Prisma runs these
-- outside an explicit transaction.
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'CO_WARDEN';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'CARETAKER';

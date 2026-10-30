-- Records schema changes that were applied to the database with `prisma db push`
-- but never captured as a migration (meal opt-outs, system config, fee plan
-- semester end date). Written to be idempotent: on a database that already
-- has these objects it does nothing; on a fresh database it creates them.

-- AlterTable
ALTER TABLE "hostel_fee_plans" ADD COLUMN IF NOT EXISTS "semesterEndDate" DATE;

-- CreateTable
CREATE TABLE IF NOT EXISTS "meal_opt_outs" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meal_opt_outs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "system_config" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_config_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "meal_opt_outs_studentId_date_idx" ON "meal_opt_outs"("studentId", "date");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "meal_opt_outs_studentId_date_key" ON "meal_opt_outs"("studentId", "date");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'meal_opt_outs_studentId_fkey') THEN
    ALTER TABLE "meal_opt_outs" ADD CONSTRAINT "meal_opt_outs_studentId_fkey"
      FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

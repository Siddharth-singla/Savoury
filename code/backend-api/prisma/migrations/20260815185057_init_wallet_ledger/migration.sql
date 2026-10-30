-- CreateEnum
CREATE TYPE "Role" AS ENUM ('STUDENT', 'MESS_COMMITTEE', 'WARDEN_ADMIN', 'COUNTER_STAFF', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('OPTED_IN', 'OPTED_OUT', 'LOCKED');

-- CreateEnum
CREATE TYPE "AttendanceResult" AS ENUM ('SERVED', 'DUPLICATE', 'OVERRIDE');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('TOPUP', 'MEAL_DEDUCTION', 'CASHOUT', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "CashoutStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'PAID');

-- CreateEnum
CREATE TYPE "BillingCycleStatus" AS ENUM ('OPEN', 'CLOSED', 'FINALIZED');

-- CreateEnum
CREATE TYPE "MealSlot" AS ENUM ('BREAKFAST', 'LUNCH', 'DINNER');

-- CreateTable
CREATE TABLE "hostels" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hostels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hostel_fee_plans" (
    "id" TEXT NOT NULL,
    "hostelId" TEXT NOT NULL,
    "semesterLabel" TEXT NOT NULL,
    "totalFee" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hostel_fee_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "hostelId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rollNo" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'STUDENT',
    "hostelId" TEXT,
    "qrSecret" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meal_types" (
    "id" TEXT NOT NULL,
    "slot" "MealSlot" NOT NULL,
    "displayName" TEXT NOT NULL,
    "defaultCutoffTime" TEXT NOT NULL,
    "servingStart" TEXT NOT NULL,
    "servingEnd" TEXT NOT NULL,
    "perMealRate" DECIMAL(8,2) NOT NULL,

    CONSTRAINT "meal_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menus" (
    "id" TEXT NOT NULL,
    "messId" TEXT NOT NULL,
    "mealTypeId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "items" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "menus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "mealTypeId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'OPTED_IN',
    "lockedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "checkedInAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checkedInById" TEXT,
    "result" "AttendanceResult" NOT NULL DEFAULT 'SERVED',
    "overrideReason" TEXT,

    CONSTRAINT "attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_cycles" (
    "id" TEXT NOT NULL,
    "messId" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "baseFee" DECIMAL(10,2) NOT NULL,
    "status" "BillingCycleStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "billing_cycles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bills" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "totalMeals" INTEGER NOT NULL,
    "optedOutCount" INTEGER NOT NULL,
    "noShowCount" INTEGER NOT NULL,
    "baseFee" DECIMAL(10,2) NOT NULL,
    "creditAmount" DECIMAL(10,2) NOT NULL,
    "guestCharges" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "adjustments" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "adjustmentNote" TEXT,
    "finalAmount" DECIMAL(10,2) NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guest_meals" (
    "id" TEXT NOT NULL,
    "bookedById" TEXT NOT NULL,
    "mealTypeId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "guestName" TEXT NOT NULL,
    "rateCharged" DECIMAL(8,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guest_meals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedback" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "menuId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notices" (
    "id" TEXT NOT NULL,
    "postedById" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "targetRole" "Role",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "oldValue" JSONB,
    "newValue" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_accounts" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "balance" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "semesterLabel" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallet_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_transactions" (
    "id" TEXT NOT NULL,
    "walletAccountId" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "relatedAttendanceId" TEXT,
    "relatedCashoutRequestId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallet_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cashout_requests" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "semesterLabel" TEXT NOT NULL,
    "requestedAmount" DECIMAL(10,2) NOT NULL,
    "status" "CashoutStatus" NOT NULL DEFAULT 'PENDING',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "resolvedById" TEXT,
    "resolutionNote" TEXT,

    CONSTRAINT "cashout_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "hostel_fee_plans_hostelId_semesterLabel_key" ON "hostel_fee_plans"("hostelId", "semesterLabel");

-- CreateIndex
CREATE UNIQUE INDEX "messes_hostelId_key" ON "messes"("hostelId");

-- CreateIndex
CREATE UNIQUE INDEX "users_rollNo_key" ON "users"("rollNo");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_hostelId_role_idx" ON "users"("hostelId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "meal_types_slot_key" ON "meal_types"("slot");

-- CreateIndex
CREATE INDEX "menus_date_idx" ON "menus"("date");

-- CreateIndex
CREATE UNIQUE INDEX "menus_messId_mealTypeId_date_key" ON "menus"("messId", "mealTypeId", "date");

-- CreateIndex
CREATE INDEX "bookings_mealTypeId_date_status_idx" ON "bookings"("mealTypeId", "date", "status");

-- CreateIndex
CREATE INDEX "bookings_studentId_date_idx" ON "bookings"("studentId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_studentId_mealTypeId_date_key" ON "bookings"("studentId", "mealTypeId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_bookingId_key" ON "attendance"("bookingId");

-- CreateIndex
CREATE INDEX "attendance_checkedInAt_idx" ON "attendance"("checkedInAt");

-- CreateIndex
CREATE UNIQUE INDEX "billing_cycles_messId_startDate_endDate_key" ON "billing_cycles"("messId", "startDate", "endDate");

-- CreateIndex
CREATE UNIQUE INDEX "bills_studentId_cycleId_key" ON "bills"("studentId", "cycleId");

-- CreateIndex
CREATE INDEX "guest_meals_bookedById_date_idx" ON "guest_meals"("bookedById", "date");

-- CreateIndex
CREATE UNIQUE INDEX "feedback_studentId_menuId_key" ON "feedback"("studentId", "menuId");

-- CreateIndex
CREATE INDEX "audit_logs_entity_entityId_idx" ON "audit_logs"("entity", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_actorId_timestamp_idx" ON "audit_logs"("actorId", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_accounts_studentId_semesterLabel_key" ON "wallet_accounts"("studentId", "semesterLabel");

-- CreateIndex
CREATE INDEX "wallet_transactions_walletAccountId_createdAt_idx" ON "wallet_transactions"("walletAccountId", "createdAt");

-- AddForeignKey
ALTER TABLE "hostel_fee_plans" ADD CONSTRAINT "hostel_fee_plans_hostelId_fkey" FOREIGN KEY ("hostelId") REFERENCES "hostels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messes" ADD CONSTRAINT "messes_hostelId_fkey" FOREIGN KEY ("hostelId") REFERENCES "hostels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_hostelId_fkey" FOREIGN KEY ("hostelId") REFERENCES "hostels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menus" ADD CONSTRAINT "menus_messId_fkey" FOREIGN KEY ("messId") REFERENCES "messes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menus" ADD CONSTRAINT "menus_mealTypeId_fkey" FOREIGN KEY ("mealTypeId") REFERENCES "meal_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_mealTypeId_fkey" FOREIGN KEY ("mealTypeId") REFERENCES "meal_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_checkedInById_fkey" FOREIGN KEY ("checkedInById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_cycles" ADD CONSTRAINT "billing_cycles_messId_fkey" FOREIGN KEY ("messId") REFERENCES "messes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bills" ADD CONSTRAINT "bills_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bills" ADD CONSTRAINT "bills_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "billing_cycles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guest_meals" ADD CONSTRAINT "guest_meals_bookedById_fkey" FOREIGN KEY ("bookedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guest_meals" ADD CONSTRAINT "guest_meals_mealTypeId_fkey" FOREIGN KEY ("mealTypeId") REFERENCES "meal_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_menuId_fkey" FOREIGN KEY ("menuId") REFERENCES "menus"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notices" ADD CONSTRAINT "notices_postedById_fkey" FOREIGN KEY ("postedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_accounts" ADD CONSTRAINT "wallet_accounts_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_walletAccountId_fkey" FOREIGN KEY ("walletAccountId") REFERENCES "wallet_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cashout_requests" ADD CONSTRAINT "cashout_requests_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cashout_requests" ADD CONSTRAINT "cashout_requests_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

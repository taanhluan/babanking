-- CreateEnum
CREATE TYPE "BaLevel" AS ENUM ('FRESHER', 'JUNIOR', 'MIDDLE', 'SENIOR', 'PRINCIPAL');

-- CreateEnum
CREATE TYPE "BaBillableStatus" AS ENUM ('BILLABLE', 'PARTIAL_BILLABLE', 'NON_BILLABLE');

-- CreateEnum
CREATE TYPE "BaPerformanceRating" AS ENUM ('OUTSTANDING', 'EXCELLENT', 'GOOD', 'NEEDS_IMPROVEMENT', 'UNDERPERFORMING');

-- CreateEnum
CREATE TYPE "BaRiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateTable
CREATE TABLE "BaTeamProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "level" "BaLevel",
    "capacityPercent" INTEGER NOT NULL DEFAULT 100,
    "hoursPerWeek" INTEGER NOT NULL DEFAULT 40,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BaTeamProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BaCustomer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isInternal" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BaCustomer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BaProject" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "defaultBillableStatus" "BaBillableStatus" NOT NULL DEFAULT 'BILLABLE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BaProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BaProjectRole" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BaProjectRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BaAllocation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "percent" INTEGER NOT NULL,
    "billableStatus" "BaBillableStatus" NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "cancelledAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "performance" "BaPerformanceRating",
    "risk" "BaRiskLevel",
    "managerRemark" TEXT,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BaAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BaTeamProfile_userId_key" ON "BaTeamProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "BaCustomer_name_key" ON "BaCustomer"("name");

-- CreateIndex
CREATE UNIQUE INDEX "BaProject_customerId_name_key" ON "BaProject"("customerId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "BaProjectRole_name_key" ON "BaProjectRole"("name");

-- CreateIndex
CREATE INDEX "BaAllocation_userId_deletedAt_idx" ON "BaAllocation"("userId", "deletedAt");

-- CreateIndex
CREATE INDEX "BaAllocation_projectId_idx" ON "BaAllocation"("projectId");

-- AddForeignKey
ALTER TABLE "BaTeamProfile" ADD CONSTRAINT "BaTeamProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BaProject" ADD CONSTRAINT "BaProject_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "BaCustomer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BaAllocation" ADD CONSTRAINT "BaAllocation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BaAllocation" ADD CONSTRAINT "BaAllocation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "BaProject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BaAllocation" ADD CONSTRAINT "BaAllocation_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "BaProjectRole"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BaAllocation" ADD CONSTRAINT "BaAllocation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BaAllocation" ADD CONSTRAINT "BaAllocation_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

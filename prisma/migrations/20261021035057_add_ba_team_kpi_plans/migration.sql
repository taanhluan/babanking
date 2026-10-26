-- CreateEnum
CREATE TYPE "BaPlanStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'CHANGES_REQUESTED', 'APPROVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "BaQuarterStatus" AS ENUM ('KPI_DRAFT', 'KPI_PENDING', 'IN_PROGRESS', 'RESULTS_SUBMITTED', 'REVIEWED');

-- CreateEnum
CREATE TYPE "KpiComparator" AS ENUM ('GTE', 'LTE');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isBaTeamMember" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "BaPerformancePlan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "status" "BaPlanStatus" NOT NULL DEFAULT 'DRAFT',
    "profileJson" TEXT NOT NULL,
    "approvedSnapshotJson" TEXT,
    "managerNotesJson" TEXT,
    "reviewNote" TEXT,
    "submittedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "annualOutcomesJson" TEXT,
    "annualRating" INTEGER,
    "annualAssessment" TEXT,
    "annualReviewedAt" TIMESTAMP(3),
    "annualReviewedById" TEXT,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BaPerformancePlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BaPlanQuarter" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "quarter" INTEGER NOT NULL,
    "status" "BaQuarterStatus" NOT NULL DEFAULT 'KPI_DRAFT',
    "changeNote" TEXT,
    "returnNote" TEXT,
    "kpiSubmittedAt" TIMESTAMP(3),
    "kpiApprovedAt" TIMESTAMP(3),
    "kpiApprovedById" TEXT,
    "resultsSubmittedAt" TIMESTAMP(3),
    "reviewRating" INTEGER,
    "reviewAssessment" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BaPlanQuarter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BaQuarterKpi" (
    "id" TEXT NOT NULL,
    "quarterId" TEXT NOT NULL,
    "lineageKey" TEXT NOT NULL,
    "templateId" TEXT,
    "capabilityArea" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "comparator" "KpiComparator" NOT NULL,
    "targetValue" DOUBLE PRECISION NOT NULL,
    "unitLabel" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "actualValue" DOUBLE PRECISION,
    "memberNote" TEXT,
    "evidenceUrl" TEXT,
    "leadComment" TEXT,
    "removedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BaQuarterKpi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BaKpiProgressLog" (
    "id" TEXT NOT NULL,
    "kpiId" TEXT NOT NULL,
    "previousValue" DOUBLE PRECISION,
    "newValue" DOUBLE PRECISION NOT NULL,
    "note" TEXT,
    "evidenceUrl" TEXT,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BaKpiProgressLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BaKpiAdjustment" (
    "id" TEXT NOT NULL,
    "quarterId" TEXT NOT NULL,
    "lineageKey" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "beforeJson" TEXT,
    "afterJson" TEXT,
    "reason" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BaKpiAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BaKpiTemplate" (
    "id" TEXT NOT NULL,
    "capabilityArea" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "comparator" "KpiComparator" NOT NULL,
    "defaultTarget" DOUBLE PRECISION NOT NULL,
    "unitLabel" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BaKpiTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BaPerformancePlan_year_status_idx" ON "BaPerformancePlan"("year", "status");

-- CreateIndex
CREATE UNIQUE INDEX "BaPerformancePlan_userId_year_key" ON "BaPerformancePlan"("userId", "year");

-- CreateIndex
CREATE INDEX "BaPlanQuarter_status_idx" ON "BaPlanQuarter"("status");

-- CreateIndex
CREATE UNIQUE INDEX "BaPlanQuarter_planId_quarter_key" ON "BaPlanQuarter"("planId", "quarter");

-- CreateIndex
CREATE UNIQUE INDEX "BaQuarterKpi_quarterId_lineageKey_key" ON "BaQuarterKpi"("quarterId", "lineageKey");

-- CreateIndex
CREATE INDEX "BaKpiProgressLog_kpiId_createdAt_idx" ON "BaKpiProgressLog"("kpiId", "createdAt");

-- CreateIndex
CREATE INDEX "BaKpiAdjustment_quarterId_createdAt_idx" ON "BaKpiAdjustment"("quarterId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "BaKpiTemplate_name_key" ON "BaKpiTemplate"("name");

-- AddForeignKey
ALTER TABLE "BaPerformancePlan" ADD CONSTRAINT "BaPerformancePlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BaPerformancePlan" ADD CONSTRAINT "BaPerformancePlan_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BaPerformancePlan" ADD CONSTRAINT "BaPerformancePlan_annualReviewedById_fkey" FOREIGN KEY ("annualReviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BaPlanQuarter" ADD CONSTRAINT "BaPlanQuarter_planId_fkey" FOREIGN KEY ("planId") REFERENCES "BaPerformancePlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BaPlanQuarter" ADD CONSTRAINT "BaPlanQuarter_kpiApprovedById_fkey" FOREIGN KEY ("kpiApprovedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BaPlanQuarter" ADD CONSTRAINT "BaPlanQuarter_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BaQuarterKpi" ADD CONSTRAINT "BaQuarterKpi_quarterId_fkey" FOREIGN KEY ("quarterId") REFERENCES "BaPlanQuarter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BaQuarterKpi" ADD CONSTRAINT "BaQuarterKpi_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "BaKpiTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BaKpiProgressLog" ADD CONSTRAINT "BaKpiProgressLog_kpiId_fkey" FOREIGN KEY ("kpiId") REFERENCES "BaQuarterKpi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BaKpiProgressLog" ADD CONSTRAINT "BaKpiProgressLog_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BaKpiAdjustment" ADD CONSTRAINT "BaKpiAdjustment_quarterId_fkey" FOREIGN KEY ("quarterId") REFERENCES "BaPlanQuarter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BaKpiAdjustment" ADD CONSTRAINT "BaKpiAdjustment_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

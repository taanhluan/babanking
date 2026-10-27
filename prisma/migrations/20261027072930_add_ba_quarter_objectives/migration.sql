-- AlterTable
ALTER TABLE "BaQuarterKpi" ADD COLUMN     "objectiveId" TEXT;

-- CreateTable
CREATE TABLE "BaQuarterObjective" (
    "id" TEXT NOT NULL,
    "quarterId" TEXT NOT NULL,
    "lineageKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "specific" TEXT NOT NULL DEFAULT '',
    "achievable" TEXT NOT NULL DEFAULT '',
    "relevant" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BaQuarterObjective_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BaQuarterObjective_quarterId_lineageKey_key" ON "BaQuarterObjective"("quarterId", "lineageKey");

-- CreateIndex
CREATE INDEX "BaQuarterKpi_objectiveId_idx" ON "BaQuarterKpi"("objectiveId");

-- AddForeignKey
ALTER TABLE "BaQuarterKpi" ADD CONSTRAINT "BaQuarterKpi_objectiveId_fkey" FOREIGN KEY ("objectiveId") REFERENCES "BaQuarterObjective"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BaQuarterObjective" ADD CONSTRAINT "BaQuarterObjective_quarterId_fkey" FOREIGN KEY ("quarterId") REFERENCES "BaPlanQuarter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

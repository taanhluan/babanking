CREATE TABLE "RevisionModule" (
  "id" TEXT NOT NULL,
  "contentRevisionId" TEXT NOT NULL,
  "stableKey" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "isArchived" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RevisionModule_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "RevisionSection" (
  "id" TEXT NOT NULL,
  "revisionModuleId" TEXT NOT NULL,
  "stableKey" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "isArchived" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RevisionSection_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "RevisionBlock" (
  "id" TEXT NOT NULL,
  "revisionSectionId" TEXT NOT NULL,
  "blockType" TEXT NOT NULL,
  "schemaVersion" INTEGER NOT NULL DEFAULT 1,
  "payload" JSONB NOT NULL,
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "isArchived" BOOLEAN NOT NULL DEFAULT false,
  "assetId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RevisionBlock_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "RevisionModule_contentRevisionId_stableKey_key" ON "RevisionModule"("contentRevisionId", "stableKey");
CREATE INDEX "RevisionModule_contentRevisionId_displayOrder_idx" ON "RevisionModule"("contentRevisionId", "displayOrder");
CREATE UNIQUE INDEX "RevisionSection_revisionModuleId_stableKey_key" ON "RevisionSection"("revisionModuleId", "stableKey");
CREATE INDEX "RevisionSection_revisionModuleId_displayOrder_idx" ON "RevisionSection"("revisionModuleId", "displayOrder");
CREATE INDEX "RevisionBlock_revisionSectionId_displayOrder_idx" ON "RevisionBlock"("revisionSectionId", "displayOrder");
CREATE INDEX "RevisionBlock_blockType_idx" ON "RevisionBlock"("blockType");
ALTER TABLE "RevisionModule" ADD CONSTRAINT "RevisionModule_contentRevisionId_fkey" FOREIGN KEY ("contentRevisionId") REFERENCES "ContentRevision"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RevisionSection" ADD CONSTRAINT "RevisionSection_revisionModuleId_fkey" FOREIGN KEY ("revisionModuleId") REFERENCES "RevisionModule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RevisionBlock" ADD CONSTRAINT "RevisionBlock_revisionSectionId_fkey" FOREIGN KEY ("revisionSectionId") REFERENCES "RevisionSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RevisionBlock" ADD CONSTRAINT "RevisionBlock_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "JourneyAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

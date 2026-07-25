-- CreateTable
CREATE TABLE "JourneyModule" (
    "id" TEXT NOT NULL,
    "contentItemId" TEXT NOT NULL,
    "stableKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JourneyModule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JourneySection" (
    "id" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "stableKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JourneySection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JourneyBlock" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "blockType" TEXT NOT NULL,
    "schemaVersion" INTEGER NOT NULL DEFAULT 1,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "payloadJson" TEXT NOT NULL,
    "assetId" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JourneyBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JourneyAsset" (
    "id" TEXT NOT NULL,
    "contentItemId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "checksum" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JourneyAsset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "JourneyModule_contentItemId_displayOrder_idx" ON "JourneyModule"("contentItemId", "displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "JourneyModule_contentItemId_stableKey_key" ON "JourneyModule"("contentItemId", "stableKey");

-- CreateIndex
CREATE INDEX "JourneySection_moduleId_displayOrder_idx" ON "JourneySection"("moduleId", "displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "JourneySection_moduleId_stableKey_key" ON "JourneySection"("moduleId", "stableKey");

-- CreateIndex
CREATE INDEX "JourneyBlock_sectionId_displayOrder_idx" ON "JourneyBlock"("sectionId", "displayOrder");

-- CreateIndex
CREATE INDEX "JourneyBlock_blockType_idx" ON "JourneyBlock"("blockType");

-- CreateIndex
CREATE UNIQUE INDEX "JourneyAsset_storageKey_key" ON "JourneyAsset"("storageKey");

-- CreateIndex
CREATE INDEX "JourneyAsset_contentItemId_status_idx" ON "JourneyAsset"("contentItemId", "status");

-- CreateIndex
CREATE INDEX "JourneyAsset_mimeType_idx" ON "JourneyAsset"("mimeType");

-- AddForeignKey
ALTER TABLE "JourneyModule" ADD CONSTRAINT "JourneyModule_contentItemId_fkey" FOREIGN KEY ("contentItemId") REFERENCES "ContentItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JourneySection" ADD CONSTRAINT "JourneySection_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "JourneyModule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JourneyBlock" ADD CONSTRAINT "JourneyBlock_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "JourneySection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JourneyBlock" ADD CONSTRAINT "JourneyBlock_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "JourneyAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JourneyAsset" ADD CONSTRAINT "JourneyAsset_contentItemId_fkey" FOREIGN KEY ("contentItemId") REFERENCES "ContentItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JourneyAsset" ADD CONSTRAINT "JourneyAsset_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

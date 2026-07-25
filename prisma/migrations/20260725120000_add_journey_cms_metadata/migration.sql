ALTER TABLE "ContentItem"
  ADD COLUMN "description" TEXT,
  ADD COLUMN "category" TEXT,
  ADD COLUMN "journeyType" TEXT,
  ADD COLUMN "tagsJson" TEXT,
  ADD COLUMN "displayOrder" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "seoTitle" TEXT,
  ADD COLUMN "seoDescription" TEXT,
  ADD COLUMN "heroImageMetadataJson" TEXT;

CREATE INDEX "ContentItem_type_displayOrder_idx" ON "ContentItem"("type", "displayOrder");

ALTER TABLE "JourneyModule" ADD COLUMN "description" TEXT;

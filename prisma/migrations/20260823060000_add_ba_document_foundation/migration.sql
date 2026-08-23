ALTER TYPE "ContentType" ADD VALUE 'BA_DOCUMENT';

ALTER TABLE "ContentItem"
ADD COLUMN "primaryJourneyContentItemId" TEXT;

CREATE INDEX "ContentItem_primaryJourneyContentItemId_type_isArchived_idx"
ON "ContentItem"("primaryJourneyContentItemId", "type", "isArchived");

ALTER TABLE "ContentItem"
ADD CONSTRAINT "ContentItem_primaryJourneyContentItemId_fkey"
FOREIGN KEY ("primaryJourneyContentItemId") REFERENCES "ContentItem"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

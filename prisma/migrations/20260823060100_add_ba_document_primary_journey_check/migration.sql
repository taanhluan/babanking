ALTER TABLE "ContentItem"
ADD CONSTRAINT "ContentItem_ba_document_primary_journey_check"
CHECK (
  ("type" = 'BA_DOCUMENT' AND "primaryJourneyContentItemId" IS NOT NULL)
  OR
  ("type" <> 'BA_DOCUMENT' AND "primaryJourneyContentItemId" IS NULL)
);

ALTER TABLE "ContentItem" ADD COLUMN "stableKey" TEXT;
CREATE TABLE "MembershipPlanTranslation" (
  "id" TEXT NOT NULL PRIMARY KEY, "planId" TEXT NOT NULL, "locale" TEXT NOT NULL,
  "name" TEXT NOT NULL, "description" TEXT NOT NULL, "featuresJson" TEXT NOT NULL DEFAULT '[]',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "MembershipPlanTranslation_planId_fkey" FOREIGN KEY ("planId") REFERENCES "MembershipPlan" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "ContentTranslation" (
  "id" TEXT NOT NULL PRIMARY KEY, "contentItemId" TEXT NOT NULL, "locale" TEXT NOT NULL,
  "slug" TEXT NOT NULL, "title" TEXT NOT NULL, "summary" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'NOT_STARTED', "ownerId" TEXT, "publishedRevisionId" TEXT,
  "sourceUpdatedAt" DATETIME, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "ContentTranslation_contentItemId_fkey" FOREIGN KEY ("contentItemId") REFERENCES "ContentItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ContentTranslation_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "ContentTranslation_publishedRevisionId_fkey" FOREIGN KEY ("publishedRevisionId") REFERENCES "TranslationRevision" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE "TranslationRevision" (
  "id" TEXT NOT NULL PRIMARY KEY, "contentTranslationId" TEXT NOT NULL, "version" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT', "contentJson" TEXT NOT NULL, "schemaVersion" INTEGER NOT NULL DEFAULT 1,
  "authorId" TEXT, "reviewerId" TEXT, "reviewNote" TEXT, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL, "submittedAt" DATETIME, "reviewedAt" DATETIME, "publishedAt" DATETIME,
  CONSTRAINT "TranslationRevision_contentTranslationId_fkey" FOREIGN KEY ("contentTranslationId") REFERENCES "ContentTranslation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "TranslationRevision_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "TranslationRevision_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AccessRequest" (
  "id" TEXT NOT NULL PRIMARY KEY, "name" TEXT NOT NULL, "email" TEXT NOT NULL, "organization" TEXT,
  "jobTitle" TEXT NOT NULL, "currentBALevel" TEXT, "primaryInterest" TEXT NOT NULL, "professionalObjective" TEXT NOT NULL,
  "requestedPlanId" TEXT, "status" TEXT NOT NULL DEFAULT 'NEW', "consentAccepted" BOOLEAN NOT NULL,
  "preferredLocale" TEXT NOT NULL DEFAULT 'en', "adminNote" TEXT, "rejectionReason" TEXT, "contactedAt" DATETIME,
  "convertedUserId" TEXT, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "AccessRequest_requestedPlanId_fkey" FOREIGN KEY ("requestedPlanId") REFERENCES "MembershipPlan" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "AccessRequest_convertedUserId_fkey" FOREIGN KEY ("convertedUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_AccessRequest" ("adminNote","consentAccepted","contactedAt","convertedUserId","createdAt","currentBALevel","email","id","jobTitle","name","organization","primaryInterest","professionalObjective","rejectionReason","requestedPlanId","status","updatedAt")
SELECT "adminNote","consentAccepted","contactedAt","convertedUserId","createdAt","currentBALevel","email","id","jobTitle","name","organization","primaryInterest","professionalObjective","rejectionReason","requestedPlanId","status","updatedAt" FROM "AccessRequest";
DROP TABLE "AccessRequest";
ALTER TABLE "new_AccessRequest" RENAME TO "AccessRequest";
CREATE INDEX "AccessRequest_email_createdAt_idx" ON "AccessRequest"("email","createdAt");
CREATE INDEX "AccessRequest_status_createdAt_idx" ON "AccessRequest"("status","createdAt");
CREATE TABLE "new_User" (
  "id" TEXT NOT NULL PRIMARY KEY, "name" TEXT NOT NULL, "email" TEXT NOT NULL, "passwordHash" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'MEMBER', "isActive" BOOLEAN NOT NULL DEFAULT true, "accountStatus" TEXT NOT NULL DEFAULT 'ACTIVE',
  "preferredLocale" TEXT NOT NULL DEFAULT 'en', "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL, "lastLoginAt" DATETIME
);
INSERT INTO "new_User" ("accountStatus","createdAt","email","id","isActive","lastLoginAt","name","passwordHash","role","updatedAt")
SELECT "accountStatus","createdAt","email","id","isActive","lastLoginAt","name","passwordHash","role","updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_email_idx" ON "User"("email");
CREATE INDEX "User_role_isActive_idx" ON "User"("role","isActive");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
CREATE INDEX "MembershipPlanTranslation_locale_idx" ON "MembershipPlanTranslation"("locale");
CREATE UNIQUE INDEX "MembershipPlanTranslation_planId_locale_key" ON "MembershipPlanTranslation"("planId","locale");
CREATE UNIQUE INDEX "ContentTranslation_publishedRevisionId_key" ON "ContentTranslation"("publishedRevisionId");
CREATE INDEX "ContentTranslation_locale_status_idx" ON "ContentTranslation"("locale","status");
CREATE INDEX "ContentTranslation_ownerId_status_idx" ON "ContentTranslation"("ownerId","status");
CREATE UNIQUE INDEX "ContentTranslation_contentItemId_locale_key" ON "ContentTranslation"("contentItemId","locale");
CREATE UNIQUE INDEX "ContentTranslation_locale_slug_key" ON "ContentTranslation"("locale","slug");
CREATE INDEX "TranslationRevision_status_submittedAt_idx" ON "TranslationRevision"("status","submittedAt");
CREATE INDEX "TranslationRevision_authorId_status_idx" ON "TranslationRevision"("authorId","status");
CREATE UNIQUE INDEX "TranslationRevision_contentTranslationId_version_key" ON "TranslationRevision"("contentTranslationId","version");
CREATE UNIQUE INDEX "ContentItem_stableKey_key" ON "ContentItem"("stableKey");

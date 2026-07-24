-- CreateEnum
CREATE TYPE "KnowledgePermission" AS ENUM ('VIEW', 'CREATE', 'EDIT', 'REVIEW', 'PUBLISH', 'MANAGE');

-- CreateEnum
CREATE TYPE "GrantEffect" AS ENUM ('ALLOW', 'DENY');

-- CreateEnum
CREATE TYPE "GrantStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'REVOKED');

-- CreateEnum
CREATE TYPE "PackageAssignmentStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'REVOKED');

-- CreateEnum
CREATE TYPE "KnowledgeScopeType" AS ENUM ('BANKING_DOMAIN', 'BA_PRACTICE', 'CAREER', 'CUSTOM');

-- CreateEnum
CREATE TYPE "ContentAccessMode" AS ENUM ('ANY_SCOPE', 'ALL_SCOPES', 'CONTENT_GRANT_ONLY');

-- CreateEnum
CREATE TYPE "ContentScopeRelationship" AS ENUM ('PRIMARY', 'SECONDARY', 'SUPPORTING');

-- AlterTable
ALTER TABLE "ContentItem" ADD COLUMN     "accessMode" "ContentAccessMode" NOT NULL DEFAULT 'ANY_SCOPE';

-- CreateTable
CREATE TABLE "KnowledgeScope" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "KnowledgeScopeType" NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameVi" TEXT NOT NULL,
    "descriptionEn" TEXT NOT NULL,
    "descriptionVi" TEXT NOT NULL,
    "parentId" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KnowledgeScope_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentKnowledgeScope" (
    "id" TEXT NOT NULL,
    "contentItemId" TEXT NOT NULL,
    "knowledgeScopeId" TEXT NOT NULL,
    "relationshipType" "ContentScopeRelationship" NOT NULL DEFAULT 'PRIMARY',
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentKnowledgeScope_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserScopeGrant" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "knowledgeScopeId" TEXT NOT NULL,
    "permission" "KnowledgePermission" NOT NULL,
    "effect" "GrantEffect" NOT NULL DEFAULT 'ALLOW',
    "status" "GrantStatus" NOT NULL DEFAULT 'ACTIVE',
    "startsAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "grantedById" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "revokedById" TEXT,

    CONSTRAINT "UserScopeGrant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserContentGrant" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contentItemId" TEXT NOT NULL,
    "permission" "KnowledgePermission" NOT NULL,
    "effect" "GrantEffect" NOT NULL DEFAULT 'ALLOW',
    "status" "GrantStatus" NOT NULL DEFAULT 'ACTIVE',
    "startsAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "grantedById" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "revokedById" TEXT,

    CONSTRAINT "UserContentGrant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgePackage" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameVi" TEXT NOT NULL,
    "descriptionEn" TEXT NOT NULL,
    "descriptionVi" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KnowledgePackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgePackagePermission" (
    "id" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "knowledgeScopeId" TEXT NOT NULL,
    "permission" "KnowledgePermission" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KnowledgePackagePermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserKnowledgePackageAssignment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "status" "PackageAssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "startsAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "assignedById" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "revokedById" TEXT,

    CONSTRAINT "UserKnowledgePackageAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeScope_code_key" ON "KnowledgeScope"("code");

-- CreateIndex
CREATE INDEX "KnowledgeScope_isActive_displayOrder_idx" ON "KnowledgeScope"("isActive", "displayOrder");

-- CreateIndex
CREATE INDEX "KnowledgeScope_parentId_idx" ON "KnowledgeScope"("parentId");

-- CreateIndex
CREATE INDEX "ContentKnowledgeScope_contentItemId_idx" ON "ContentKnowledgeScope"("contentItemId");

-- CreateIndex
CREATE INDEX "ContentKnowledgeScope_knowledgeScopeId_idx" ON "ContentKnowledgeScope"("knowledgeScopeId");

-- CreateIndex
CREATE UNIQUE INDEX "ContentKnowledgeScope_contentItemId_knowledgeScopeId_key" ON "ContentKnowledgeScope"("contentItemId", "knowledgeScopeId");

-- CreateIndex
CREATE INDEX "UserScopeGrant_userId_status_startsAt_expiresAt_idx" ON "UserScopeGrant"("userId", "status", "startsAt", "expiresAt");

-- CreateIndex
CREATE INDEX "UserScopeGrant_knowledgeScopeId_status_idx" ON "UserScopeGrant"("knowledgeScopeId", "status");

-- CreateIndex
CREATE INDEX "UserScopeGrant_userId_knowledgeScopeId_permission_effect_st_idx" ON "UserScopeGrant"("userId", "knowledgeScopeId", "permission", "effect", "status");

-- CreateIndex
CREATE INDEX "UserScopeGrant_expiresAt_idx" ON "UserScopeGrant"("expiresAt");

-- CreateIndex
CREATE INDEX "UserContentGrant_userId_status_startsAt_expiresAt_idx" ON "UserContentGrant"("userId", "status", "startsAt", "expiresAt");

-- CreateIndex
CREATE INDEX "UserContentGrant_contentItemId_status_idx" ON "UserContentGrant"("contentItemId", "status");

-- CreateIndex
CREATE INDEX "UserContentGrant_userId_contentItemId_permission_effect_sta_idx" ON "UserContentGrant"("userId", "contentItemId", "permission", "effect", "status");

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgePackage_code_key" ON "KnowledgePackage"("code");

-- CreateIndex
CREATE INDEX "KnowledgePackage_isActive_displayOrder_idx" ON "KnowledgePackage"("isActive", "displayOrder");

-- CreateIndex
CREATE INDEX "KnowledgePackagePermission_knowledgeScopeId_idx" ON "KnowledgePackagePermission"("knowledgeScopeId");

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgePackagePermission_packageId_knowledgeScopeId_permi_key" ON "KnowledgePackagePermission"("packageId", "knowledgeScopeId", "permission");

-- CreateIndex
CREATE INDEX "UserKnowledgePackageAssignment_userId_status_startsAt_expir_idx" ON "UserKnowledgePackageAssignment"("userId", "status", "startsAt", "expiresAt");

-- CreateIndex
CREATE INDEX "UserKnowledgePackageAssignment_packageId_status_idx" ON "UserKnowledgePackageAssignment"("packageId", "status");

-- CreateIndex
CREATE INDEX "UserKnowledgePackageAssignment_userId_packageId_status_idx" ON "UserKnowledgePackageAssignment"("userId", "packageId", "status");

-- CreateIndex
CREATE INDEX "ContentItem_accessMode_idx" ON "ContentItem"("accessMode");

-- AddForeignKey
ALTER TABLE "KnowledgeScope" ADD CONSTRAINT "KnowledgeScope_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "KnowledgeScope"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentKnowledgeScope" ADD CONSTRAINT "ContentKnowledgeScope_contentItemId_fkey" FOREIGN KEY ("contentItemId") REFERENCES "ContentItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentKnowledgeScope" ADD CONSTRAINT "ContentKnowledgeScope_knowledgeScopeId_fkey" FOREIGN KEY ("knowledgeScopeId") REFERENCES "KnowledgeScope"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserScopeGrant" ADD CONSTRAINT "UserScopeGrant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserScopeGrant" ADD CONSTRAINT "UserScopeGrant_knowledgeScopeId_fkey" FOREIGN KEY ("knowledgeScopeId") REFERENCES "KnowledgeScope"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserScopeGrant" ADD CONSTRAINT "UserScopeGrant_grantedById_fkey" FOREIGN KEY ("grantedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserScopeGrant" ADD CONSTRAINT "UserScopeGrant_revokedById_fkey" FOREIGN KEY ("revokedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserContentGrant" ADD CONSTRAINT "UserContentGrant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserContentGrant" ADD CONSTRAINT "UserContentGrant_contentItemId_fkey" FOREIGN KEY ("contentItemId") REFERENCES "ContentItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserContentGrant" ADD CONSTRAINT "UserContentGrant_grantedById_fkey" FOREIGN KEY ("grantedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserContentGrant" ADD CONSTRAINT "UserContentGrant_revokedById_fkey" FOREIGN KEY ("revokedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgePackagePermission" ADD CONSTRAINT "KnowledgePackagePermission_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "KnowledgePackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgePackagePermission" ADD CONSTRAINT "KnowledgePackagePermission_knowledgeScopeId_fkey" FOREIGN KEY ("knowledgeScopeId") REFERENCES "KnowledgeScope"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserKnowledgePackageAssignment" ADD CONSTRAINT "UserKnowledgePackageAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserKnowledgePackageAssignment" ADD CONSTRAINT "UserKnowledgePackageAssignment_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "KnowledgePackage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserKnowledgePackageAssignment" ADD CONSTRAINT "UserKnowledgePackageAssignment_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserKnowledgePackageAssignment" ADD CONSTRAINT "UserKnowledgePackageAssignment_revokedById_fkey" FOREIGN KEY ("revokedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

import { createHash } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { bankingJourneyContent } from '../src/data/content';
import {
  assertDatabaseOperationAllowed,
  parseServerEnvironment,
} from '../src/server/environment-core';
import { loadEnvironmentFiles } from './load-environment-files';
import { mapLegacyJourney } from './legacy-journey-mapping';

loadEnvironmentFiles();

const environment = parseServerEnvironment(process.env, { requireAuthSecret: false });
assertDatabaseOperationAllowed(
  environment.APP_ENV === 'preview' ? 'backfill-preview' : 'backfill-development',
  environment,
);

const adminEmail = process.env.BACKFILL_ADMIN_EMAIL?.trim().toLowerCase();
const dryRun = process.env.BACKFILL_DRY_RUN === 'true';
if (!adminEmail) throw new Error('BACKFILL_ADMIN_EMAIL is required.');

const prisma = new PrismaClient();
const records = bankingJourneyContent.map(mapLegacyJourney);

function migrationChecksum(contentJson: string) {
  try {
    const parsed = JSON.parse(contentJson) as { migration?: { checksum?: unknown } };
    return typeof parsed.migration?.checksum === 'string' ? parsed.migration.checksum : null;
  } catch {
    return null;
  }
}

function contentChecksum(contentJson: string) {
  try {
    return createHash('sha256').update(JSON.stringify(JSON.parse(contentJson))).digest('hex');
  } catch {
    return null;
  }
}

function revisionModules(record: (typeof records)[number]) {
  return {
    create: record.modules.map((module, moduleIndex) => ({
      stableKey: module.stableKey,
      title: module.title,
      description: module.description,
      displayOrder: moduleIndex,
      sections: {
        create: module.sections.map((section, sectionIndex) => ({
          stableKey: section.stableKey,
          title: section.title,
          displayOrder: sectionIndex,
          blocks: {
            create: section.blocks.map((block, blockIndex) => ({
              blockType: block.blockType,
              schemaVersion: 1,
              payload: block.payload,
              displayOrder: blockIndex,
            })),
          },
        })),
      },
    })),
  };
}

async function main() {
  if (records.length !== 10 || new Set(records.map((record) => record.slug)).size !== 10) {
    throw new Error('Backfill blocked: expected exactly 10 unique Banking Journeys.');
  }

  const admin = await prisma.user.findUnique({
    where: { email: adminEmail },
    select: { id: true, role: true, isActive: true, accountStatus: true },
  });
  if (!admin || admin.role !== 'ADMIN' || !admin.isActive || admin.accountStatus !== 'ACTIVE') {
    throw new Error('Backfill blocked: an active admin account is required.');
  }

  const existing = await prisma.contentItem.findMany({
    where: { type: 'BANKING_JOURNEY', slug: { in: records.map((record) => record.slug) } },
    select: {
      id: true,
      slug: true,
      publishedRevision: {
        select: {
          contentJson: true,
          revisionModules: { select: { id: true } },
        },
      },
    },
  });
  const existingBySlug = new Map(existing.map((item) => [item.slug, item]));
  for (const record of records) {
    const item = existingBySlug.get(record.slug);
    const publishedContentJson = item?.publishedRevision?.contentJson ?? '';
    const alreadyMigrated = migrationChecksum(publishedContentJson) === record.checksum;
    const legacyMatch = item?.publishedRevision?.revisionModules.length === 0
      && contentChecksum(publishedContentJson) === record.checksum;
    if (item && !alreadyMigrated && !legacyMatch) {
      throw new Error(`Backfill blocked: ${record.slug} already contains non-matching CMS content.`);
    }
  }

  if (dryRun) {
    console.log(`Dry run passed for ${records.length} Banking Journeys.`);
    console.log(`${existing.length} matching Journey records already exist; no data was changed.`);
    return;
  }

  const scope = await prisma.knowledgeScope.upsert({
    where: { code: 'BANKING_JOURNEYS' },
    update: {
      type: 'BANKING_DOMAIN',
      nameEn: 'Banking Journeys',
      nameVi: 'Hành trình ngân hàng',
      descriptionEn: 'Published Banking Journey knowledge.',
      descriptionVi: 'Kiến thức về hành trình ngân hàng đã xuất bản.',
      isActive: true,
    },
    create: {
      code: 'BANKING_JOURNEYS',
      type: 'BANKING_DOMAIN',
      nameEn: 'Banking Journeys',
      nameVi: 'Hành trình ngân hàng',
      descriptionEn: 'Published Banking Journey knowledge.',
      descriptionVi: 'Kiến thức về hành trình ngân hàng đã xuất bản.',
      isActive: true,
    },
  });

  let imported = 0;
  let skipped = 0;
  for (const [journeyIndex, record] of records.entries()) {
    const existingItem = existingBySlug.get(record.slug);
    if (existingItem && migrationChecksum(existingItem.publishedRevision?.contentJson ?? '') === record.checksum) {
      skipped += 1;
      continue;
    }

    await prisma.$transaction(async (transaction) => {
      if (existingItem) {
        await transaction.contentItem.update({
          where: { id: existingItem.id },
          data: {
            ownerId: admin.id,
            previewJson: JSON.stringify({ title: record.title, summary: record.summary }),
            description: record.summary,
            category: record.category,
            journeyType: 'DOMAIN_JOURNEY',
            tagsJson: JSON.stringify(record.tags),
            displayOrder: journeyIndex,
            seoTitle: record.title,
            seoDescription: record.summary,
            knowledgeScopes: {
              upsert: {
                where: {
                  contentItemId_knowledgeScopeId: {
                    contentItemId: existingItem.id,
                    knowledgeScopeId: scope.id,
                  },
                },
                update: { relationshipType: 'PRIMARY', isRequired: true },
                create: {
                  knowledgeScopeId: scope.id,
                  relationshipType: 'PRIMARY',
                  isRequired: true,
                },
              },
            },
          },
        });
        const latestRevision = await transaction.contentRevision.findFirst({
          where: { contentItemId: existingItem.id },
          orderBy: { version: 'desc' },
          select: { version: true },
        });
        const revision = await transaction.contentRevision.create({
          data: {
            contentItemId: existingItem.id,
            version: (latestRevision?.version ?? 0) + 1,
            status: 'PUBLISHED',
            schemaVersion: 1,
            contentJson: JSON.stringify(record.metadata),
            authorId: admin.id,
            reviewerId: admin.id,
            submittedAt: new Date(),
            reviewedAt: new Date(),
            publishedAt: new Date(),
            reviewNote: 'Controlled migration from the legacy Banking Journey source.',
            revisionModules: revisionModules(record),
          },
        });
        await transaction.contentItem.update({
          where: { id: existingItem.id },
          data: { publishedRevisionId: revision.id },
        });

        const english = await transaction.contentTranslation.findUnique({
          where: { contentItemId_locale: { contentItemId: existingItem.id, locale: 'en' } },
          select: { id: true },
        });
        if (english) {
          const latestTranslationRevision = await transaction.translationRevision.findFirst({
            where: { contentTranslationId: english.id },
            orderBy: { version: 'desc' },
            select: { version: true },
          });
          const translationRevision = await transaction.translationRevision.create({
            data: {
              contentTranslationId: english.id,
              version: (latestTranslationRevision?.version ?? 0) + 1,
              status: 'PUBLISHED',
              schemaVersion: 1,
              contentJson: JSON.stringify(record.metadata),
              authorId: admin.id,
              reviewerId: admin.id,
              submittedAt: new Date(),
              reviewedAt: new Date(),
              publishedAt: new Date(),
            },
          });
          await transaction.contentTranslation.update({
            where: { id: english.id },
            data: {
              title: record.title,
              summary: record.summary,
              status: 'PUBLISHED',
              publishedRevisionId: translationRevision.id,
            },
          });
        }
        await transaction.auditLog.create({
          data: {
            actorId: admin.id,
            action: 'LEGACY_JOURNEY_BACKFILLED',
            entityType: 'ContentItem',
            entityId: existingItem.id,
            metadataJson: JSON.stringify({ slug: record.slug, checksum: record.checksum }),
          },
        });
        return;
      }

      const item = await transaction.contentItem.create({
        data: {
          type: 'BANKING_JOURNEY',
          slug: record.slug,
          stableKey: record.stableKey,
          ownerId: admin.id,
          previewJson: JSON.stringify({ title: record.title, summary: record.summary }),
          description: record.summary,
          category: record.category,
          journeyType: 'DOMAIN_JOURNEY',
          tagsJson: JSON.stringify(record.tags),
          displayOrder: journeyIndex,
          seoTitle: record.title,
          seoDescription: record.summary,
          knowledgeScopes: {
            create: {
              knowledgeScopeId: scope.id,
              relationshipType: 'PRIMARY',
              isRequired: true,
            },
          },
        },
      });

      const revision = await transaction.contentRevision.create({
        data: {
          contentItemId: item.id,
          version: 1,
          status: 'PUBLISHED',
          schemaVersion: 1,
          contentJson: JSON.stringify(record.metadata),
          authorId: admin.id,
          reviewerId: admin.id,
          submittedAt: new Date(),
          reviewedAt: new Date(),
          publishedAt: new Date(),
          reviewNote: 'Controlled migration from the legacy Banking Journey source.',
          revisionModules: revisionModules(record),
        },
      });

      await transaction.contentItem.update({
        where: { id: item.id },
        data: { publishedRevisionId: revision.id },
      });

      const translation = await transaction.contentTranslation.create({
        data: {
          contentItemId: item.id,
          locale: 'en',
          slug: record.slug,
          title: record.title,
          summary: record.summary,
          status: 'PUBLISHED',
          ownerId: admin.id,
        },
      });
      const translationRevision = await transaction.translationRevision.create({
        data: {
          contentTranslationId: translation.id,
          version: 1,
          status: 'PUBLISHED',
          schemaVersion: 1,
          contentJson: JSON.stringify(record.metadata),
          authorId: admin.id,
          reviewerId: admin.id,
          submittedAt: new Date(),
          reviewedAt: new Date(),
          publishedAt: new Date(),
        },
      });
      await transaction.contentTranslation.update({
        where: { id: translation.id },
        data: { publishedRevisionId: translationRevision.id },
      });
      await transaction.contentTranslation.create({
        data: {
          contentItemId: item.id,
          locale: 'vi',
          slug: record.slug,
          title: record.title,
          summary: record.summary,
          status: 'NOT_STARTED',
          ownerId: admin.id,
        },
      });
      await transaction.auditLog.create({
        data: {
          actorId: admin.id,
          action: 'LEGACY_JOURNEY_BACKFILLED',
          entityType: 'ContentItem',
          entityId: item.id,
          metadataJson: JSON.stringify({ slug: record.slug, checksum: record.checksum }),
        },
      });
    }, { timeout: 30_000 });
    imported += 1;
  }

  const parity = await prisma.contentItem.findMany({
    where: { type: 'BANKING_JOURNEY', slug: { in: records.map((record) => record.slug) } },
    select: {
      slug: true,
      isArchived: true,
      publishedRevision: {
        select: {
          status: true,
          contentJson: true,
          revisionModules: {
            where: { isArchived: false },
            select: {
              sections: {
                where: { isArchived: false },
                select: { blocks: { where: { isArchived: false }, select: { id: true } } },
              },
            },
          },
        },
      },
      translations: { select: { locale: true, status: true } },
      knowledgeScopes: { select: { knowledgeScopeId: true } },
    },
  });

  for (const record of records) {
    const item = parity.find((candidate) => candidate.slug === record.slug);
    const moduleCount = item?.publishedRevision?.revisionModules.length ?? 0;
    const sectionCount = item?.publishedRevision?.revisionModules.reduce(
      (total, module) => total + module.sections.length,
      0,
    ) ?? 0;
    const blockCount = item?.publishedRevision?.revisionModules.reduce(
      (total, module) => total + module.sections.reduce(
        (sectionTotal, section) => sectionTotal + section.blocks.length,
        0,
      ),
      0,
    ) ?? 0;
    const expectedSectionCount = record.modules.reduce((total, module) => total + module.sections.length, 0);
    const expectedBlockCount = record.modules.reduce(
      (total, module) => total + module.sections.reduce(
        (sectionTotal, section) => sectionTotal + section.blocks.length,
        0,
      ),
      0,
    );
    if (
      !item
      || item.isArchived
      || item.publishedRevision?.status !== 'PUBLISHED'
      || migrationChecksum(item.publishedRevision.contentJson) !== record.checksum
      || moduleCount !== record.modules.length
      || sectionCount !== expectedSectionCount
      || blockCount !== expectedBlockCount
      || item.knowledgeScopes.length !== 1
      || !item.translations.some((translation) => translation.locale === 'en' && translation.status === 'PUBLISHED')
      || !item.translations.some((translation) => translation.locale === 'vi' && translation.status === 'NOT_STARTED')
    ) {
      throw new Error(`Parity validation failed for ${record.slug}.`);
    }
  }

  console.log(`Backfill complete: ${imported} imported, ${skipped} already matched.`);
  console.log(`Parity passed for all ${records.length} Banking Journeys.`);
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });

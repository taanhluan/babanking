import fs from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { loadEnvironmentFiles } from './load-environment-files';
import { parseServerEnvironment } from '../src/server/environment-core';
import { journeyContentSchema } from '../src/server/cms/journey-content-schema';
import { customerSegmentContentSchema } from '../src/server/customer-segment/customer-segment-domain';
import { customerSegmentContentHash } from '../src/server/customer-segment/customer-segment-release';
import { canonicalContentHash, RETAIL_PRODUCTION_GUARD_HASH, SME_ENTERPRISE_RELEASE_ID, smeEnterpriseReleaseSchema } from '../src/server/customer-segment/sme-enterprise-release';

loadEnvironmentFiles();
const environment = parseServerEnvironment(process.env, { requireAuthSecret: false });
if (environment.APP_ENV !== 'development' || environment.DATABASE_ENVIRONMENT !== 'development') throw new Error('Release export is Development-only.');
const db = new PrismaClient();
const output = path.resolve(process.cwd(), `release/customer-segments/${SME_ENTERPRISE_RELEASE_ID}.json`);

function contentCounts(content: ReturnType<typeof journeyContentSchema.parse>) {
  const modules = content.modules ?? [];
  return { modules: modules.length, sections: modules.reduce((sum, module) => sum + module.sections.length, 0), blocks: modules.reduce((sum, module) => sum + module.sections.reduce((sectionSum, section) => sectionSum + section.blocks.length, 0), 0) };
}

try {
  const items = await db.contentItem.findMany({
    where: { OR: [{ type: 'BANKING_JOURNEY', slug: { startsWith: 'sme-' } }, { type: 'BANKING_JOURNEY', slug: { startsWith: 'enterprise-' } }, { type: 'CUSTOMER_SEGMENT', slug: { in: ['sme', 'enterprise-banking'] } }] },
    include: { publishedRevision: true, knowledgeScopes: { include: { knowledgeScope: true } } },
    orderBy: { slug: 'asc' },
  });
  const journeyItems = items.filter((item) => item.type === 'BANKING_JOURNEY');
  if (journeyItems.length !== 20) throw new Error(`Expected 20 published target Journeys, found ${journeyItems.length}.`);
  const journeys = journeyItems.map((item) => {
    const revision = item.publishedRevision;
    if (!revision || revision.status !== 'PUBLISHED' || !revision.publishedAt || item.isArchived) throw new Error(`Journey ${item.slug} is not actively published.`);
    if (!revision.authorId || !revision.reviewerId || revision.authorId === revision.reviewerId) throw new Error(`Journey ${item.slug} lacks independent author/reviewer evidence.`);
    const content = journeyContentSchema.parse(JSON.parse(revision.contentJson));
    const segment = item.slug.startsWith('sme-') ? 'sme' as const : 'enterprise-banking' as const;
    if (content.slug !== item.slug || content.metadata?.customerSegment !== segment) throw new Error(`Journey ${item.slug} identity metadata mismatch.`);
    const counts = contentCounts(content);
    if (counts.modules !== 13 || counts.sections !== 65 || counts.blocks !== 65) throw new Error(`Journey ${item.slug} content completeness mismatch.`);
    if (item.knowledgeScopes.length !== 1 || !item.knowledgeScopes[0].isRequired || item.knowledgeScopes[0].relationshipType !== 'PRIMARY' || !item.knowledgeScopes[0].knowledgeScope.isActive) throw new Error(`Journey ${item.slug} must have exactly one active required PRIMARY scope.`);
    return { slug: item.slug, segment, scopeCode: item.knowledgeScopes[0].knowledgeScope.code, sourceEnvironment: 'development' as const, sourceRevisionId: revision.id, sourceVersion: revision.version, sourcePublishedAt: revision.publishedAt.toISOString(), sourceHash: canonicalContentHash(content), content };
  });
  const segments = ['sme', 'enterprise-banking'].map((slug) => {
    const item = items.find((candidate) => candidate.type === 'CUSTOMER_SEGMENT' && candidate.slug === slug);
    const revision = item?.publishedRevision;
    if (!item || !revision || revision.status !== 'PUBLISHED' || !revision.publishedAt || item.isArchived) throw new Error(`Segment ${slug} is not actively published.`);
    if (!revision.authorId || !revision.reviewerId || revision.authorId === revision.reviewerId) throw new Error(`Segment ${slug} lacks independent author/reviewer evidence.`);
    const content = customerSegmentContentSchema.parse(JSON.parse(revision.contentJson));
    if (content.en.sections.length !== 9 || content.vi.sections.length !== 9) throw new Error(`Segment ${slug} must contain 9 EN and 9 VI landing sections.`);
    return { slug: slug as 'sme' | 'enterprise-banking', sourceEnvironment: 'development' as const, sourceRevisionId: revision.id, sourceVersion: revision.version, sourcePublishedAt: revision.publishedAt.toISOString(), sourceHash: customerSegmentContentHash(content), content };
  });
  const release = smeEnterpriseReleaseSchema.parse({ releaseId: SME_ENTERPRISE_RELEASE_ID, createdAt: new Date().toISOString(), retailGuard: { slug: 'retail-banking', productionHash: RETAIL_PRODUCTION_GUARD_HASH }, journeys, segments });
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, `${JSON.stringify(release, null, 2)}\n`);
  console.log(JSON.stringify({ output, journeys: release.journeys.length, segments: release.segments.length, retailMutation: false }, null, 2));
} finally {
  await db.$disconnect();
}

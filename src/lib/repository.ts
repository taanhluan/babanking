import 'server-only';
import type { ContentType } from '@prisma/client';
import { db } from '@/lib/db';
import { requirePremiumAccess } from './membership';
import { bankingJourneyContent, baPracticeContent, caseStudyContent, careerLevelContent, searchIndex } from '@/data/content';
const staticByType = { BANKING_JOURNEY: bankingJourneyContent, BA_PRACTICE: baPracticeContent, CASE_STUDY: caseStudyContent, CAREER_LEVEL: careerLevelContent } as const;
export async function getPublishedByType(type: ContentType) {
  await requirePremiumAccess();
  try {
    const items = await db.contentItem.findMany({ where: { type, isArchived: false, publishedRevisionId: { not: null } }, include: { publishedRevision: true }, orderBy: { slug: 'asc' } });
    if (!items.length) return [...staticByType[type]];
    return items.flatMap((item) => { try { return item.publishedRevision ? [JSON.parse(item.publishedRevision.contentJson) as Record<string, unknown>] : []; } catch { return []; } });
  } catch (error) {
    if (process.env.NODE_ENV === 'production') throw new Error('Published content is temporarily unavailable.', { cause: error });
    return [...staticByType[type]];
  }
}
export async function getPublishedBySlug(type: ContentType, slug: string) {
  const records = await getPublishedByType(type); return records.find((record) => record.slug === slug);
}
export async function getPublishedSearchIndex() {
  await requirePremiumAccess('/search');
  try {
    const count = await db.contentItem.count({ where: { isArchived: false, publishedRevisionId: { not: null } } });
    if (!count) return searchIndex;
    return searchIndex;
  } catch { return searchIndex; }
}

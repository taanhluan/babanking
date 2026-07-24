import 'server-only';
import type { ContentType } from '@prisma/client';
import { db } from '@/lib/db';
import { requirePremiumAccess } from './membership';
import { bankingJourneyContent, baPracticeContent, caseStudyContent, careerLevelContent, searchIndex } from '@/data/content';
import { getServerEnvironment } from '@/server/env';
const staticByType = { BANKING_JOURNEY: bankingJourneyContent, BA_PRACTICE: baPracticeContent, CASE_STUDY: caseStudyContent, CAREER_LEVEL: careerLevelContent } as const;
export async function getPublishedByType(type: ContentType) {
  await requirePremiumAccess();
  const allowStaticFallback = getServerEnvironment().ENABLE_STATIC_CONTENT_FALLBACK;
  try {
    const items = await db.contentItem.findMany({ where: { type, isArchived: false, publishedRevisionId: { not: null } }, include: { publishedRevision: true }, orderBy: { slug: 'asc' } });
    if (!items.length) return allowStaticFallback ? [...staticByType[type]] : [];
    return items.flatMap((item) => { try { return item.publishedRevision ? [JSON.parse(item.publishedRevision.contentJson) as Record<string, unknown>] : []; } catch { return []; } });
  } catch (error) {
    if (allowStaticFallback) return [...staticByType[type]];
    throw new Error('Published content is temporarily unavailable.', { cause: error });
  }
}
export async function getPublishedBySlug(type: ContentType, slug: string) {
  const records = await getPublishedByType(type); return records.find((record) => record.slug === slug);
}
export async function getPublishedSearchIndex() {
  await requirePremiumAccess('/search');
  const allowStaticFallback = getServerEnvironment().ENABLE_STATIC_CONTENT_FALLBACK;
  try {
    const items = await db.contentItem.findMany({
      where: { isArchived: false, publishedRevisionId: { not: null } },
      include: { publishedRevision: true },
      orderBy: { slug: 'asc' },
    });
    if (!items.length) return allowStaticFallback ? searchIndex : [];
    return items.flatMap((item) => {
      if (!item.publishedRevision) return [];
      try {
        const content = JSON.parse(item.publishedRevision.contentJson) as {
          title?: string;
          summary?: string;
          keywords?: string[];
          topics?: string[];
          category?: string;
          domain?: string;
        };
        if (!content.title || !content.summary) return [];
        const route = {
          BANKING_JOURNEY: 'banking-journeys',
          BA_PRACTICE: 'ba-practice',
          CASE_STUDY: 'case-studies',
          CAREER_LEVEL: 'career-roadmap',
        }[item.type];
        const label = {
          BANKING_JOURNEY: 'Banking Journey',
          BA_PRACTICE: 'BA Practice',
          CASE_STUDY: 'Case Study',
          CAREER_LEVEL: 'Career Level',
        }[item.type] as 'Banking Journey' | 'BA Practice' | 'Case Study' | 'Career Level';
        return [{
          type: label,
          title: content.title,
          summary: content.summary,
          keywords: content.keywords ?? content.topics ?? [],
          context: content.category ?? content.domain ?? label,
          url: `/${route}/${item.slug}`,
        }];
      } catch {
        return [];
      }
    });
  } catch (error) {
    if (allowStaticFallback) return searchIndex;
    throw new Error('Search content is temporarily unavailable.', { cause: error });
  }
}

import 'server-only';
import { db } from '@/lib/db';
import { getAccessibleContentIds } from '@/server/access-control/knowledge-access-repository';
import { parseGlossaryEntryContent, type GlossaryListEntry } from './glossary-domain';

/** Server-only glossary reads. Every member read is restricted to Knowledge Access Matrix VIEW ids first. */
export const GlossaryRepository = {
  async listPublishedAuthorized(userId: string): Promise<GlossaryListEntry[]> {
    const ids = await getAccessibleContentIds(userId, { type: 'GLOSSARY_ENTRY', permission: 'VIEW' });
    if (!ids.length) return [];
    const items = await db.contentItem.findMany({
      where: { id: { in: ids }, type: 'GLOSSARY_ENTRY', isArchived: false, publishedRevisionId: { not: null } },
      select: { slug: true, publishedRevision: { select: { contentJson: true } } },
      orderBy: { slug: 'asc' },
    });
    return items.flatMap((item) => {
      const content = item.publishedRevision && parseGlossaryEntryContent(item.publishedRevision.contentJson);
      return content ? [{ slug: item.slug, content }] : [];
    });
  },

  /** Call only after requireContentSlugAccess('GLOSSARY_ENTRY', slug) has authorized the reader. */
  async getPublishedBySlug(slug: string) {
    const item = await db.contentItem.findFirst({
      where: { type: 'GLOSSARY_ENTRY', slug, isArchived: false, publishedRevisionId: { not: null } },
      select: { slug: true, publishedRevision: { select: { contentJson: true, publishedAt: true } } },
    });
    const content = item?.publishedRevision && parseGlossaryEntryContent(item.publishedRevision.contentJson);
    return item && content ? { slug: item.slug, content, publishedAt: item.publishedRevision?.publishedAt ?? null } : null;
  },

  /** Published Journeys the user may VIEW, keyed by slug; JSON references never grant access on their own. */
  async getAccessibleJourneyTitles(userId: string, slugs: string[]) {
    if (!slugs.length) return new Map<string, string>();
    const ids = await getAccessibleContentIds(userId, { type: 'BANKING_JOURNEY', permission: 'VIEW' });
    if (!ids.length) return new Map<string, string>();
    const journeys = await db.contentItem.findMany({
      where: { id: { in: ids }, type: 'BANKING_JOURNEY', slug: { in: slugs }, isArchived: false, publishedRevisionId: { not: null } },
      select: { slug: true, previewJson: true },
    });
    return new Map(journeys.map((journey) => [journey.slug, previewTitle(journey.previewJson) ?? journey.slug]));
  },

  async listRelatedToJourney(userId: string, journeySlug: string) {
    const entries = await GlossaryRepository.listPublishedAuthorized(userId);
    return entries.filter((entry) => entry.content.relatedJourneySlugs.includes(journeySlug));
  },

  async listForCms() {
    return db.contentItem.findMany({
      where: { type: 'GLOSSARY_ENTRY' },
      select: {
        id: true, slug: true, isArchived: true, previewJson: true, publishedRevisionId: true, updatedAt: true,
        revisions: { orderBy: { version: 'desc' }, take: 1, select: { id: true, version: true, status: true, authorId: true } },
      },
      orderBy: { slug: 'asc' },
    });
  },

  async getForCms(slug: string) {
    return db.contentItem.findUnique({
      where: { type_slug: { type: 'GLOSSARY_ENTRY', slug } },
      include: {
        publishedRevision: true,
        revisions: { orderBy: { version: 'desc' }, include: { author: { select: { name: true } }, reviewer: { select: { name: true } } } },
      },
    });
  },
};

function previewTitle(previewJson: string | null) {
  try {
    const value = previewJson ? JSON.parse(previewJson) : null;
    return typeof value?.title === 'string' ? value.title as string : null;
  } catch {
    return null;
  }
}

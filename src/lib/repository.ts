import 'server-only';
import type { ContentType } from '@prisma/client';
import { db } from '@/lib/db';
import { requirePremiumAccess } from './membership';
import { getAccessibleContentIds } from '@/server/access-control/knowledge-access-repository';
import { requireContentSlugAccess } from '@/server/access-control/require-knowledge-access';

export type PublishedContent = {
  id: string;
  type: ContentType;
  slug: string;
  title: string;
  summary: string;
  body: Record<string, unknown>;
};

export type ContentPreview = Pick<PublishedContent, 'id' | 'type' | 'slug' | 'title' | 'summary'>;

const routes: Record<ContentType, string> = {
  BANKING_JOURNEY: 'banking-journeys',
  BA_PRACTICE: 'ba-practice',
  CASE_STUDY: 'case-studies',
  CAREER_LEVEL: 'career-roadmap',
};

const labels: Record<ContentType, 'Banking Journey' | 'BA Practice' | 'Case Study' | 'Career Level'> = {
  BANKING_JOURNEY: 'Banking Journey',
  BA_PRACTICE: 'BA Practice',
  CASE_STUDY: 'Case Study',
  CAREER_LEVEL: 'Career Level',
};

function parseBody(value: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

function previewFrom(item: { id: string; type: ContentType; slug: string; previewJson: string | null }): ContentPreview | null {
  const body = item.previewJson ? parseBody(item.previewJson) : null;
  const title = typeof body?.title === 'string' ? body.title : null;
  const summary = typeof body?.summary === 'string' ? body.summary : null;
  return title && summary ? { id: item.id, type: item.type, slug: item.slug, title, summary } : null;
}

/** Server-only Neon content repository. Access is resolved before contentJson is queried. */
export const ContentRepository = {
  async listByCategory(type: ContentType): Promise<ContentPreview[]> {
    const user = await requirePremiumAccess(`/${routes[type]}`);
    const accessibleIds = await getAccessibleContentIds(user.id, { type, permission: 'VIEW' });
    if (!accessibleIds.length) return [];
    const items = await db.contentItem.findMany({
      where: { id: { in: accessibleIds }, type, isArchived: false, publishedRevisionId: { not: null } },
      select: { id: true, type: true, slug: true, previewJson: true },
      orderBy: { slug: 'asc' },
    });
    return items.flatMap((item) => {
      const preview = previewFrom(item);
      return preview ? [preview] : [];
    });
  },

  async getContentBySlug(type: ContentType, slug: string): Promise<PublishedContent | undefined> {
    const { content } = await requireContentSlugAccess(type, slug);
    const item = await db.contentItem.findUnique({
      where: { id: content.id },
      select: { id: true, type: true, slug: true, previewJson: true, publishedRevision: { select: { contentJson: true } } },
    });
    const body = item?.publishedRevision && parseBody(item.publishedRevision.contentJson);
    const preview = item && previewFrom(item);
    return item && body && preview ? { ...preview, body } : undefined;
  },

  async getPreview(type: ContentType, slug: string): Promise<ContentPreview | undefined> {
    const user = await requirePremiumAccess(`/${routes[type]}`);
    const accessibleIds = await getAccessibleContentIds(user.id, { type, permission: 'VIEW' });
    const item = await db.contentItem.findFirst({
      where: { id: { in: accessibleIds }, type, slug, isArchived: false, publishedRevisionId: { not: null } },
      select: { id: true, type: true, slug: true, previewJson: true },
    });
    return item ? previewFrom(item) ?? undefined : undefined;
  },

  async search() {
    const user = await requirePremiumAccess('/search');
    const accessibleIds = await getAccessibleContentIds(user.id, { permission: 'VIEW' });
    if (!accessibleIds.length) return [];
    const items = await db.contentItem.findMany({
      where: { id: { in: accessibleIds }, isArchived: false, publishedRevisionId: { not: null } },
      select: { id: true, type: true, slug: true, previewJson: true, publishedRevision: { select: { contentJson: true } } },
      orderBy: { slug: 'asc' },
    });
    return items.flatMap((item) => {
      const preview = previewFrom(item);
      if (!preview) return [];
      const body = item.publishedRevision && parseBody(item.publishedRevision.contentJson);
      const keywords = Array.isArray(body?.keywords) ? body.keywords.filter((item): item is string => typeof item === 'string') : [];
      return [{ type: labels[item.type], title: preview.title, summary: preview.summary, keywords, context: labels[item.type], url: `/${routes[item.type]}/${item.slug}` }];
    });
  },
};

export const getPublishedByType = ContentRepository.listByCategory;
export const getPublishedBySlug = ContentRepository.getContentBySlug;
export const getPublishedSearchIndex = ContentRepository.search;

import 'server-only';
import { db } from '@/lib/db';
import { customerSegmentSlugs, fallbackCustomerSegments, parseCustomerSegmentContent, segmentFromContent, type CustomerSegmentSlug } from './customer-segment-domain';
import type { JourneySegment } from '@/server/journey-segments';

async function publishedAssignmentMap() {
  const records = await db.contentItem.findMany({
    where: { type: 'CUSTOMER_SEGMENT', slug: { in: [...customerSegmentSlugs] }, isArchived: false, publishedRevisionId: { not: null } },
    select: { slug: true, publishedRevision: { select: { contentJson: true } } },
  });
  const assignments = new Map<string, CustomerSegmentSlug>();
  for (const record of records) {
    const slug = record.slug as CustomerSegmentSlug;
    const content = parseCustomerSegmentContent(record.publishedRevision?.contentJson ?? '');
    for (const journeySlug of content?.journeys ?? []) assignments.set(journeySlug, slug);
  }
  return assignments;
}

export const CustomerSegmentRepository = {
  async getPublishedCatalog(): Promise<JourneySegment[]> {
    const records = await db.contentItem.findMany({ where: { type: 'CUSTOMER_SEGMENT', slug: { in: [...customerSegmentSlugs] }, isArchived: false, publishedRevisionId: { not: null } }, select: { slug: true, publishedRevision: { select: { contentJson: true } } } });
    const fallback = fallbackCustomerSegments();
    return customerSegmentSlugs.map((slug) => { const record = records.find((item) => item.slug === slug); const content = record?.publishedRevision && parseCustomerSegmentContent(record.publishedRevision.contentJson); return content ? segmentFromContent(slug, content) : fallback.find((segment) => segment.slug === slug)!; });
  },
  async listForCms() { return db.contentItem.findMany({ where: { type: 'CUSTOMER_SEGMENT' }, include: { revisions: { orderBy: { version: 'desc' }, take: 1 }, publishedRevision: true }, orderBy: { slug: 'asc' } }); },
  getPublishedJourneyAssignments: publishedAssignmentMap,
  async listPublishedJourneyOptions() {
    const [journeys, assignments] = await Promise.all([
      db.contentItem.findMany({
        where: { type: 'BANKING_JOURNEY', isArchived: false, publishedRevisionId: { not: null } },
        orderBy: { slug: 'asc' },
        select: { id: true, slug: true, previewJson: true },
      }),
      publishedAssignmentMap(),
    ]);
    return journeys.map((journey) => ({ ...journey, assignedSegment: assignments.get(journey.slug) ?? null }));
  },
};

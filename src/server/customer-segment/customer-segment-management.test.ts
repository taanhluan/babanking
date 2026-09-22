import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ contentFindMany: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/db', () => ({ db: { contentItem: { findMany: mocks.contentFindMany } } }));

import { CustomerSegmentRepository } from './customer-segment-repository';

const segment = (slug: string, journeys: string[]) => ({
  slug,
  publishedRevision: { contentJson: JSON.stringify({
    schemaVersion: 1,
    en: { title: 'Segment title', description: 'A sufficiently detailed segment description.', focus: ['Focus'], alt: 'Accessible segment illustration' },
    vi: { title: 'Tên phân khúc', description: 'Nội dung mô tả phân khúc đủ chi tiết để kiểm thử.', focus: ['Trọng tâm'], alt: 'Hình minh họa phân khúc phù hợp' },
    journeys,
  }) },
});

describe('Customer Segment management projections', () => {
  beforeEach(() => vi.clearAllMocks());

  it('derives the Journey-to-segment index only from published segment revisions', async () => {
    mocks.contentFindMany.mockResolvedValue([segment('retail-banking', ['cards']), segment('sme', ['sme-business-onboarding'])]);
    const assignments = await CustomerSegmentRepository.getPublishedJourneyAssignments();
    expect([...assignments.entries()]).toEqual([['cards', 'retail-banking'], ['sme-business-onboarding', 'sme']]);
  });

  it('lists only published non-archived Journey options with their current assignment', async () => {
    mocks.contentFindMany.mockImplementation(({ where }: { where: { type: string } }) => where.type === 'BANKING_JOURNEY'
      ? Promise.resolve([{ id: 'journey-1', slug: 'cards', previewJson: '{"title":"Cards"}' }, { id: 'journey-2', slug: 'new-sme', previewJson: null }])
      : Promise.resolve([segment('retail-banking', ['cards'])]));
    const options = await CustomerSegmentRepository.listPublishedJourneyOptions();
    expect(options).toEqual([
      { id: 'journey-1', slug: 'cards', previewJson: '{"title":"Cards"}', assignedSegment: 'retail-banking' },
      { id: 'journey-2', slug: 'new-sme', previewJson: null, assignedSegment: null },
    ]);
    expect(mocks.contentFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ type: 'BANKING_JOURNEY', isArchived: false, publishedRevisionId: { not: null } }) }));
  });
});

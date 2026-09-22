import { describe, expect, it } from 'vitest';
import { customerSegmentContentHash, customerSegmentReleaseSchema } from './customer-segment-release';

const content = { schemaVersion: 2, en: { title: 'Retail Banking', description: 'A sufficiently detailed English description.', focus: ['Payments'], alt: 'Retail banking illustration', sections: [] }, vi: { title: 'Ngân hàng bán lẻ', description: 'Mô tả tiếng Việt đủ dài cho phân khúc.', focus: ['Thanh toán'], alt: 'Minh họa ngân hàng bán lẻ', sections: [] }, journeys: ['cards'] };

describe('Customer Segment release contract', () => {
  it('hashes objects independently of object key order', () => expect(customerSegmentContentHash({ b: 2, a: 1 })).toBe(customerSegmentContentHash({ a: 1, b: 2 })));
  it('accepts an exact Development-published artifact', () => expect(customerSegmentReleaseSchema.safeParse({ releaseId: 'customer-segments-2026-09-19-v1', createdAt: '2026-09-19T12:30:00.000Z', entries: [{ slug: 'retail-banking', sourceEnvironment: 'development', sourceRevisionId: 'source-revision', sourceVersion: 2, sourcePublishedAt: '2026-09-19T12:28:59.746Z', sourceHash: customerSegmentContentHash(content), content }] }).success).toBe(true));
  it('rejects modified content after approval', () => expect(customerSegmentReleaseSchema.safeParse({ releaseId: 'customer-segments-2026-09-19-v1', createdAt: '2026-09-19T12:30:00.000Z', entries: [{ slug: 'retail-banking', sourceEnvironment: 'development', sourceRevisionId: 'source-revision', sourceVersion: 2, sourcePublishedAt: '2026-09-19T12:28:59.746Z', sourceHash: '0'.repeat(64), content }] }).success).toBe(false));
});

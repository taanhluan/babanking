import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  assertGenericReviewContentType,
  genericReviewContentTypeList,
  isGenericReviewContentType,
  isReviewDetailContentType,
  reviewQueueContentTypeList,
} from './generic-review-workflow';

describe('generic review workflow content boundary', () => {
  it('allows only the live generic content types', () => {
    expect(genericReviewContentTypeList).toEqual([
      'BA_PRACTICE',
      'CASE_STUDY',
      'CAREER_LEVEL',
      'CUSTOMER_SEGMENT',
    ]);
    for (const type of genericReviewContentTypeList) {
      expect(isGenericReviewContentType(type)).toBe(true);
    }
  });

  it('fails closed for Journey and BA Document specialized workflows', () => {
    expect(isGenericReviewContentType('BANKING_JOURNEY')).toBe(false);
    expect(isGenericReviewContentType('BA_DOCUMENT')).toBe(false);
    expect(() => assertGenericReviewContentType('BANKING_JOURNEY')).toThrow(/not handled/);
    expect(isReviewDetailContentType('BANKING_JOURNEY')).toBe(true);
    expect(isReviewDetailContentType('BA_DOCUMENT')).toBe(false);
    expect(reviewQueueContentTypeList).toContain('BANKING_JOURNEY');
  });

  it('uses the fail-closed boundary before generic protected revision reads and mutations', () => {
    const detail = readFileSync(join(process.cwd(), 'src/app/review/[revisionId]/page.tsx'), 'utf8');
    const action = readFileSync(join(process.cwd(), 'src/app/actions.ts'), 'utf8');
    const queue = readFileSync(join(process.cwd(), 'src/app/review/page.tsx'), 'utf8');

    expect(detail.indexOf('if (!isReviewDetailContentType(identity.contentItem.type)) notFound()'))
      .toBeLessThan(detail.indexOf('include: { contentItem: { include: { publishedRevision: true } }'));
    expect(action.indexOf('assertGenericReviewContentType(securityIdentity.contentItem.type)'))
      .toBeLessThan(action.indexOf("const revision = await db.contentRevision.findUnique({ where: { id: revisionId }, include: { contentItem: true } })"));
    expect(queue).toContain("const queueContentTypes: ContentType[] = [...reviewQueueContentTypeList, 'BA_DOCUMENT']");
    expect(queue).toContain('contentItemId: { in: contentIds }');
    expect(queue).toContain("primaryJourneyContentItemId: { in: journeyIds }");
  });
});

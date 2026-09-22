import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { SegmentWelcome } from './SegmentWelcome';
import { findJourneySegment, journeySegments, segmentJourneys } from '@/server/journey-segments';
import type { ContentPreview } from '@/lib/repository';

vi.mock('next/image', () => ({ default: ({ src, alt, width, height, className }: React.ImgHTMLAttributes<HTMLImageElement>) => React.createElement('img', { src, alt, width, height, className }) }));
const allowed: ContentPreview = { id: 'allowed', type: 'BANKING_JOURNEY', slug: 'cards', title: 'Allowed cards', summary: 'Authorized preview' };

describe('segment navigation', () => {
  it('only narrows authorized previews, omitting unknown and other content types', () => {
    expect(segmentJourneys(journeySegments[0], [])).toEqual([]);
    expect(segmentJourneys(journeySegments[0], [allowed, { ...allowed, slug: 'unclassified' }, { ...allowed, type: 'BA_PRACTICE' }])).toEqual([allowed]);
    expect(segmentJourneys(journeySegments[1], [allowed])).toEqual([]);
    expect(findJourneySegment('__proto__')).toBeUndefined();
  });
  it('renders all segments but only authorized counts and stable localized detail links', () => {
    const landing = renderToStaticMarkup(<SegmentWelcome locale="en" items={[allowed]} segments={journeySegments}/>);
    expect(landing).toContain('1 journeys available to you');
    for (const segment of journeySegments) expect(landing).toContain('/en/banking-journeys/segments/' + segment.slug);
    const retail = renderToStaticMarkup(<SegmentWelcome locale="vi" items={[allowed]} segment={journeySegments[0]} collection/>);
    expect(retail).toContain('/vi/banking-journeys/cards');
    expect(retail).not.toContain('/vi/banking-journeys/deposits');
    expect(retail).toContain('Ngân hàng bán lẻ');
    const welcome = renderToStaticMarkup(<SegmentWelcome locale="en" items={[]} segment={journeySegments[0]}/>);
    expect(welcome).toContain('/en/banking-journeys/segments/retail-banking/journeys');
    expect(welcome).toContain('aria-current="page"');
    expect(welcome).toContain('Overview');
    expect(welcome).toContain('Journeys');
  });
  it('shows welcome copy and safe empty states in both locales', () => {
    for (const locale of ['en', 'vi'] as const) for (const segment of journeySegments) {
      const html = renderToStaticMarkup(<SegmentWelcome locale={locale} items={[]} segment={segment}/>);
      expect(html).toContain(segment[locale].description);
      expect(html).toContain(segment[locale].alt);
      expect(html).not.toContain('Allowed cards');
      const asset = readFileSync('public/images/segments/' + segment.slug + '.svg', 'utf8');
      expect(asset).not.toMatch(/<script|<foreignObject|href=|onload=/i);
    }
  });
  it('uses only approved orchestration assets for landing image blocks', () => {
    const cases = [
      ['retail-banking', '/images/segments/retail-banking-orchestration.png'],
      ['sme', '/images/segments/sme-banking-orchestration.png'],
      ['enterprise-banking', '/images/segments/enterprise-banking-orchestration.png'],
    ] as const;
    for (const [assetKey, path] of cases) {
      const base = journeySegments.find((segment) => segment.slug === assetKey)!;
      const segment = { ...base, en: { ...base.en, sections: [{ type: 'IMAGE' as const, assetKey, alt: `${base.en.title} orchestration model` }] } };
      const html = renderToStaticMarkup(<SegmentWelcome locale="en" items={[]} segment={segment}/>);
      expect(html).toContain(path);
      expect(html).toContain(`${base.en.title} orchestration model`);
      expect(readFileSync(`public${path}`).length).toBeGreaterThan(0);
    }
  });
});

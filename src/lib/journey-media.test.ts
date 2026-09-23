import { describe, expect, it } from 'vitest';
import {
  assertJourneyContentSize,
  isSha256Digest,
  isSafeJourneyMediaUrl,
  journeyMediaUploadPath,
  MAX_JOURNEY_CONTENT_BYTES,
  publishedJourneyIncludesMediaPath,
} from './journey-media';

describe('journey media policy', () => {
  it('allows HTTPS media and approved raster data URLs only', () => {
    expect(isSafeJourneyMediaUrl('https://cdn.example.com/onboarding.png')).toBe(true);
    expect(isSafeJourneyMediaUrl('data:image/png;base64,aGVsbG8=')).toBe(true);
    expect(isSafeJourneyMediaUrl('data:image/jpeg;base64,aGVsbG8=')).toBe(true);
    expect(isSafeJourneyMediaUrl('data:image/webp;base64,aGVsbG8=')).toBe(true);
  });

  it('rejects executable, insecure, credentialed and SVG URLs', () => {
    expect(isSafeJourneyMediaUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeJourneyMediaUrl('http://cdn.example.com/onboarding.png')).toBe(false);
    expect(isSafeJourneyMediaUrl('https://user:pass@cdn.example.com/onboarding.png')).toBe(false);
    expect(isSafeJourneyMediaUrl('data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=')).toBe(false);
  });

  it('caps total serialized journey content before the server action persists it', () => {
    expect(() => assertJourneyContentSize('x'.repeat(MAX_JOURNEY_CONTENT_BYTES))).not.toThrow();
    expect(() => assertJourneyContentSize('x'.repeat(MAX_JOURNEY_CONTENT_BYTES + 1))).toThrow(/25 MB/);
  });
});

describe('content-addressed journey media paths', () => {
  const digest = 'a'.repeat(64);

  it('reuses one immutable path for matching file content across revisions', () => {
    expect(journeyMediaUploadPath('customer-onboarding', 'cm123', 'image', digest))
      .toBe(`journey-media/customer-onboarding/sha256/${digest}`);
    expect(journeyMediaUploadPath('customer-onboarding', 'cm456', 'diagram', digest))
      .toBe(`journey-media/customer-onboarding/sha256/${digest}`);
  });

  it('accepts only lowercase SHA-256 digests for content-addressed media', () => {
    expect(isSha256Digest(digest)).toBe(true);
    expect(isSha256Digest('not-a-digest')).toBe(false);
    expect(isSha256Digest('A'.repeat(64))).toBe(false);
  });

  it('recognizes block and three-level cover-media references in published content', () => {
    const blockPath = `journey-media/customer-onboarding/sha256/${'b'.repeat(64)}`;
    const coverPath = `journey-media/customer-onboarding/sha256/${'c'.repeat(64)}`;
    const content = {
      modules: [{
        media: { kind: 'IMAGE', mediaPath: coverPath },
        sections: [{
          media: { kind: 'IMAGE', mediaPath: coverPath },
          blocks: [{ blockType: 'IMAGE', payload: { mediaPath: blockPath } }],
        }],
      }],
    };
    expect(publishedJourneyIncludesMediaPath(content, blockPath)).toBe(true);
    expect(publishedJourneyIncludesMediaPath(content, coverPath)).toBe(true);
    expect(publishedJourneyIncludesMediaPath(content, `journey-media/customer-onboarding/sha256/${'d'.repeat(64)}`)).toBe(false);
  });
});

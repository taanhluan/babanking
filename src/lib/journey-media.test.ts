import { describe, expect, it } from 'vitest';
import {
  assertJourneyContentSize,
  isSafeJourneyMediaUrl,
  MAX_JOURNEY_CONTENT_BYTES,
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
    expect(() => assertJourneyContentSize('x'.repeat(MAX_JOURNEY_CONTENT_BYTES + 1))).toThrow(/7 MB/);
  });
});

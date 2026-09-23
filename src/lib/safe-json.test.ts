import { describe, expect, it } from 'vitest';
import { parseJsonObjectSafely, prettyJsonSafely } from './safe-json';

describe('safe JSON helpers', () => {
  it('does not throw for malformed or non-object JSON', () => {
    expect(parseJsonObjectSafely('{ malformed')).toMatchObject({ ok: false });
    expect(parseJsonObjectSafely('[]')).toMatchObject({ ok: false });
    expect(prettyJsonSafely('{ malformed')).toBe('{ malformed');
  });

  it('formats valid object JSON', () => {
    expect(prettyJsonSafely('{"title":"Journey"}')).toBe('{\n  "title": "Journey"\n}');
  });
});

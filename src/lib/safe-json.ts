export type SafeJsonParseResult =
  | { ok: true; value: Record<string, unknown> }
  | { ok: false; error: string };

/** Parses an object-shaped JSON document without allowing malformed persisted data to crash a UI. */
export function parseJsonObjectSafely(value: string): SafeJsonParseResult {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { ok: false, error: 'JSON must contain an object at the top level.' };
    }
    return { ok: true, value: parsed as Record<string, unknown> };
  } catch {
    return { ok: false, error: 'JSON is malformed and could not be read safely.' };
  }
}

export function prettyJsonSafely(value: string): string {
  const result = parseJsonObjectSafely(value);
  return result.ok
    ? JSON.stringify(result.value, null, 2)
    : value;
}

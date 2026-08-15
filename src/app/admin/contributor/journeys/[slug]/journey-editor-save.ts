import { journeyContentSchema } from '@/server/cms/journey-content-schema';

type JsonObject = Record<string, unknown>;

export type JourneyEditorSavePayload = {
  contentJson: string;
  title: string;
  summary: string;
};

export type JourneyEditorSaveResult =
  | { ok: true; content: JsonObject; payload: JourneyEditorSavePayload }
  | { ok: false; error: string };

function payloadFrom(content: JsonObject, contentJson: string): JourneyEditorSaveResult {
  const parsed = journeyContentSchema.safeParse(content);
  if (!parsed.success) {
    return { ok: false, error: 'Journey JSON does not match the required content schema.' };
  }
  return {
    ok: true,
    content: parsed.data as JsonObject,
    payload: {
      contentJson,
      title: parsed.data.title,
      summary: parsed.data.summary,
    },
  };
}

export function parseAdvancedJourneyText(text: string): JourneyEditorSaveResult {
  if (!text.trim()) return { ok: false, error: 'JSON content cannot be empty.' };
  try {
    const parsed: unknown = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { ok: false, error: 'Journey JSON must be an object.' };
    }
    return payloadFrom(parsed as JsonObject, text);
  } catch {
    return { ok: false, error: 'Journey JSON must be valid JSON.' };
  }
}

export function resolveJourneyEditorSave(input: {
  mode: 'business' | 'advanced';
  content: JsonObject;
  advancedText: string;
}): JourneyEditorSaveResult {
  if (input.mode === 'advanced') return parseAdvancedJourneyText(input.advancedText);
  return payloadFrom(input.content, JSON.stringify(input.content));
}

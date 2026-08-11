export type JourneyCmsActionErrorCode = 'environment' | 'permission' | 'workflow' | 'conflict';

export function getJourneyCmsActionErrorCode(error: unknown): JourneyCmsActionErrorCode | null {
  if (!(error instanceof Error)) return null;
  const message = error.message;
  if (/environment|unavailable|writes are unavailable/i.test(message)) return 'environment';
  if (/permission denied|not editable|cannot be (submitted|reviewed|published)|published by its author/i.test(message)) return 'permission';
  if (/conflict/i.test(message)) return 'conflict';
  if (/not found|already exists|already published|review note is required/i.test(message)) return 'workflow';
  return null;
}

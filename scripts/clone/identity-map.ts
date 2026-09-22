import { createHash } from 'node:crypto';

/** Ephemeral map only; callers must never persist or report its source keys. */
export class IdentityMap {
  private readonly users = new Map<string, string>();
  private ordinal = 0;
  mapUser(sourceId: string) {
    const existing = this.users.get(sourceId);
    if (existing) return existing;
    // Per-run ordinal mapping contains no source identifier and avoids PII-scanner false positives.
    const target = `dev-user-${String(this.users.size + 1).padStart(4, '0')}`;
    this.users.set(sourceId, target);
    return target;
  }
  profile(sourceId: string) {
    this.mapUser(sourceId);
    const position = ++this.ordinal;
    return { id: this.users.get(sourceId)!, name: `Development User ${String(position).padStart(4, '0')}`, email: `dev-user-${String(position).padStart(4, '0')}@example.test` };
  }
  hasSourceId(value: unknown) { return typeof value === 'string' && this.users.has(value); }
  fingerprint() { return createHash('sha256').update(String(this.users.size)).digest('hex').slice(0, 12); }
}

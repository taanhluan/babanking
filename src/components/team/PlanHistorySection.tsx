import type { SupportedLocale } from '@/i18n/config';
import { cardClass } from './TeamShell';
import type { TeamCopy } from './team-copy';

type Entry = { id: string; action: string; createdAt: Date; metadataJson: string | null; actor: { name: string } | null };

function describe(entry: Entry) {
  try {
    const metadata = entry.metadataJson ? JSON.parse(entry.metadataJson) as Record<string, unknown> : {};
    const quarter = typeof metadata.quarter === 'number' ? `Q${metadata.quarter} · ` : '';
    const transition = typeof metadata.from === 'string' && typeof metadata.to === 'string' ? ` (${metadata.from} → ${metadata.to})` : '';
    return `${quarter}${entry.action.replace(/^BA_/, '').replaceAll('_', ' ').toLowerCase()}${transition}`;
  } catch {
    return entry.action;
  }
}

export function PlanHistorySection({ entries, copy, locale }: { entries: Entry[]; copy: TeamCopy; locale: SupportedLocale }) {
  const format = new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' });
  return (
    <section className={cardClass}>
      <h2 className="text-lg font-semibold text-navy">{copy.history}</h2>
      {entries.length ? (
        <ul className="mt-3 grid gap-2 text-sm">
          {entries.map((entry) => <li key={entry.id} className="rounded-lg bg-slate-50 p-3"><span className="font-semibold first-letter:uppercase">{describe(entry)}</span><span className="block text-xs text-slate-500">{entry.actor?.name ?? '—'} · {format.format(entry.createdAt)}</span></li>)}
        </ul>
      ) : <p className="mt-2 text-sm text-textSecondary">{copy.noHistory}</p>}
    </section>
  );
}

import { glossaryDomains, regulationStatuses } from './glossary-domain';

type FormLike = { get(name: string): FormDataEntryValue | null; getAll(name: string): FormDataEntryValue[] };

const text = (form: FormLike, name: string) => {
  const value = form.get(name);
  return typeof value === 'string' ? value.trim() : '';
};
const optional = (form: FormLike, name: string) => text(form, name) || undefined;
const list = (form: FormLike, name: string) => [...new Set(text(form, name).split(/[\n,]/).map((value) => value.trim()).filter(Boolean))];

/** Sources are entered one per line as "Title | Publisher | https://url"; publisher and URL are optional. */
export function parseGlossarySourceLines(value: string) {
  return value.split('\n').map((line) => line.trim()).filter(Boolean).map((line) => {
    const [title = '', publisher = '', url = ''] = line.split('|').map((part) => part.trim());
    return { title, ...(publisher ? { publisher } : {}), ...(url ? { url } : {}) };
  });
}

export function formatGlossarySourceLines(sources: Array<{ title: string; publisher?: string; url?: string }>) {
  return sources.map((source) => [source.title, source.publisher ?? '', source.url ?? ''].join(' | ').replace(/( \| )+$/, '')).join('\n');
}

function localeFields(form: FormLike, key: 'en' | 'vi') {
  return { name: text(form, `${key}.name`), shortDefinition: text(form, `${key}.shortDefinition`), body: text(form, `${key}.body`), baNotes: text(form, `${key}.baNotes`) };
}

/** Maps the structured editor form to an unvalidated content object; the service schema remains authoritative. */
export function glossaryContentFromForm(form: FormLike) {
  const kind = text(form, 'kind');
  const status = text(form, 'regulation.status');
  return {
    schemaVersion: 1,
    kind,
    abbreviation: optional(form, 'abbreviation'),
    aliases: list(form, 'aliases'),
    domains: form.getAll('domains').filter((value): value is string => typeof value === 'string' && (glossaryDomains as readonly string[]).includes(value)),
    en: localeFields(form, 'en'),
    // Vietnamese is optional: omitted entirely when every Vietnamese field is blank.
    ...(['name', 'shortDefinition', 'body', 'baNotes'].some((key) => text(form, `vi.${key}`)) ? { vi: localeFields(form, 'vi') } : {}),
    ...(kind === 'REGULATION' ? {
      regulation: {
        jurisdiction: text(form, 'regulation.jurisdiction').toUpperCase(),
        issuer: text(form, 'regulation.issuer'),
        documentNumber: text(form, 'regulation.documentNumber'),
        issuedDate: optional(form, 'regulation.issuedDate'),
        effectiveDate: optional(form, 'regulation.effectiveDate'),
        status: (regulationStatuses as readonly string[]).includes(status) ? status : 'IN_FORCE',
        supersededBySlug: optional(form, 'regulation.supersededBySlug'),
      },
    } : {}),
    relatedEntrySlugs: list(form, 'relatedEntrySlugs'),
    relatedJourneySlugs: form.getAll('relatedJourneySlugs').filter((value): value is string => typeof value === 'string' && Boolean(value)),
    sources: parseGlossarySourceLines(text(form, 'sources')),
    lastVerifiedAt: optional(form, 'lastVerifiedAt'),
  };
}

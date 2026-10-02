import Link from 'next/link';
import type { Route } from 'next';
import { Container } from '@/components/ui/Container';
import { getCurrentLocale } from '@/i18n/server';
import { glossaryDisplayName, glossaryText } from '@/server/glossary/glossary-domain';
import { GlossaryRepository } from '@/server/glossary/glossary-repository';
import { glossaryCopy, glossaryKindLabels } from './glossary-copy';

/** Server-only panel: lists published glossary entries linked to a Journey that the reader may view. */
export async function RelatedGlossaryPanel({ userId, journeySlug }: { userId: string; journeySlug: string }) {
  const [locale, entries] = await Promise.all([getCurrentLocale(), GlossaryRepository.listRelatedToJourney(userId, journeySlug)]);
  if (!entries.length) return null;
  const copy = glossaryCopy[locale];
  return <section aria-labelledby="journey-glossary" className="border-t bg-bgLight px-4 py-10 sm:px-6"><Container>
    <h2 id="journey-glossary" className="text-2xl font-semibold text-navy">{copy.journeyPanel}</h2>
    <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{entries.map(({ slug, content }) => <li key={slug}><Link href={`/glossary/${slug}` as Route} className="block h-full rounded-2xl border bg-white p-4 hover:border-royalBlue">
      <span className="text-xs font-semibold uppercase text-royalBlue">{glossaryKindLabels[locale][content.kind]}{content.regulation ? ` · ${content.regulation.documentNumber}` : ''}</span>
      <span className="mt-1 block font-semibold text-navy">{glossaryDisplayName(content, locale)}</span>
      <span className="mt-2 line-clamp-2 block text-sm text-textSecondary">{glossaryText(content, locale).shortDefinition}</span>
    </Link></li>)}</ul>
  </Container></section>;
}

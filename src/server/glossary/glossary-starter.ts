import { z } from 'zod';
import { glossaryEntryContentSchema, glossaryEntryLinkedSlugs, glossarySelfReferences, glossarySlugPattern } from './glossary-domain';

export const glossaryStarterFileSchema = z.object({
  releaseId: z.string().regex(/^[a-z0-9-]+$/),
  note: z.string().optional(),
  entries: z.array(z.object({ slug: z.string().regex(glossarySlugPattern).max(120), content: glossaryEntryContentSchema }).strict()).min(1).max(500),
}).strict();

export type GlossaryStarterFile = z.infer<typeof glossaryStarterFileSchema>;

/** Validates a starter file; entry links must resolve inside the file or to already existing glossary slugs. */
export function validateGlossaryStarter(value: unknown, existingEntrySlugs: Iterable<string> = []) {
  const file = glossaryStarterFileSchema.parse(value);
  const slugs = file.entries.map((entry) => entry.slug);
  const duplicates = slugs.filter((slug, index) => slugs.indexOf(slug) !== index);
  if (duplicates.length) throw new Error(`Duplicate slugs: ${[...new Set(duplicates)].join(', ')}.`);
  const known = new Set([...slugs, ...existingEntrySlugs]);
  const problems = file.entries.flatMap(({ slug, content }) => [
    ...glossarySelfReferences(content, slug).map(() => `${slug}: links to itself`),
    ...glossaryEntryLinkedSlugs(content).filter((link) => !known.has(link)).map((link) => `${slug}: unknown entry ${link}`),
  ]);
  if (problems.length) throw new Error(`Invalid starter links: ${problems.join('; ')}.`);
  return file;
}

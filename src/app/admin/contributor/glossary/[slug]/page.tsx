import Link from 'next/link';
import { notFound } from 'next/navigation';
import { StatusLabel, WorkspaceTitle } from '@/components/workspace/WorkspaceShell';
import { glossaryDomainLabels, regulationStatusLabels } from '@/components/glossary/glossary-copy';
import { requireRole } from '@/lib/auth';
import { db } from '@/lib/db';
import { canEditRevision } from '@/lib/permissions';
import { requireJourneyCmsRouteAvailability } from '@/server/cms/journey-cms-environment';
import { glossaryDomains, glossarySlugPattern, parseGlossaryEntryContent, regulationStatuses } from '@/server/glossary/glossary-domain';
import { formatGlossarySourceLines } from '@/server/glossary/glossary-form';
import { GlossaryRepository } from '@/server/glossary/glossary-repository';
import {
  archiveGlossaryAction, createGlossaryDraftAction, publishGlossaryAction, reviewGlossaryAction, rollbackGlossaryAction,
  saveGlossaryFormAction, saveGlossaryJsonAction, submitGlossaryAction,
} from '../actions';

const input = 'min-h-11 w-full rounded-xl border px-3 font-normal';
const area = 'w-full rounded-xl border p-3 font-normal';
const field = 'grid gap-1 text-sm font-semibold text-navy';
const button = 'min-h-11 rounded-xl px-4 font-semibold';

function title(previewJson: string | null, fallback: string) { try { return (JSON.parse(previewJson ?? '{}') as { title?: string }).title ?? fallback; } catch { return fallback; } }

export default async function GlossaryEditorPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ error?: string }> }) {
  requireJourneyCmsRouteAvailability();
  const user = await requireRole('ADMIN');
  const [{ slug }, { error }] = await Promise.all([params, searchParams]);
  if (!glossarySlugPattern.test(slug)) notFound();
  const item = await GlossaryRepository.getForCms(slug);
  if (!item) notFound();
  const working = item.revisions.find((revision) => ['DRAFT', 'CHANGES_REQUESTED', 'IN_REVIEW'].includes(revision.status));
  const editable = working && canEditRevision(user.role, user.id, working.authorId, working.status);
  const content = parseGlossaryEntryContent(working?.contentJson ?? item.publishedRevision?.contentJson ?? '');
  const [journeys, entries] = await Promise.all([
    db.contentItem.findMany({ where: { type: 'BANKING_JOURNEY', isArchived: false, publishedRevisionId: { not: null } }, select: { slug: true, previewJson: true }, orderBy: { slug: 'asc' } }),
    db.contentItem.findMany({ where: { type: 'GLOSSARY_ENTRY', isArchived: false, publishedRevisionId: { not: null }, slug: { not: slug } }, select: { slug: true }, orderBy: { slug: 'asc' } }),
  ]);
  const hidden = (revisionId?: string) => <><input type="hidden" name="slug" value={slug}/>{revisionId ? <input type="hidden" name="revisionId" value={revisionId}/> : null}</>;

  return <>
    <Link href="/admin/contributor/glossary" className="text-sm font-semibold text-royalBlue">← Glossary & Regulations</Link>
    <WorkspaceTitle eyebrow={`Glossary · ${slug}`} title={content?.en.name ?? slug} description="Edit the working revision, submit it for review, then publish it independently. The slug is immutable." />
    {error ? <p role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">{error}</p> : null}
    <div className="mb-6 flex flex-wrap items-center gap-3 text-sm">
      <span>Published: {item.publishedRevision ? <>v{item.publishedRevision.version} <Link href={`/glossary/${slug}`} className="font-semibold text-royalBlue underline">view</Link></> : 'not yet'}</span>
      {working ? <span>Working: v{working.version} <StatusLabel status={working.status}/></span> : null}
      {item.isArchived ? <span className="font-semibold text-red-700">Archived</span> : null}
      {!working && item.publishedRevision && !item.isArchived ? <form action={createGlossaryDraftAction}>{hidden()}<button className={`${button} bg-navy text-white`}>Create new draft</button></form> : null}
      <form action={archiveGlossaryAction}>{hidden()}<input type="hidden" name="archived" value={item.isArchived ? 'false' : 'true'}/><button className={`${button} border text-navy`}>{item.isArchived ? 'Restore' : 'Archive'}</button></form>
    </div>

    {working?.reviewNote ? <div className="mb-6 rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm"><p className="font-semibold text-orange-900">Review feedback{working.reviewer ? ` from ${working.reviewer.name}` : ''}</p><p className="mt-1 whitespace-pre-line text-orange-900">{working.reviewNote}</p></div> : null}

    {editable && content ? <>
      <form action={saveGlossaryFormAction} className="grid gap-5 rounded-2xl border bg-white p-5">
        {hidden(working.id)}
        <div className="grid gap-4 md:grid-cols-3">
          <label className={field}>Type<select name="kind" defaultValue={content.kind} className={input}><option value="TERM">Term</option><option value="REGULATION">Regulation</option></select></label>
          <label className={field}>Abbreviation<input name="abbreviation" defaultValue={content.abbreviation ?? ''} maxLength={40} className={input}/></label>
          <label className={field}>Last verified<input type="date" name="lastVerifiedAt" defaultValue={content.lastVerifiedAt ?? ''} className={input}/></label>
        </div>
        <label className={field}>Aliases (comma or new line)<textarea name="aliases" rows={2} defaultValue={content.aliases.join('\n')} className={area}/></label>
        <fieldset><legend className="text-sm font-semibold text-navy">Domains</legend><div className="mt-2 flex flex-wrap gap-3">{glossaryDomains.map((domain) => <label key={domain} className="flex items-center gap-2 text-sm"><input type="checkbox" name="domains" value={domain} defaultChecked={content.domains.includes(domain)}/>{glossaryDomainLabels.en[domain]}</label>)}</div></fieldset>
        <div className="grid gap-5 lg:grid-cols-2">{(['en', 'vi'] as const).map((locale) => { const value = locale === 'en' ? content.en : content.vi; const required = locale === 'en'; return <fieldset key={locale} className="grid gap-3 rounded-xl border p-4">
          <legend className="px-1 text-sm font-semibold uppercase text-royalBlue">{locale === 'en' ? 'English (required, shown on /en)' : 'Tiếng Việt (optional, shown on /vi)'}</legend>
          <label className={field}>Name<input name={`${locale}.name`} required={required} defaultValue={value?.name ?? ''} maxLength={200} className={input}/></label>
          <label className={field}>Short definition<textarea name={`${locale}.shortDefinition`} required={required} rows={3} defaultValue={value?.shortDefinition ?? ''} maxLength={600} className={area}/></label>
          <label className={field}>Details (blank line between paragraphs)<textarea name={`${locale}.body`} rows={8} defaultValue={value?.body ?? ''} maxLength={20000} className={area}/></label>
          <label className={field}>BA notes<textarea name={`${locale}.baNotes`} rows={4} defaultValue={value?.baNotes ?? ''} maxLength={5000} className={area}/></label>
        </fieldset>; })}</div>
        <fieldset className="grid gap-3 rounded-xl border p-4 md:grid-cols-3">
          <legend className="px-1 text-sm font-semibold text-navy">Regulation details (used only when Type is Regulation)</legend>
          <label className={field}>Jurisdiction (VN, INTERNATIONAL, ISO code)<input name="regulation.jurisdiction" defaultValue={content.regulation?.jurisdiction ?? 'VN'} className={input}/></label>
          <label className={field}>Issuer<input name="regulation.issuer" defaultValue={content.regulation?.issuer ?? ''} className={input}/></label>
          <label className={field}>Document number<input name="regulation.documentNumber" defaultValue={content.regulation?.documentNumber ?? ''} className={input}/></label>
          <label className={field}>Issued date<input type="date" name="regulation.issuedDate" defaultValue={content.regulation?.issuedDate ?? ''} className={input}/></label>
          <label className={field}>Effective date<input type="date" name="regulation.effectiveDate" defaultValue={content.regulation?.effectiveDate ?? ''} className={input}/></label>
          <label className={field}>Status<select name="regulation.status" defaultValue={content.regulation?.status ?? 'IN_FORCE'} className={input}>{regulationStatuses.map((status) => <option key={status} value={status}>{regulationStatusLabels.en[status]}</option>)}</select></label>
          <label className={field}>Superseded by (entry slug)<input name="regulation.supersededBySlug" list="glossary-entry-slugs" defaultValue={content.regulation?.supersededBySlug ?? ''} className={input}/></label>
        </fieldset>
        <label className={field}>Related terms & regulations (slugs, comma separated)<input name="relatedEntrySlugs" list="glossary-entry-slugs" defaultValue={content.relatedEntrySlugs.join(', ')} className={input}/></label>
        <datalist id="glossary-entry-slugs">{entries.map((entry) => <option key={entry.slug} value={entry.slug}/>)}</datalist>
        <fieldset><legend className="text-sm font-semibold text-navy">Related Journeys</legend><div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{journeys.map((journey) => <label key={journey.slug} className="flex items-center gap-2 text-sm"><input type="checkbox" name="relatedJourneySlugs" value={journey.slug} defaultChecked={content.relatedJourneySlugs.includes(journey.slug)}/>{title(journey.previewJson, journey.slug)}</label>)}</div></fieldset>
        <label className={field}>Sources (one per line: Title | Publisher | https://url)<textarea name="sources" rows={4} defaultValue={formatGlossarySourceLines(content.sources)} className={area}/></label>
        <div className="flex flex-wrap gap-3"><button className={`${button} bg-royalBlue text-white`}>Save draft</button></div>
      </form>
      <details className="mt-5 rounded-2xl border bg-white p-5"><summary className="cursor-pointer font-semibold text-navy">Advanced JSON</summary>
        <form action={saveGlossaryJsonAction} className="mt-4 grid gap-3">{hidden(working.id)}<textarea name="contentJson" rows={20} defaultValue={JSON.stringify(content, null, 2)} className={`${area} font-mono text-xs`}/><button className={`${button} w-fit border text-navy`}>Save JSON draft</button></form>
      </details>
      <form action={submitGlossaryAction} className="mt-5">{hidden(working.id)}<button className={`${button} bg-navy text-white`}>Submit for review</button></form>
    </> : null}

    {working?.status === 'IN_REVIEW' ? <div className="mt-6 grid gap-4 rounded-2xl border bg-white p-5">
      <h2 className="text-lg font-semibold text-navy">Review v{working.version}</h2>
      {content ? <p className="text-sm text-textSecondary">{content.en.shortDefinition}</p> : null}
      <form action={publishGlossaryAction}>{hidden(working.id)}<button className={`${button} bg-emerald-700 text-white`}>Publish</button></form>
      <form action={reviewGlossaryAction} className="grid gap-2">{hidden(working.id)}<textarea name="reviewNote" rows={3} minLength={10} required placeholder="Review note (required, at least 10 characters)" className={area}/><div className="flex gap-2"><button name="decision" value="changes" className={`${button} border text-navy`}>Request changes</button><button name="decision" value="reject" className={`${button} border border-red-300 text-red-700`}>Reject</button></div></form>
    </div> : null}

    <section className="mt-8"><h2 className="text-lg font-semibold text-navy">Revision history</h2>
      <ul className="mt-3 divide-y rounded-2xl border bg-white">{item.revisions.map((revision) => <li key={revision.id} className="flex flex-wrap items-center gap-3 p-3 text-sm">
        <span className="font-semibold">v{revision.version}</span><StatusLabel status={revision.status}/>
        <span className="text-slate-500">by {revision.author?.name ?? '—'}{revision.reviewer ? ` · reviewed by ${revision.reviewer.name}` : ''}</span>
        {revision.id === item.publishedRevisionId ? <span className="font-semibold text-emerald-700">current</span> : null}
        {revision.status === 'PUBLISHED' && revision.id !== item.publishedRevisionId ? <form action={rollbackGlossaryAction} className="ml-auto">{hidden(revision.id)}<button className={`${button} border text-navy`}>Restore this version</button></form> : null}
      </li>)}</ul>
    </section>
  </>;
}

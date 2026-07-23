import Link from 'next/link';
import type { Route } from 'next';
import { Container } from '@/components/ui/Container';

export interface TocItem { id: string; label: string }
export interface RelatedLink { href: string; label: string; context: string }

export function ContentHero({ eyebrow, title, summary, parentLabel, parentHref, meta = [] }: { eyebrow: string; title: string; summary: string; parentLabel: string; parentHref: string; meta?: string[] }) {
  return <section className="bg-navy px-4 py-12 text-white sm:px-6 lg:px-8 lg:py-16"><Container>
    <nav aria-label="Breadcrumb" className="flex flex-wrap gap-2 text-sm text-slate-400"><Link href="/">Home</Link><span aria-hidden="true">/</span><Link href={parentHref as Route}>{parentLabel}</Link><span aria-hidden="true">/</span><span aria-current="page">{title}</span></nav>
    <p className="mt-8 text-sm font-semibold text-goldLight">{eyebrow}</p><h1 className="mt-3 max-w-4xl text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">{title}</h1>
    <p className="mt-5 max-w-3xl text-base leading-7 text-slate-300 sm:text-lg">{summary}</p>
    {meta.length ? <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-300">{meta.map((item) => <li key={item}>{item}</li>)}</ul> : null}
  </Container></section>;
}

export function ArticleLayout({ toc, children }: { toc: TocItem[]; children: React.ReactNode }) {
  return <div className="grid gap-10 lg:grid-cols-[220px_minmax(0,820px)] lg:justify-center">
    <aside className="lg:sticky lg:top-24 lg:self-start"><details open className="rounded-2xl border border-slate-200 bg-white p-4"><summary className="min-h-11 cursor-pointer font-semibold text-textPrimary">On this page</summary><nav aria-label="Table of contents"><ol className="mt-2 space-y-1">{toc.map((item) => <li key={item.id}><a href={`#${item.id}`} className="block rounded-lg px-2 py-2 text-sm text-textSecondary hover:bg-slate-50 hover:text-royalBlue">{item.label}</a></li>)}</ol></nav></details></aside>
    <article className="min-w-0 space-y-12">{children}</article>
  </div>;
}

export function ContentSection({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return <section id={id}><h2 className="text-2xl font-semibold tracking-tight text-navy sm:text-3xl">{title}</h2><div className="mt-5 text-[15px] leading-7 text-textSecondary">{children}</div></section>;
}
export function List({ items }: { items: string[] }) {
  return <ul className="space-y-2">{items.map((item) => <li key={item} className="flex gap-3"><span aria-hidden="true" className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-goldAccent" /><span>{item}</span></li>)}</ul>;
}
export function ProcessFlow({ steps }: { steps: { title: string; description: string }[] }) {
  return <ol className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{steps.map((step, index) => <li key={`${step.title}-${index}`} className="rounded-2xl border border-slate-200 bg-white p-4"><span className="text-xs font-semibold text-goldAccent">Step {index + 1}</span><h3 className="mt-2 font-semibold text-textPrimary">{step.title}</h3><p className="mt-2 text-sm leading-6">{step.description}</p></li>)}</ol>;
}
export function Callout({ label, children }: { label: string; children: React.ReactNode }) {
  return <aside className="rounded-2xl border-l-4 border-goldAccent bg-goldPale p-5"><p className="font-semibold text-navy">{label}</p><div className="mt-2 text-sm leading-6 text-slate-700">{children}</div></aside>;
}
export function RelatedContent({ title, links }: { title: string; links: RelatedLink[] }) {
  if (!links.length) return null;
  return <section><h2 className="text-2xl font-semibold text-navy">{title}</h2><div className="mt-4 grid gap-3 sm:grid-cols-2">{links.map((link) => <Link key={link.href} href={link.href as Route} className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-royalBlue/40"><span className="text-xs font-semibold text-slate-500">{link.context}</span><span className="mt-1 block font-semibold text-royalBlue">{link.label}</span></Link>)}</div></section>;
}
export function PreviousNext({ previous, next, backHref, backLabel }: { previous?: RelatedLink; next?: RelatedLink; backHref: string; backLabel: string }) {
  return <nav aria-label="Reading navigation" className="grid gap-3 border-t border-slate-200 pt-8 sm:grid-cols-3">{previous ? <Link href={previous.href as Route} className="min-h-16 rounded-xl border border-slate-200 p-3 text-sm"><span className="text-slate-500">Previous</span><span className="block font-semibold text-royalBlue">{previous.label}</span></Link> : <span />}<Link href={backHref as Route} className="flex min-h-16 items-center justify-center rounded-xl border border-slate-200 p-3 text-center text-sm font-semibold text-navy">{backLabel}</Link>{next ? <Link href={next.href as Route} className="min-h-16 rounded-xl border border-slate-200 p-3 text-right text-sm"><span className="text-slate-500">Next</span><span className="block font-semibold text-royalBlue">{next.label}</span></Link> : <span />}</nav>;
}
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }} />;
}

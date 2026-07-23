'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { BankingJourney } from '@/data/banking-journeys';

export function JourneyExplorer({ journeys, categories, slugs }: { journeys: BankingJourney[]; categories: string[]; slugs: Record<string, string> }) {
  const [selectedId, setSelectedId] = useState(journeys[0].id);
  const selected = journeys.find((journey) => journey.id === selectedId) ?? journeys[0];
  const selectedSlug = slugs[selected.name];

  return (
    <div className="grid gap-6 lg:grid-cols-[310px_1fr]">
      <aside aria-label="Banking journey navigation" className="rounded-[18px] border border-slate-200 bg-white p-3 shadow-sm">
        {categories.map((category) => (
          <div key={category} className="mb-4 last:mb-0">
            <h2 className="px-3 pb-2 pt-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{category}</h2>
            <div className="space-y-1">
              {journeys.filter((journey) => journey.category === category).map((journey) => {
                const active = journey.id === selected.id;
                return (
                  <button
                    key={journey.id}
                    type="button"
                    onClick={() => setSelectedId(journey.id)}
                    aria-pressed={active}
                    className={`min-h-11 w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-royalBlue ${active ? 'bg-navy text-white shadow-sm' : 'text-slate-700 hover:bg-slate-50'}`}
                  >
                    {journey.name}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </aside>

      <article aria-live="polite" className="rounded-[20px] border border-slate-200 bg-white p-5 shadow-sm sm:p-7 lg:p-8">
        <p className="text-sm font-semibold text-royalBlue">{selected.category}</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-textPrimary">{selected.name}</h2>
        <p className="mt-4 max-w-3xl leading-7 text-textSecondary">{selected.description}</p>
        {selectedSlug ? <Link href={`/banking-journeys/${selectedSlug}`} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-royalBlue px-4 py-2 text-sm font-semibold text-white">Read Full Journey <ArrowRight className="h-4 w-4" /></Link> : null}

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <Detail title="Customer goal"><p>{selected.customerGoal}</p></Detail>
          <Detail title="Key actors"><TagList items={selected.actors} /></Detail>
          <Detail title="Core capabilities"><TagList items={selected.capabilities} /></Detail>
          <Detail title="Example business process"><NumberedList items={selected.process} /></Detail>
          <Detail title="Example business rules"><BulletList items={selected.rules} /></Detail>
          <Detail title="Systems and channels"><TagList items={selected.systems} /></Detail>
          <Detail title="Risks and controls"><BulletList items={selected.risks} /></Detail>
          <Detail title="Typical BA outputs"><BulletList items={selected.outputs} /></Detail>
        </div>
        <div className="mt-7 border-t border-slate-200 pt-6">
          <h3 className="font-semibold text-textPrimary">Related case studies</h3>
          <TagList items={selected.relatedCases} />
        </div>
      </article>
    </div>
  );
}

function Detail({ title, children }: { title: string; children: React.ReactNode }) {
  return <section><h3 className="mb-3 text-sm font-semibold text-textPrimary">{title}</h3><div className="text-sm leading-6 text-textSecondary">{children}</div></section>;
}
function TagList({ items }: { items: string[] }) {
  return <ul className="flex flex-wrap gap-2">{items.map((item) => <li key={item} className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-sm">{item}</li>)}</ul>;
}
function BulletList({ items }: { items: string[] }) {
  return <ul className="space-y-2">{items.map((item) => <li key={item} className="flex gap-2"><span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-goldAccent" />{item}</li>)}</ul>;
}
function NumberedList({ items }: { items: string[] }) {
  return <ol className="space-y-2">{items.map((item, index) => <li key={item} className="flex gap-2"><span className="font-semibold text-navyMid">{index + 1}.</span>{item}</li>)}</ol>;
}

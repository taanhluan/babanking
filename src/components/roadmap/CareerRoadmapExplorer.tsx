'use client';

import { useState } from 'react';
import type { KeyboardEvent } from 'react';
import Link from 'next/link';
import type { CareerLevel } from '@/data/career-roadmap';

export function CareerRoadmapExplorer({ levels, slugs }: { levels: CareerLevel[]; slugs: string[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = levels[activeIndex];
  const detailSlug = slugs[activeIndex];

  const selectByKey = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next = index;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % levels.length;
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index - 1 + levels.length) % levels.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = levels.length - 1;
    else return;
    event.preventDefault();
    setActiveIndex(next);
    document.getElementById(`career-tab-${next}`)?.focus();
  };

  return (
    <div>
      <div role="tablist" aria-label="Career levels" className="relative grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
        <div aria-hidden="true" className="absolute left-[5%] right-[5%] top-6 hidden h-px bg-slate-200 lg:block" />
        {levels.map((level, index) => {
          const selected = index === activeIndex;
          return (
            <button
              key={level.id}
              id={`career-tab-${index}`}
              role="tab"
              type="button"
              aria-selected={selected}
              aria-controls="career-detail"
              tabIndex={selected ? 0 : -1}
              onKeyDown={(event) => selectByKey(event, index)}
              onClick={() => setActiveIndex(index)}
              className={`relative min-h-16 rounded-2xl border px-3 py-3 text-left text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-royalBlue lg:min-h-24 ${selected ? 'border-goldAccent bg-goldPale text-navy' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}
            >
              <span className={`mb-2 inline-flex h-7 w-7 items-center justify-center rounded-lg text-xs ${selected ? 'bg-goldAccent text-navy' : 'bg-slate-100 text-slate-600'}`}>{index + 1}</span>
              <span className="block">{level.shortName}</span>
            </button>
          );
        })}
      </div>

      <article id="career-detail" role="tabpanel" aria-labelledby={`career-tab-${activeIndex}`} className="mt-6 rounded-[20px] border border-slate-200 bg-white p-5 shadow-sm sm:p-7 lg:p-8">
        <p className="text-sm font-semibold text-royalBlue">Active career level</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-textPrimary">{active.name}</h2>
        <p className="mt-3 max-w-3xl leading-7 text-textSecondary">{active.overview}</p>
        {detailSlug ? <Link href={`/career-roadmap/${detailSlug}`} className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-royalBlue px-4 py-2 text-sm font-semibold text-white">View Level Details</Link> : null}
        <div className="mt-7 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          <Detail title="Primary focus"><p>{active.focus}</p></Detail>
          <Detail title="Expected banking knowledge" items={active.knowledge} />
          <Detail title="Core responsibilities" items={active.responsibilities} />
          <Detail title="Expected deliverables" items={active.deliverables} />
          <Detail title="Stakeholder scope"><p>{active.stakeholders}</p></Detail>
          <Detail title="Recommended practice areas" items={active.practice} />
        </div>
        <div className="mt-7 rounded-2xl bg-goldPale p-5">
          <h3 className="font-semibold text-navy">Readiness indicators for the next level</h3>
          <ul className="mt-3 grid gap-2 md:grid-cols-3">{active.readiness.map((item) => <li key={item} className="flex gap-2 text-sm leading-6 text-slate-700"><span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-goldAccent" />{item}</li>)}</ul>
        </div>
      </article>
    </div>
  );
}

function Detail({ title, items, children }: { title: string; items?: string[]; children?: React.ReactNode }) {
  return <section><h3 className="text-sm font-semibold text-textPrimary">{title}</h3>{items ? <ul className="mt-2 space-y-1.5 text-sm leading-6 text-textSecondary">{items.map((item) => <li key={item}>• {item}</li>)}</ul> : <div className="mt-2 text-sm leading-6 text-textSecondary">{children}</div>}</section>;
}

'use client';

import { useMemo, useState } from 'react';
import type { CaseStudy, ContentType } from '@/data/case-studies';
import { CaseStudyCard } from './CaseStudyCard';

export function CaseStudyLibrary({ studies }: { studies: CaseStudy[] }) {
  const [query, setQuery] = useState('');
  const [type, setType] = useState<'All' | ContentType>('All');
  const [domain, setDomain] = useState('All');
  const types = ['All', ...new Set(studies.map((study) => study.contentType))] as const;
  const domains = ['All', ...new Set(studies.map((study) => study.domain))];
  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return studies.filter((study) => {
      const haystack = `${study.title} ${study.summary} ${study.topics.join(' ')}`.toLowerCase();
      return (!normalized || haystack.includes(normalized)) && (type === 'All' || study.contentType === type) && (domain === 'All' || study.domain === domain);
    });
  }, [domain, query, studies, type]);
  const reset = () => { setQuery(''); setType('All'); setDomain('All'); };

  return (
    <div>
      <div className="rounded-[18px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <label htmlFor="case-search" className="text-sm font-semibold text-textPrimary">Search the knowledge library</label>
        <input id="case-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search titles, summaries, and topics" className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none transition focus:border-royalBlue focus:ring-2 focus:ring-royalBlue/15" />
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Filter label="Content type" value={type} onChange={(value) => setType(value as 'All' | ContentType)} options={[...types]} />
          <Filter label="Banking domain" value={domain} onChange={setDomain} options={domains} />
        </div>
        <div className="mt-4 flex items-center justify-between text-sm">
          <p aria-live="polite" className="text-textSecondary">{results.length} result{results.length === 1 ? '' : 's'}</p>
          <button type="button" onClick={reset} className="min-h-11 rounded-xl px-3 font-semibold text-royalBlue hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-royalBlue">Reset filters</button>
        </div>
      </div>
      {results.length ? (
        <div className="mt-7 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{results.map((study) => <div id={study.slug} key={study.slug}><CaseStudyCard study={study} /></div>)}</div>
      ) : (
        <div className="mt-7 rounded-[18px] border border-dashed border-slate-300 bg-white p-10 text-center">
          <h2 className="text-xl font-semibold text-textPrimary">No matching case studies</h2>
          <p className="mt-2 text-textSecondary">Try a broader search or reset the active filters.</p>
          <button type="button" onClick={reset} className="mt-4 min-h-11 rounded-xl bg-royalBlue px-4 py-2 text-sm font-semibold text-white">Reset filters</button>
        </div>
      )}
    </div>
  );
}

function Filter({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: readonly string[] }) {
  return <label className="text-sm font-semibold text-textPrimary">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-normal outline-none focus:border-royalBlue focus:ring-2 focus:ring-royalBlue/15">{options.map((option) => <option key={option}>{option}</option>)}</select></label>;
}

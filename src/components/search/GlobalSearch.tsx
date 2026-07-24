'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
type SearchContentType = 'Banking Journey' | 'BA Practice' | 'Case Study' | 'Career Level';
type SearchRecord = { type: SearchContentType; title: string; summary: string; keywords: string[]; context: string; url: string };

export function GlobalSearch({ records, initialQuery }: { records: SearchRecord[]; initialQuery: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [type, setType] = useState<'All' | SearchContentType>('All');
  const results = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return [];
    return records.filter((record) => (type === 'All' || record.type === type) && `${record.title} ${record.summary} ${record.context} ${record.keywords.join(' ')}`.toLowerCase().includes(value));
  }, [query, records, type]);
  const reset = () => { setQuery(''); setType('All'); };
  return <div>
    <div className="rounded-[18px] border border-slate-200 bg-white p-5 shadow-sm">
      <label htmlFor="global-search" className="font-semibold text-textPrimary">Search banking and BA knowledge</label>
      <input id="global-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Try payments, KYC, gap analysis, or Senior BA" className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 px-4 outline-none focus:border-royalBlue" />
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end"><label className="flex-1 text-sm font-semibold">Content type<select value={type} onChange={(event) => setType(event.target.value as 'All' | SearchContentType)} className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 font-normal"><option>All</option><option>Banking Journey</option><option>BA Practice</option><option>Case Study</option><option>Career Level</option></select></label><button type="button" onClick={reset} className="min-h-11 rounded-xl px-4 font-semibold text-royalBlue">Reset</button></div>
    </div>
    {!query.trim() ? <div className="mt-8"><h2 className="text-xl font-semibold">Suggested starting topics</h2><div className="mt-3 flex flex-wrap gap-2">{['Payments', 'Customer onboarding', 'Fit-gap analysis', 'Business rules', 'Senior BA'].map((topic) => <button key={topic} onClick={() => setQuery(topic)} className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm">{topic}</button>)}</div></div> : results.length ? <div className="mt-8"><p aria-live="polite" className="text-sm text-textSecondary">{results.length} results</p><div className="mt-4 grid gap-4 md:grid-cols-2">{results.map((record) => <Link key={record.url} href={record.url as Route} className="rounded-2xl border border-slate-200 bg-white p-5 hover:border-royalBlue/40"><span className="text-xs font-semibold text-goldAccent">{record.type} · {record.context}</span><h2 className="mt-2 text-xl font-semibold">{record.title}</h2><p className="mt-2 text-sm leading-6 text-textSecondary">{record.summary}</p></Link>)}</div></div> : <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center"><h2 className="text-xl font-semibold">No matching knowledge found</h2><p className="mt-2 text-textSecondary">Try a broader topic or reset the search.</p></div>}
  </div>;
}

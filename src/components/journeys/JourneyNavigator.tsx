'use client';

import Link from 'next/link';
import { ChevronLeft, ChevronRight, Menu, Search, X } from 'lucide-react';
import { useEffect, useReducer, useRef, useState, type ReactNode } from 'react';
import { buildStageHref, type JourneySectionLink, type JourneyStageLink } from './journey-navigation';

type NavigatorState = { mobileOpen: boolean; collapsed: boolean };
type NavigatorAction = { type: 'OPEN' | 'CLOSE' | 'SELECT' | 'TOGGLE_COLLAPSE' };
export function journeyNavigatorReducer(state: NavigatorState, action: NavigatorAction): NavigatorState {
  if (action.type === 'OPEN') return { ...state, mobileOpen: true };
  if (action.type === 'CLOSE' || action.type === 'SELECT') return { ...state, mobileOpen: false };
  return { ...state, collapsed: !state.collapsed };
}

function StageList({ stages, slug, paymentType, selectedStage, query, onSelect }: { stages: JourneyStageLink[]; slug: string; paymentType: string; selectedStage: string; query: string; onSelect?: () => void }) {
  const normalized = query.trim().toLowerCase();
  const filtered = normalized ? stages.filter((stage) => `${stage.title} ${stage.sections.map((section) => section.title).join(' ')}`.toLowerCase().includes(normalized)) : stages;
  return <nav aria-label="Journey stages" className="space-y-1">
    {filtered.map((stage, index) => <div key={stage.id}>
      <Link href={buildStageHref(slug, paymentType, stage.id)} onClick={onSelect} aria-current={selectedStage === stage.id ? 'step' : undefined} className={`block rounded-xl border px-3 py-2.5 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-royalBlue ${selectedStage === stage.id ? 'border-blue-300 bg-blue-50 text-royalBlue shadow-sm' : 'border-transparent text-navy hover:border-slate-200 hover:bg-white'}`}>
        <span className="text-xs font-semibold text-slate-500">{index + 1}</span>
        <span className="ml-2 text-sm font-semibold">{stage.title}</span>
        <span className="mt-1 block pl-5 text-xs text-slate-500">{stage.sectionCount} sections</span>
      </Link>
      {normalized && stage.sections.length ? <div className="ml-7 mt-1 space-y-1">{stage.sections.filter((section) => section.title.toLowerCase().includes(normalized)).map((section) => <Link key={section.id} href={buildStageHref(slug, paymentType, stage.id, section.id)} onClick={onSelect} className="block min-h-10 rounded-lg px-2 py-2 text-xs text-textSecondary hover:bg-white hover:text-royalBlue">{section.title}</Link>)}</div> : null}
    </div>)}
    {!filtered.length ? <p className="rounded-xl border border-dashed border-slate-300 p-3 text-sm text-textSecondary">No matching stage or section.</p> : null}
  </nav>;
}

export function JourneyReaderLayout({ stages, selectedStage, slug, paymentType, children }: { stages: JourneyStageLink[]; selectedStage: string; slug: string; paymentType: string; children: ReactNode }) {
  const [state, dispatch] = useReducer(journeyNavigatorReducer, { mobileOpen: false, collapsed: false });
  const [query, setQuery] = useState('');
  const triggerButton = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const current = stages.find((stage) => stage.id === selectedStage) ?? stages[0];
  useEffect(() => {
    if (!state.mobileOpen) return;
    const trigger = triggerButton.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButton.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') dispatch({ type: 'CLOSE' }); };
    window.addEventListener('keydown', closeOnEscape);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener('keydown', closeOnEscape); trigger?.focus(); };
  }, [state.mobileOpen]);
  const search = <label className="relative block"><span className="sr-only">Search in this journey</span><Search aria-hidden="true" className="absolute left-3 top-3 h-4 w-4 text-slate-400"/><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search in this journey..." className="min-h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-royalBlue"/></label>;
  return <>
    <button ref={triggerButton} type="button" onClick={() => dispatch({ type: 'OPEN' })} aria-expanded={state.mobileOpen} aria-controls="mobile-journey-navigator" className="mb-4 flex min-h-12 w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 text-left font-semibold text-navy md:hidden"><span><span className="block text-xs font-medium text-slate-500">Stage</span>{current?.title ?? 'Journey Navigator'}</span><Menu aria-hidden="true" className="h-5 w-5 text-royalBlue"/></button>
    <div className={`grid min-w-0 gap-5 transition-[grid-template-columns] md:items-start ${state.collapsed ? 'md:grid-cols-[64px_minmax(0,1fr)]' : 'md:grid-cols-[200px_minmax(0,1fr)] lg:grid-cols-[220px_minmax(0,1fr)]'}`}>
      <aside className="sticky top-24 hidden max-h-[calc(100vh-7rem)] min-w-0 overflow-y-auto rounded-2xl border border-slate-200 bg-bgLight p-2 md:block">
        <div className="flex items-center justify-between gap-2 px-1 py-1"><p className={state.collapsed ? 'sr-only' : 'text-xs font-semibold uppercase tracking-wide text-royalBlue'}>Journey Navigator</p><button type="button" onClick={() => dispatch({ type: 'TOGGLE_COLLAPSE' })} aria-label={state.collapsed ? 'Expand Journey Navigator' : 'Collapse Journey Navigator'} aria-expanded={!state.collapsed} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-royalBlue">{state.collapsed ? <ChevronRight/> : <ChevronLeft/>}</button></div>
        {!state.collapsed ? <div className="mt-2 space-y-3">{search}<StageList stages={stages} slug={slug} paymentType={paymentType} selectedStage={selectedStage} query={query}/></div> : <div className="mt-2 grid gap-2">{stages.map((stage, index) => <Link key={stage.id} href={buildStageHref(slug, paymentType, stage.id)} aria-current={selectedStage === stage.id ? 'step' : undefined} aria-label={`${index + 1}. ${stage.title}`} className={`flex h-10 items-center justify-center rounded-xl text-sm font-semibold ${selectedStage === stage.id ? 'bg-royalBlue text-white' : 'bg-white text-navy'}`}>{index + 1}</Link>)}</div>}
      </aside>
      <div className="min-w-0 max-w-full">{children}</div>
    </div>
    {state.mobileOpen ? <div className="fixed inset-0 z-[70] md:hidden"><button type="button" aria-label="Close Journey Navigator" onClick={() => dispatch({ type: 'CLOSE' })} className="absolute inset-0 bg-navy/60"/><section id="mobile-journey-navigator" role="dialog" aria-modal="true" aria-labelledby="mobile-journey-title" className="absolute inset-y-0 right-0 w-[min(90vw,360px)] overflow-y-auto bg-bgLight p-4 shadow-2xl"><div className="flex items-center justify-between"><h2 id="mobile-journey-title" className="font-semibold text-navy">Journey Navigator</h2><button ref={closeButton} type="button" onClick={() => dispatch({ type: 'CLOSE' })} aria-label="Close Journey Navigator" className="flex h-11 w-11 items-center justify-center rounded-xl border bg-white"><X/></button></div><div className="mt-4 space-y-4">{search}<StageList stages={stages} slug={slug} paymentType={paymentType} selectedStage={selectedStage} query={query} onSelect={() => dispatch({ type: 'SELECT' })}/></div></section></div> : null}
  </>;
}

export function SectionNavigator({ sections }: { sections: JourneySectionLink[] }) {
  const [active, setActive] = useState('');
  useEffect(() => { const sync = () => setActive(window.location.hash.slice(1)); sync(); window.addEventListener('hashchange', sync); return () => window.removeEventListener('hashchange', sync); }, []);
  if (!sections.length) return null;
  return <nav aria-label="Stage sections" className="sticky top-[72px] z-20 -mx-4 mt-5 overflow-x-auto border-y border-slate-200 bg-white/95 px-4 py-2 backdrop-blur sm:mx-0 sm:rounded-xl sm:border sm:px-2"><div className="flex min-w-max gap-1">{sections.map((section) => { const anchor=`state-${section.id}`; return <a key={section.id} href={`#${anchor}`} onClick={() => setActive(anchor)} aria-current={active === anchor ? 'location' : undefined} className={`flex min-h-10 items-center rounded-lg px-3 text-sm font-semibold ${active === anchor ? 'bg-blue-50 text-royalBlue' : 'text-textSecondary hover:bg-slate-50 hover:text-navy'}`}>{section.title}</a>; })}</div></nav>;
}

export function BackToTop() {
  const [visible,setVisible]=useState(false);
  useEffect(()=>{const update=()=>setVisible(window.scrollY>700);update();window.addEventListener('scroll',update,{passive:true});return()=>window.removeEventListener('scroll',update)},[]);
  if(!visible)return null;
  return <button type="button" onClick={()=>window.scrollTo({top:0,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'})} aria-label="Back to top" className="fixed bottom-5 right-4 z-30 min-h-11 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-royalBlue shadow-lg sm:right-6">↑ Top</button>;
}

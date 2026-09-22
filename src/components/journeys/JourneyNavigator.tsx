'use client';

import Link from 'next/link';
import { ChevronLeft, ChevronRight, Menu, Search, X } from 'lucide-react';
import { useEffect, useReducer, useRef, useState, type ReactNode } from 'react';
import { buildStageHref, type JourneyNavigationConfig, type JourneySectionLink, type JourneyStageLink } from './journey-navigation';

type NavigatorState = { mobileOpen: boolean; collapsed: boolean };
type NavigatorAction = { type: 'OPEN' | 'CLOSE' | 'SELECT' | 'TOGGLE_COLLAPSE' };
export function journeyNavigatorReducer(state: NavigatorState, action: NavigatorAction): NavigatorState {
  if (action.type === 'OPEN') return { ...state, mobileOpen: true };
  if (action.type === 'CLOSE' || action.type === 'SELECT') return { ...state, mobileOpen: false };
  return { ...state, collapsed: !state.collapsed };
}

type StageListProps = {
  stages: JourneyStageLink[];
  navigation: JourneyNavigationConfig;
  selectedStage: string;
  query: string;
  expandedStages: Set<string>;
  onToggleStage: (stageId: string) => void;
  onSelect?: () => void;
};

function StageList({ stages, navigation, selectedStage, query, expandedStages, onToggleStage, onSelect }: StageListProps) {
  const normalized = query.trim().toLowerCase();
  const filtered = normalized ? stages.filter((stage) => `${stage.title} ${stage.sections.flatMap((section) => [section.title, ...(section.children ?? []).map((child) => child.title)]).join(' ')}`.toLowerCase().includes(normalized)) : stages;
  const focusSection = (sectionId: string) => {
    let attempts = 0;
    const scrollWhenReady = () => {
      const target = document.getElementById(`state-${sectionId}`);
      if (target) {
        target.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
        return;
      }
      if (attempts < 20) { attempts += 1; window.setTimeout(scrollWhenReady, 50); }
    };
    window.setTimeout(scrollWhenReady, 0);
  };
  const selectSection = (sectionId: string) => { onSelect?.(); focusSection(sectionId); };
  return <nav aria-label="Journey stages" className="space-y-1">
    {filtered.map((stage, index) => {
      const isExpanded = normalized.length > 0 || expandedStages.has(stage.id);
      return <div key={stage.id}>
        <div className="flex items-stretch gap-1">
          <Link href={buildStageHref(navigation, stage.id)} onClick={onSelect} aria-current={selectedStage === stage.id ? 'step' : undefined} className={`min-w-0 flex-1 rounded-xl border px-3 py-2.5 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-royalBlue ${selectedStage === stage.id ? 'border-blue-300 bg-blue-50 text-royalBlue shadow-sm' : 'border-transparent text-navy hover:border-slate-200 hover:bg-white'}`}>
            <span className="text-xs font-semibold text-slate-500">{index + 1}</span>
            <span className="ml-2 text-sm font-semibold">{stage.title}</span>
            <span className="mt-1 block pl-5 text-xs text-slate-500">{stage.sectionCount} sections</span>
          </Link>
          {stage.sections.length ? <button type="button" onClick={() => onToggleStage(stage.id)} aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${stage.title}`} aria-expanded={isExpanded} className="flex w-9 shrink-0 items-center justify-center rounded-xl border border-transparent text-slate-500 transition hover:border-slate-200 hover:bg-white hover:text-royalBlue focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-royalBlue"><ChevronRight aria-hidden="true" className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}/></button> : null}
        </div>
        {stage.sections.length && isExpanded ? <div className="ml-7 mt-1 space-y-1">{stage.sections.map((section, sectionIndex) => <div key={section.id}><Link href={buildStageHref(navigation, stage.id, section.id)} onClick={() => selectSection(section.id)} className="block min-h-9 rounded-lg px-2 py-1.5 text-xs text-textSecondary hover:bg-white hover:text-royalBlue">{index + 1}.{sectionIndex + 1} {section.title}</Link>{section.children?.map((child, childIndex) => <Link key={child.id} href={buildStageHref(navigation, stage.id, child.id)} onClick={() => selectSection(child.id)} className="block min-h-8 rounded-lg px-2 py-1 pl-5 text-xs text-slate-500 hover:bg-white hover:text-royalBlue">{index + 1}.{sectionIndex + 1}.{childIndex + 1} {child.title}</Link>)}</div>)}</div> : null}
      </div>;
    })}
    {!filtered.length ? <p className="rounded-xl border border-dashed border-slate-300 p-3 text-sm text-textSecondary">No matching stage or section.</p> : null}
  </nav>;
}

export function JourneyReaderLayout({ stages, selectedStage, navigation, children }: { stages: JourneyStageLink[]; selectedStage: string; navigation: JourneyNavigationConfig; children: ReactNode }) {
  const [state, dispatch] = useReducer(journeyNavigatorReducer, { mobileOpen: false, collapsed: false });
  const [query, setQuery] = useState('');
  const [expandedStages, setExpandedStages] = useState<Set<string>>(() => new Set(stages.filter((stage) => stage.sections.length).map((stage) => stage.id)));
  const triggerButton = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const current = stages.find((stage) => stage.id === selectedStage) ?? stages[0];
  const toggleStage = (stageId: string) => setExpandedStages((previous) => { const next = new Set(previous); if (next.has(stageId)) next.delete(stageId); else next.add(stageId); return next; });
  const expandAll = () => setExpandedStages(new Set(stages.filter((stage) => stage.sections.length).map((stage) => stage.id)));
  const collapseAll = () => setExpandedStages(new Set());
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
        {!state.collapsed ? <div className="mt-2 space-y-3">{search}<div className="flex items-center justify-end gap-1"><button type="button" onClick={expandAll} className="rounded-md px-2 py-1 text-[11px] font-semibold text-royalBlue hover:bg-white">Expand all</button><span className="text-slate-300">|</span><button type="button" onClick={collapseAll} className="rounded-md px-2 py-1 text-[11px] font-semibold text-textSecondary hover:bg-white hover:text-royalBlue">Collapse all</button></div><StageList stages={stages} navigation={navigation} selectedStage={selectedStage} query={query} expandedStages={expandedStages} onToggleStage={toggleStage}/></div> : <div className="mt-2 grid gap-2">{stages.map((stage, index) => <Link key={stage.id} href={buildStageHref(navigation, stage.id)} aria-current={selectedStage === stage.id ? 'step' : undefined} aria-label={`${index + 1}. ${stage.title}`} className={`flex h-10 items-center justify-center rounded-xl text-sm font-semibold ${selectedStage === stage.id ? 'bg-royalBlue text-white' : 'bg-white text-navy'}`}>{index + 1}</Link>)}</div>}
      </aside>
      <div className="min-w-0 max-w-full">{children}</div>
    </div>
    {state.mobileOpen ? <div className="fixed inset-0 z-[70] md:hidden"><button type="button" aria-label="Close Journey Navigator" onClick={() => dispatch({ type: 'CLOSE' })} className="absolute inset-0 bg-navy/60"/><section id="mobile-journey-navigator" role="dialog" aria-modal="true" aria-labelledby="mobile-journey-title" className="absolute inset-y-0 right-0 w-[min(90vw,360px)] overflow-y-auto bg-bgLight p-4 shadow-2xl"><div className="flex items-center justify-between"><h2 id="mobile-journey-title" className="font-semibold text-navy">Journey Navigator</h2><button ref={closeButton} type="button" onClick={() => dispatch({ type: 'CLOSE' })} aria-label="Close Journey Navigator" className="flex h-11 w-11 items-center justify-center rounded-xl border bg-white"><X/></button></div><div className="mt-4 space-y-4">{search}<div className="flex items-center justify-end gap-1"><button type="button" onClick={expandAll} className="rounded-md px-2 py-1 text-[11px] font-semibold text-royalBlue hover:bg-white">Expand all</button><span className="text-slate-300">|</span><button type="button" onClick={collapseAll} className="rounded-md px-2 py-1 text-[11px] font-semibold text-textSecondary hover:bg-white hover:text-royalBlue">Collapse all</button></div><StageList stages={stages} navigation={navigation} selectedStage={selectedStage} query={query} expandedStages={expandedStages} onToggleStage={toggleStage} onSelect={() => dispatch({ type: 'SELECT' })}/></div></section></div> : null}
  </>;
}

export function SectionNavigator({ sections }: { sections: JourneySectionLink[] }) {
  const [active, setActive] = useState('');
  useEffect(() => { const sync = () => setActive(window.location.hash.slice(1)); sync(); window.addEventListener('hashchange', sync); return () => window.removeEventListener('hashchange', sync); }, []);
  if (!sections.length) return null;
  return <nav aria-label="Stage sections" className="sticky top-[72px] z-20 -mx-4 mt-5 overflow-x-auto border-y border-slate-200 bg-white/95 px-4 py-2 backdrop-blur sm:mx-0 sm:rounded-xl sm:border sm:px-2"><div className="flex min-w-max gap-1">{sections.map((section, index) => { const anchor=`state-${section.id}`; return <div key={section.id} className="flex items-center gap-1"><a href={`#${anchor}`} onClick={() => setActive(anchor)} aria-current={active === anchor ? 'location' : undefined} className={`flex min-h-10 items-center rounded-lg px-3 text-sm font-semibold ${active === anchor ? 'bg-blue-50 text-royalBlue' : 'text-textSecondary hover:bg-slate-50 hover:text-navy'}`}>{index + 1}. {section.title}</a>{section.children?.map((child, childIndex) => { const childAnchor=`state-${child.id}`; return <a key={child.id} href={`#${childAnchor}`} onClick={() => setActive(childAnchor)} className={`hidden min-h-10 items-center rounded-lg px-2 text-xs md:flex ${active === childAnchor ? 'bg-blue-50 text-royalBlue' : 'text-slate-500 hover:bg-slate-50 hover:text-navy'}`}>{index + 1}.{childIndex + 1}</a>; })}</div>; })}</div></nav>;
}

export function BackToTop() {
  const [visible,setVisible]=useState(false);
  useEffect(()=>{const update=()=>setVisible(window.scrollY>700);update();window.addEventListener('scroll',update,{passive:true});return()=>window.removeEventListener('scroll',update)},[]);
  if(!visible)return null;
  return <button type="button" onClick={()=>window.scrollTo({top:0,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'})} aria-label="Back to top" className="fixed bottom-5 right-4 z-30 min-h-11 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-royalBlue shadow-lg sm:right-6">↑ Top</button>;
}

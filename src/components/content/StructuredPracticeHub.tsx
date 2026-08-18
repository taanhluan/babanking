import type { ReactNode } from 'react';

type HubArtifact = {
  title: string;
  summary: string;
  phase?: string;
  learn?: string[];
  sample?: string[];
  template?: string[];
};

type HubPhase = { title: string; purpose: string; artifacts: string[] };
type HubSection = { id: string; title: string };

export type StructuredPracticeHubModel = {
  presentation: 'STRUCTURED_PRACTICE_HUB';
  navigation: HubSection[];
  overview?: string[];
  phases?: HubPhase[];
  artifacts?: HubArtifact[];
  bankingExample?: { title: string; steps: string[]; traceability?: string[] };
};

export function isStructuredPracticeHub(value: Record<string, unknown>): value is Record<string, unknown> & StructuredPracticeHubModel {
  return value.presentation === 'STRUCTURED_PRACTICE_HUB'
    && Array.isArray(value.navigation)
    && value.navigation.every((item) => item && typeof item === 'object' && typeof (item as HubSection).id === 'string' && typeof (item as HubSection).title === 'string');
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return <details className="rounded-xl border border-slate-200 bg-white p-4">
    <summary className="cursor-pointer font-semibold text-royalBlue focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-royalBlue">{title}</summary>
    <div className="mt-3 text-sm leading-6 text-textSecondary">{children}</div>
  </details>;
}

export function StructuredPracticeHub({ hub }: { hub: StructuredPracticeHubModel }) {
  return <div className="space-y-12">
    <nav aria-label="On this page" className="sticky top-2 z-10 overflow-x-auto rounded-xl border border-slate-200 bg-white/95 p-3 shadow-sm backdrop-blur">
      <ul className="flex min-w-max gap-2">{hub.navigation.map((item) => <li key={item.id}><a href={`#${item.id}`} className="inline-flex min-h-10 items-center rounded-lg px-3 text-sm font-semibold text-royalBlue hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-royalBlue">{item.title}</a></li>)}</ul>
    </nav>
    {hub.overview?.length ? <section id="overview" className="scroll-mt-24"><h2 className="text-3xl font-semibold text-textPrimary">Overview</h2><div className="mt-4 space-y-3 text-textSecondary">{hub.overview.map((item) => <p key={item}>{item}</p>)}</div></section> : null}
    {hub.phases?.length ? <section id="sdlc-map" className="scroll-mt-24"><h2 className="text-3xl font-semibold text-textPrimary">Documentation across SDLC</h2><div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{hub.phases.map((phase) => <article key={phase.title} className="rounded-2xl border border-slate-200 bg-white p-5"><h3 className="font-semibold text-textPrimary">{phase.title}</h3><p className="mt-2 text-sm leading-6 text-textSecondary">{phase.purpose}</p><ul className="mt-4 space-y-1 text-sm text-textSecondary">{phase.artifacts.map((artifact) => <li key={artifact}>• {artifact}</li>)}</ul></article>)}</div></section> : null}
    {hub.artifacts?.length ? <section id="core-documents" className="scroll-mt-24"><h2 className="text-3xl font-semibold text-textPrimary">Core documents</h2><div className="mt-5 grid gap-4 lg:grid-cols-2">{hub.artifacts.map((artifact) => <article key={artifact.title} className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-xs font-semibold uppercase tracking-wide text-royalBlue">{artifact.phase ?? 'BA Practice'}</p><h3 className="mt-2 text-xl font-semibold text-textPrimary">{artifact.title}</h3><p className="mt-2 leading-6 text-textSecondary">{artifact.summary}</p><div className="mt-4 space-y-2">{artifact.learn?.length ? <Panel title="Learn"><ul>{artifact.learn.map((item) => <li key={item}>• {item}</li>)}</ul></Panel> : null}{artifact.sample?.length ? <Panel title="Sample"><ul>{artifact.sample.map((item) => <li key={item}>• {item}</li>)}</ul></Panel> : null}{artifact.template?.length ? <Panel title="Template"><ol className="list-decimal space-y-1 pl-5">{artifact.template.map((item) => <li key={item}>{item}</li>)}</ol></Panel> : null}</div></article>)}</div></section> : null}
    {hub.bankingExample ? <section id="banking-example" className="scroll-mt-24"><h2 className="text-3xl font-semibold text-textPrimary">End-to-end banking example</h2><article className="mt-5 rounded-2xl border border-gold bg-goldPale p-5"><h3 className="text-xl font-semibold">{hub.bankingExample.title}</h3><ol className="mt-4 space-y-2 text-sm leading-6">{hub.bankingExample.steps.map((step) => <li key={step}>{step}</li>)}</ol>{hub.bankingExample.traceability?.length ? <div className="mt-5 overflow-x-auto"><p className="font-semibold">Traceability</p><p className="mt-2 min-w-max text-sm">{hub.bankingExample.traceability.join(' → ')}</p></div> : null}</article></section> : null}
  </div>;
}

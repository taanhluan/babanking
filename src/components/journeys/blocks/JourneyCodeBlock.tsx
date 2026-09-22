'use client';

import { useEffect, useId, useRef, useState } from 'react';

export function JourneyCodeBlock({ code, language, title }: { code: string; language?: string; title?: string }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const container = useRef<HTMLDivElement>(null);
  const [renderedCode, setRenderedCode] = useState<string | null>(null);
  const rendered = renderedCode === code && language?.toLowerCase() === 'mermaid';
  useEffect(() => {
    let cancelled = false;
    if (container.current) container.current.replaceChildren();
    if (language?.toLowerCase() !== 'mermaid' || !code.trim()) return;
    void (async () => {
      try {
        const { default: mermaid } = await import('mermaid');
        mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', suppressErrorRendering: true });
        const { svg } = await mermaid.render(`journey-diagram-${id}`, code);
        if (!cancelled && container.current) {
          container.current.innerHTML = svg;
          setRenderedCode(code);
        }
      } catch {
        // Preserve the published source when a diagram cannot be rendered.
      }
    })();
    return () => { cancelled = true; };
  }, [code, language, id]);

  return <section className="min-w-0 space-y-3">
    {title ? <h4 className="font-semibold text-navy">{title}</h4> : null}
    <div ref={container} role="img" aria-label={title || 'Business flow diagram'} className="overflow-x-auto" hidden={!rendered} />
    {rendered ? <details><summary className="cursor-pointer text-sm">Diagram source</summary><pre className="mt-2 overflow-x-auto whitespace-pre text-xs">{code}</pre></details>
      : <pre className="overflow-x-auto whitespace-pre rounded-lg bg-slate-950 p-3 text-xs text-slate-100">{code}</pre>}
  </section>;
}

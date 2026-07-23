import type { VisualType } from '@/data/case-studies';

export function CaseStudyVisual({ type }: { type: VisualType }) {
  const labels: Record<VisualType, string[]> = {
    matrix: ['Need', 'Capability', 'Gap'],
    payment: ['Initiate', 'Authorize', 'Settle'],
    document: ['Notes', 'Requirements', 'BRD'],
    onboarding: ['Register', 'Verify', 'Open'],
    gap: ['Current', 'Gap', 'Target'],
    rules: ['Channel', 'Limit', 'Decision'],
  };
  return (
    <div aria-hidden="true" className="grid h-28 grid-cols-3 items-center gap-2 bg-navyBlue p-4">
      {labels[type].map((label, index) => (
        <div key={label} className={`rounded-lg border px-2 py-3 text-center text-[11px] font-semibold text-white ${index === 1 ? 'border-goldAccent/60 bg-goldAccent/15' : 'border-white/10 bg-white/5'}`}>{label}</div>
      ))}
    </div>
  );
}

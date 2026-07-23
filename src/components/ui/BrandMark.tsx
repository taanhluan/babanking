import { Landmark } from 'lucide-react';

export function BrandMark() {
  return (
    <div className="flex items-center gap-2.5 text-white">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-goldAccent/40 bg-white/5 text-goldLight sm:h-10 sm:w-10">
        <Landmark aria-hidden="true" className="h-5 w-5 sm:h-[22px] sm:w-[22px]" strokeWidth={1.8} />
      </span>
      <span className="leading-tight">
        <span className="block text-sm font-semibold tracking-[0.01em] text-white sm:text-[15px]">Banking BA</span>
        <span className="mt-0.5 block text-[11px] font-medium tracking-[0.08em] text-slate-300 sm:text-xs">Knowledge Hub</span>
      </span>
    </div>
  );
}

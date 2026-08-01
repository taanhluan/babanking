'use client';

import { useEffect, useState } from 'react';

export function JourneyReadingProgress() {
  const [progress, setProgress] = useState(0);
  useEffect(() => { const update = () => { const max = document.documentElement.scrollHeight - window.innerHeight; setProgress(max > 0 ? Math.min(100, Math.round((window.scrollY / max) * 100)) : 0); }; update(); window.addEventListener('scroll', update, { passive: true }); window.addEventListener('resize', update); return () => { window.removeEventListener('scroll', update); window.removeEventListener('resize', update); }; }, []);
  return <div className="fixed inset-x-0 top-0 z-50 h-1 bg-slate-200/70" aria-label={`Reading progress ${progress}%`}><div className="h-full bg-royalBlue transition-[width] duration-150" style={{ width: `${progress}%` }} /></div>;
}

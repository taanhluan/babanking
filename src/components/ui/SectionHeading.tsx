export function SectionHeading({ eyebrow, title, description, inverse = false }: { eyebrow: string; title: string; description: string; inverse?: boolean }) {
  return (
    <div className="max-w-3xl">
      <p className={`text-sm font-semibold tracking-[0.04em] ${inverse ? 'text-goldLight' : 'text-royalBlue'}`}>{eyebrow}</p>
      <h2 className={`mt-3 text-3xl font-semibold tracking-tight sm:text-4xl ${inverse ? 'text-white' : 'text-textPrimary'}`}>{title}</h2>
      <p className={`mt-4 text-lg leading-8 ${inverse ? 'text-slate-300' : 'text-textSecondary'}`}>{description}</p>
    </div>
  );
}

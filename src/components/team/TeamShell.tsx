import Link from 'next/link';
import type { Route } from 'next';
import type { Role } from '@prisma/client';
import { WorkspaceShell } from '@/components/workspace/WorkspaceShell';
import { getCurrentLocale } from '@/i18n/server';
import { getLocalizedPath } from '@/i18n/routing';
import { teamCopy } from './team-copy';

/** The team area reuses the shared workspace shell so header, main navigation and sign-out stay identical. */
export function TeamShell({ user, children }: { user: { name: string; role: Role; isBaTeamMember: boolean }; children: React.ReactNode }) {
  return <WorkspaceShell user={user}>{children}</WorkspaceShell>;
}

export type TeamSection = 'plans' | 'myAllocation' | 'overview' | 'approvals' | 'templates' | 'allocation';

/** In-page team navigation; Lead-only sections are hidden for members. */
export async function TeamNav({ active, isLead }: { active: TeamSection; isLead: boolean }) {
  const locale = await getCurrentLocale();
  const copy = teamCopy[locale];
  const links: Array<{ key: TeamSection; href: string }> = [{ key: 'plans', href: '/team' }, { key: 'myAllocation', href: '/team/my-allocation' }];
  if (isLead) links.push({ key: 'overview', href: '/team/overview' }, { key: 'approvals', href: '/team/approvals' }, { key: 'templates', href: '/team/templates' }, { key: 'allocation', href: '/team/allocation' });
  return (
    <nav aria-label={copy.area} className="mb-5 flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2">
      {links.map((link) => (
        <Link key={link.key} href={getLocalizedPath(link.href, locale) as Route} aria-current={active === link.key ? 'page' : undefined} className={`flex min-h-11 shrink-0 items-center rounded-xl px-3 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-royalBlue ${active === link.key ? 'bg-navy text-white' : 'text-slate-700 hover:bg-slate-50'}`}>{copy.nav[link.key]}</Link>
      ))}
    </nav>
  );
}

export function ResultBanner({ error, saved, savedLabel }: { error?: string; saved?: string; savedLabel: string }) {
  if (error) return <p role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error.slice(0, 400)}</p>;
  if (saved) return <p role="status" className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{savedLabel}</p>;
  return null;
}

export function Badge({ children, tone = 'border-slate-300 bg-slate-50 text-slate-700' }: { children: React.ReactNode; tone?: string }) {
  return <span className={`inline-flex items-center rounded-lg border px-2 py-1 text-xs font-semibold ${tone}`}>{children}</span>;
}

export const inputClass = 'mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 font-normal';
export const buttonClass = 'min-h-11 rounded-xl bg-royalBlue px-4 font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-royalBlue';
export const secondaryButtonClass = 'min-h-11 rounded-xl border border-slate-300 bg-white px-4 font-semibold text-slate-700';
export const dangerButtonClass = 'min-h-11 rounded-xl border border-red-300 bg-white px-4 font-semibold text-red-700';
export const cardClass = 'rounded-2xl border border-slate-200 bg-white p-4 sm:p-5';

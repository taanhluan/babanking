import Link from 'next/link';
import type { Role } from '@prisma/client';
import { logoutAction } from '@/app/actions';
import { BrandMark } from '@/components/ui/BrandMark';
import { canContribute, canReview } from '@/lib/permissions';
import {getCurrentLocale} from '@/i18n/server'; import {getLocalizedPath} from '@/i18n/routing';
export async function WorkspaceShell({ user, children }: { user: { name: string; role: Role }; children: React.ReactNode }) {
  const locale=await getCurrentLocale(),v=locale==='vi';
  const links = [{ href: '/workspace', label: v?'Tổng quan':'Overview' }, { href: '/workspace/bookmarks', label: v?'Nội dung đã lưu':'Bookmarks' }, { href: '/workspace/history', label: v?'Lịch sử đọc':'History' }, { href: '/workspace/roadmap', label: v?'Định hướng nghề nghiệp':'Career Direction' }];
  if (canContribute(user.role)) links.push({ href: '/contributor', label: v?'Người đóng góp nội dung':'Contributor' });
  if (canReview(user.role)) links.push({ href: '/review', label: v?'Hàng đợi kiểm duyệt':'Review Queue' });
  if (user.role === 'ADMIN') links.push({ href: '/admin', label: v?'Quản trị hệ thống':'Administration' });
  return <div className="min-h-screen bg-bgLight"><header className="bg-navy px-4 py-4 text-white"><div className="mx-auto flex max-w-7xl items-center justify-between gap-4"><Link href={`/${locale}`}><BrandMark /></Link><div className="text-right text-sm"><p className="font-semibold">{user.name}</p><p className="text-slate-400">{user.role}</p></div></div></header><div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[230px_1fr]"><aside><nav aria-label="Workspace navigation" className="flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 lg:flex-col">{links.map((link) => <Link key={link.href} href={getLocalizedPath(link.href,locale)} className="flex min-h-11 shrink-0 items-center rounded-xl px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">{link.label}</Link>)}<form action={logoutAction}><button className="min-h-11 w-full rounded-xl px-3 text-left text-sm font-semibold text-red-700">{v?'Đăng xuất':'Sign out'}</button></form></nav></aside><main>{children}</main></div></div>;
}
export function WorkspaceTitle({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) { return <header className="mb-7"><p className="text-sm font-semibold text-royalBlue">{eyebrow}</p><h1 className="mt-2 text-3xl font-semibold text-navy sm:text-4xl">{title}</h1><p className="mt-3 max-w-3xl text-textSecondary">{description}</p></header>; }
export function EmptyState({ title, description }: { title: string; description: string }) { return <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center"><h2 className="text-xl font-semibold">{title}</h2><p className="mt-2 text-textSecondary">{description}</p></div>; }
export const StatusLabel = ({ status }: { status: string }) => <span className="rounded-lg border border-slate-300 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-700">{status.replaceAll('_', ' ')}</span>;

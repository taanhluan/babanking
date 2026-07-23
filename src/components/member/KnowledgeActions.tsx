import Link from 'next/link';
import type { ContentType } from '@prisma/client';
import { toggleBookmarkAction, updateProgressAction } from '@/app/actions';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

const path: Record<ContentType, string> = { BANKING_JOURNEY: 'banking-journeys', BA_PRACTICE: 'ba-practice', CASE_STUDY: 'case-studies', CAREER_LEVEL: 'career-roadmap' };

export async function KnowledgeActions({ type, slug }: { type: ContentType; slug: string }) {
  const user = await getCurrentUser();
  if (!user) return <div className="mb-8 rounded-xl border border-slate-200 bg-white p-4 text-sm">Sign in to save this knowledge and record reading milestones. <Link href={`/login?callbackUrl=/${path[type]}/${slug}`} className="font-semibold text-royalBlue">Member sign in</Link></div>;
  const item = await db.contentItem.findUnique({ where: { type_slug: { type, slug } }, include: { bookmarks: { where: { userId: user.id } }, activities: { where: { userId: user.id } } } });
  if (!item) return null;
  return <div className="mb-8 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"><form action={toggleBookmarkAction}><input type="hidden" name="contentItemId" value={item.id} /><button className="min-h-11 rounded-xl border border-slate-300 px-4 text-sm font-semibold">{item.bookmarks.length ? 'Remove bookmark' : 'Save knowledge'}</button></form><form action={updateProgressAction} className="flex flex-wrap items-center gap-2"><input type="hidden" name="contentItemId" value={item.id} /><label className="text-sm font-semibold">Reading milestone<select name="progress" defaultValue={item.activities[0]?.progress ?? 0} className="ml-2 min-h-11 rounded-xl border border-slate-300 bg-white px-2"><option value="0">Started</option><option value="25">25%</option><option value="50">50%</option><option value="75">75%</option><option value="100">Completed</option></select></label><button className="min-h-11 rounded-xl bg-royalBlue px-3 text-sm font-semibold text-white">Update</button></form></div>;
}

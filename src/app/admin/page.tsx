import Link from 'next/link';
import { db } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { WorkspaceTitle } from '@/components/workspace/WorkspaceShell';
import { getCurrentLocale } from '@/i18n/server';
import { getLocalizedPath } from '@/i18n/routing';
import { formatDateTime } from '@/i18n/format';
import { getServerEnvironment } from '@/server/env';
import { isJourneyCmsEnvironmentAllowed } from '@/server/cms/journey-cms-environment-core';
import { getAdminOperations } from './admin-navigation';

export default async function AdminPage() {
  await requireRole('ADMIN');
  const locale = await getCurrentLocale();
  const isVietnamese = locale === 'vi';

  const [active, contributors, reviewers, drafts, review, published, archived, logs] =
    await Promise.all([
      db.user.count({ where: { isActive: true } }),
      db.user.count({ where: { role: 'CONTRIBUTOR', isActive: true } }),
      db.user.count({ where: { role: 'REVIEWER', isActive: true } }),
      db.contentRevision.count({ where: { status: 'DRAFT' } }),
      db.contentRevision.count({ where: { status: 'IN_REVIEW' } }),
      db.contentItem.count({ where: { publishedRevisionId: { not: null } } }),
      db.contentItem.count({ where: { isArchived: true } }),
      db.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 8 }),
    ]);

  const stats = [
    [isVietnamese ? 'Người dùng hoạt động' : 'Active users', active],
    [isVietnamese ? 'Cộng tác viên' : 'Contributors', contributors],
    [isVietnamese ? 'Kiểm duyệt viên' : 'Reviewers', reviewers],
    [isVietnamese ? 'Bản nháp' : 'Draft revisions', drafts],
    [isVietnamese ? 'Chờ kiểm duyệt' : 'Awaiting review', review],
    [isVietnamese ? 'Nội dung đã xuất bản' : 'Published content', published],
    [isVietnamese ? 'Nội dung lưu trữ' : 'Archived content', archived],
  ] as const;

  const operations = getAdminOperations(
    isVietnamese,
    isJourneyCmsEnvironmentAllowed(getServerEnvironment()),
  );

  return (
    <>
      <WorkspaceTitle
        eyebrow={isVietnamese ? 'QUẢN TRỊ' : 'ADMINISTRATION'}
        title={isVietnamese ? 'Vận hành nền tảng' : 'Platform Operations'}
        description={
          isVietnamese
            ? 'Quản lý người dùng, quản trị nội dung và hồ sơ an toàn về các hoạt động quan trọng trên nền tảng.'
            : 'Manage users, content governance, and a safe record of important platform actions.'
        }
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(([label, value]) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-1 text-2xl font-semibold">{value}</p>
          </div>
        ))}
      </div>
      <div className="mt-7 flex flex-wrap gap-3">
        {operations.map(([label, href]) => (
          <Link
            key={href}
            href={getLocalizedPath(href, locale)}
            className="min-h-11 rounded-xl bg-navy px-4 py-3 text-sm font-semibold text-white"
          >
            {label}
          </Link>
        ))}
      </div>
      <section className="mt-8">
        <h2 className="text-xl font-semibold">
          {isVietnamese ? 'Hoạt động kiểm toán gần đây' : 'Recent audit activity'}
        </h2>
        <ul className="mt-3 space-y-2">
          {logs.map((log) => (
            <li
              key={log.id}
              className="rounded-xl border border-slate-200 bg-white p-3 text-sm"
            >
              {formatDateTime(log.createdAt, locale)} · {log.action} · {log.entityType}
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

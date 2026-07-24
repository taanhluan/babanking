import { requirePremiumAccess } from '@/lib/membership';
import { db } from '@/lib/db';
import { getCurrentLocale } from '@/i18n/server';
import { EmptyState, StatusLabel, WorkspaceTitle } from '@/components/workspace/WorkspaceShell';

export default async function KnowledgeAccessPage() {
  const user = await requirePremiumAccess('/account/knowledge-access');
  const locale = await getCurrentLocale();
  const vi = locale === 'vi';
  const [assignments, scopeGrants, contentGrants] = await Promise.all([
    db.userKnowledgePackageAssignment.findMany({
      where: { userId: user.id, status: 'ACTIVE' },
      include: { package: true },
      orderBy: { createdAt: 'desc' },
    }),
    db.userScopeGrant.findMany({
      where: { userId: user.id, effect: 'ALLOW', status: 'ACTIVE' },
      include: { knowledgeScope: true },
      orderBy: { createdAt: 'desc' },
    }),
    db.userContentGrant.findMany({
      where: { userId: user.id, effect: 'ALLOW', status: 'ACTIVE' },
      select: { id: true, permission: true, startsAt: true, expiresAt: true },
      orderBy: { createdAt: 'desc' },
    }),
  ]);
  const title = vi ? 'Quyền truy cập kiến thức' : 'Knowledge Access';
  return <>
    <WorkspaceTitle
      eyebrow={vi ? 'QUYỀN HIỆU LỰC' : 'EFFECTIVE ACCESS'}
      title={title}
      description={vi
        ? 'Xem các gói và phạm vi kiến thức hiện được cấp cho tài khoản của bạn.'
        : 'Review the knowledge packages and scopes currently assigned to your account.'}
    />
    {!assignments.length && !scopeGrants.length && !contentGrants.length
      ? <EmptyState
        title={vi ? 'Đang chờ cấp quyền truy cập' : 'Awaiting access assignment'}
        description={vi
          ? 'Tư cách thành viên đang hoạt động nhưng quyền truy cập kiến thức chưa được cấp.'
          : 'Your membership is active, but knowledge access has not yet been assigned.'}
      />
      : <div className="space-y-7">
        <AccessSection title={vi ? 'Gói kiến thức' : 'Knowledge Packages'}>
          {assignments.map((assignment) => <AccessRow
            key={assignment.id}
            name={vi ? assignment.package.nameVi : assignment.package.nameEn}
            permission={vi ? 'Quyền từ gói kiến thức' : 'Package Access'}
            startsAt={assignment.startsAt}
            expiresAt={assignment.expiresAt}
          />)}
        </AccessSection>
        <AccessSection title={vi ? 'Quyền được cấp trực tiếp' : 'Direct Scope Grants'}>
          {scopeGrants.map((grant) => <AccessRow
            key={grant.id}
            name={vi ? grant.knowledgeScope.nameVi : grant.knowledgeScope.nameEn}
            permission={grant.permission}
            startsAt={grant.startsAt}
            expiresAt={grant.expiresAt}
          />)}
        </AccessSection>
        {contentGrants.length ? <AccessSection title={vi ? 'Nội dung được cấp riêng' : 'Individual Content Grants'}>
          {contentGrants.map((grant) => <AccessRow
            key={grant.id}
            name={vi ? 'Nội dung được phê duyệt riêng' : 'Individually approved content'}
            permission={grant.permission}
            startsAt={grant.startsAt}
            expiresAt={grant.expiresAt}
          />)}
        </AccessSection> : null}
      </div>}
  </>;
}

function AccessSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section><h2 className="text-xl font-semibold">{title}</h2><div className="mt-3 space-y-3">{children}</div></section>;
}

function AccessRow({ name, permission, startsAt, expiresAt }: {
  name: string;
  permission: string;
  startsAt: Date | null;
  expiresAt: Date | null;
}) {
  return <article className="rounded-xl border border-slate-200 bg-white p-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h3 className="font-semibold">{name}</h3><p className="mt-1 text-sm text-slate-600">{permission}</p></div>
      <StatusLabel status="ACTIVE" />
    </div>
    <p className="mt-3 text-xs text-slate-500">
      {startsAt ? `Starts ${startsAt.toLocaleDateString()}` : 'Effective immediately'}
      {' · '}
      {expiresAt ? `Expires ${expiresAt.toLocaleDateString()}` : 'No expiry'}
    </p>
  </article>;
}

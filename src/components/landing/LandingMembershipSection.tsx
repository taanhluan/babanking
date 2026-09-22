import Link from 'next/link';
import { db } from '@/lib/db';
import { formatCurrency } from '@/i18n/format';
import type { SupportedLocale } from '@/i18n/config';
import { Reveal } from '@/components/ui/Reveal';

type LandingMembershipSectionProps = {
  locale: SupportedLocale;
  title: string;
  noPlanTitle: string;
  noPlan: string;
  requestMembership: string;
};

export async function LandingMembershipSection({ locale, title, noPlanTitle, noPlan, requestMembership }: LandingMembershipSectionProps) {
  const plans = await db.membershipPlan.findMany({
    where: { isActive: true, isPublic: true },
    orderBy: { displayOrder: 'asc' },
    select: {
      id: true,
      name: true,
      description: true,
      price: true,
      currency: true,
      translations: { where: { locale }, take: 1, select: { name: true, description: true } },
    },
  }).catch(() => []);

  return (
    <section id="membership" className="bg-navy px-4 py-20 text-white sm:px-6">
      <div className="mx-auto max-w-7xl">
        <Reveal><h2 className="text-3xl font-semibold">{title}</h2></Reveal>
        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          {plans.length ? plans.map((plan, index) => (
            <Reveal key={plan.id} delay={120 + index * 100}><article className="rounded-2xl border border-white/15 bg-white/5 p-7">
              <h3 className="text-2xl font-semibold">{plan.translations[0]?.name ?? plan.name}</h3>
              <p className="mt-3 text-slate-300">{plan.translations[0]?.description ?? plan.description}</p>
              <p className="mt-5 text-3xl font-semibold">{formatCurrency(plan.price, plan.currency, locale)}</p>
              <Link href={`/${locale}/request-access?plan=${plan.id}`} className="mt-6 inline-flex min-h-12 items-center rounded-xl bg-royalBlue px-5 font-semibold transition-colors hover:bg-blue-700">{requestMembership}</Link>
            </article></Reveal>
          )) : (
            <Reveal delay={120}><article className="rounded-2xl border border-white/15 p-7">
              <h3 className="text-2xl font-semibold">{noPlanTitle}</h3>
              <p className="mt-3 text-slate-300">{noPlan}</p>
              <Link href={`/${locale}/request-access`} className="mt-6 inline-flex min-h-12 items-center rounded-xl bg-royalBlue px-5 font-semibold transition-colors hover:bg-blue-700">{requestMembership}</Link>
            </article></Reveal>
          )}
        </div>
      </div>
    </section>
  );
}

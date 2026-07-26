'use server';
import { hash } from 'bcryptjs';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { requireRole, requireUser } from '@/lib/auth';
import { activationExpiresAt, createActivationToken, hashActivationToken, isActivationTokenValid } from '@/lib/activation';
import { accessRequestSchema, activationPasswordSchema, paymentSchema, planSchema } from '@/lib/validation';
import { canTransitionAccessRequest, canTransitionMembership, canTransitionPayment } from '@/lib/membership-workflow';
import { requireResolvedAccessRequestPlan } from '@/server/membership/access-request-plan';
import { classifyPaymentVerification } from '@/server/membership/payment-verification';

export type AccessRequestFormState = { ok: boolean; message?: string; errors?: Record<string, string[]> };
export async function submitAccessRequestAction(_: AccessRequestFormState, formData: FormData): Promise<AccessRequestFormState> {
  const parsed = accessRequestSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: 'Please review the highlighted information.', errors: parsed.error.flatten().fieldErrors };
  const input = parsed.data;
  const since = new Date(Date.now() - 15 * 60 * 1000);
  if (await db.accessRequest.findFirst({ where: { email: input.email, createdAt: { gte: since } }, select: { id: true } })) {
    return { ok: true, message: 'Your request has been received. Access is granted only after administrator review, payment confirmation, and account activation.' };
  }
  const request = await db.accessRequest.create({ data: {
    name: input.name, email: input.email, organization: input.organization || null,
    jobTitle: input.jobTitle, currentBALevel: input.currentBALevel || null,
    primaryInterest: input.primaryInterest, professionalObjective: input.professionalObjective,
    requestedPlanId: input.requestedPlanId || null, preferredLocale: input.preferredLocale, consentAccepted: true,
  } });
  await db.auditLog.create({ data: { action: 'ACCESS_REQUEST_CREATED', entityType: 'AccessRequest', entityId: request.id } });
  return { ok: true, message: 'Your request has been received. Access is granted only after administrator review, payment confirmation, and account activation.' };
}

export async function requestRenewalAction(formData: FormData) {
  const user = await requireUser('/account/renewal');
  const requestedPlanId = String(formData.get('requestedPlanId') || '') || null;
  const memberNote = String(formData.get('memberNote') || '').trim().slice(0, 700) || null;
  const recent = await db.renewalRequest.findFirst({ where: { userId: user.id, status: { in: ['REQUESTED', 'CONTACTED', 'PAYMENT_PENDING'] } } });
  if (!recent) {
    const request = await db.renewalRequest.create({ data: { userId: user.id, requestedPlanId, memberNote } });
    await db.auditLog.create({ data: { actorId: user.id, action: 'RENEWAL_REQUESTED', entityType: 'RenewalRequest', entityId: request.id } });
  }
  redirect('/account/renewal?submitted=1');
}

export async function activateAccountAction(formData: FormData) {
  const parsed = activationPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`/activate/${encodeURIComponent(String(formData.get('token') || 'invalid'))}?error=invalid`);
  const input = parsed.data;
  const tokenHash = hashActivationToken(input.token);
  const record = await db.accountActivationToken.findUnique({ where: { tokenHash }, include: { user: true } });
  if (!record || !isActivationTokenValid(record.expiresAt, record.usedAt)) redirect('/login?error=activation');
  await db.$transaction([
    db.user.update({ where: { id: record.userId }, data: { passwordHash: await hash(input.password, 12), accountStatus: 'ACTIVE', isActive: true } }),
    db.accountActivationToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    db.auditLog.create({ data: { actorId: record.userId, action: 'ACTIVATION_COMPLETED', entityType: 'User', entityId: record.userId } }),
  ]);
  redirect('/login?activated=1');
}

export async function savePlanAction(formData: FormData) {
  const actor = await requireRole('ADMIN');
  const parsed = planSchema.parse(Object.fromEntries(formData));
  if (parsed.isPublic === 'on' && (!parsed.isActive || !parsed.description)) throw new Error('Public plans must be active and complete.');
  const data = {
    name: parsed.name, code: parsed.code, description: parsed.description, price: parsed.price,
    currency: parsed.currency, billingPeriod: parsed.billingPeriod, durationDays: parsed.durationDays,
    featuresJson: JSON.stringify(parsed.features.split('\n').map((x) => x.trim()).filter(Boolean)),
    displayOrder: parsed.displayOrder, isActive: parsed.isActive === 'on', isPublic: parsed.isPublic === 'on',
  };
  const plan = parsed.planId
    ? await db.membershipPlan.update({ where: { id: parsed.planId }, data })
    : await db.membershipPlan.create({ data });
  await db.auditLog.create({ data: { actorId: actor.id, action: parsed.planId ? 'PLAN_UPDATED' : 'PLAN_CREATED', entityType: 'MembershipPlan', entityId: plan.id } });
  revalidatePath('/'); revalidatePath('/admin/memberships/plans');
}

export async function changeAccessRequestAction(formData: FormData) {
  const actor = await requireRole('ADMIN');
  const id = String(formData.get('requestId'));
  const action = String(formData.get('action'));
  const targets = { contact: 'CONTACTED', pending: 'PAYMENT_PENDING', approve: 'APPROVED', reject: 'REJECTED' } as const;
  const target = targets[action as keyof typeof targets];
  const request = await db.accessRequest.findUnique({ where: { id } });
  if (!request || !target || !canTransitionAccessRequest(request.status, target)) throw new Error('Invalid request transition.');
  const reason = String(formData.get('reason') || '').trim();
  if (target === 'REJECTED' && reason.length < 5) throw new Error('A rejection reason is required.');
  await db.accessRequest.update({ where: { id }, data: {
    status: target, contactedAt: target === 'CONTACTED' ? new Date() : request.contactedAt,
    adminNote: String(formData.get('adminNote') || '').trim().slice(0, 1000) || request.adminNote,
    rejectionReason: target === 'REJECTED' ? reason : null,
  } });
  await db.auditLog.create({ data: { actorId: actor.id, action: target === 'REJECTED' ? 'ACCESS_REQUEST_REJECTED' : 'ACCESS_REQUEST_STATUS_CHANGED', entityType: 'AccessRequest', entityId: id, metadataJson: JSON.stringify({ from: request.status, to: target }) } });
  revalidatePath('/admin/memberships/requests');
}

export async function recordPaymentAction(formData: FormData) {
  const actor = await requireRole('ADMIN');
  const parsed = paymentSchema.parse(Object.fromEntries(formData));
  const payment = await db.paymentRecord.create({ data: {
    accessRequestId: parsed.accessRequestId || null, userId: parsed.userId || null, planId: parsed.planId || null,
    amount: parsed.amount, currency: parsed.currency, method: parsed.method,
    provider: parsed.provider || null, providerReference: parsed.providerReference || null,
    adminNote: parsed.adminNote || null,
  } });
  await db.auditLog.create({ data: { actorId: actor.id, action: 'PAYMENT_RECORDED', entityType: 'PaymentRecord', entityId: payment.id } });
  revalidatePath('/admin/memberships/payments');
}

export async function changePaymentAction(formData: FormData) {
  const actor = await requireRole('ADMIN');
  const id = String(formData.get('paymentId'));
  const target = String(formData.get('status')) as 'PAID' | 'FAILED' | 'CANCELLED' | 'REFUNDED';
  const payment = await db.paymentRecord.findUnique({ where: { id } });
  if (!payment || !canTransitionPayment(payment.status, target)) throw new Error('Invalid or duplicate payment transition.');
  const now = new Date();
  await db.$transaction(async (tx) => {
    const currentPayment = await tx.paymentRecord.findUnique({
      where: { id },
      include: { plan: true, user: { select: { id: true } } },
    });
    if (!currentPayment || currentPayment.status !== payment.status
      || !canTransitionPayment(currentPayment.status, target)) {
      throw new Error('Invalid or duplicate payment transition.');
    }
    await tx.paymentRecord.update({
      where: { id },
      data: {
        status: target,
        paidAt: target === 'PAID' ? now : currentPayment.paidAt,
        verifiedAt: target === 'PAID' ? now : currentPayment.verifiedAt,
        verifiedById: target === 'PAID' ? actor.id : currentPayment.verifiedById,
      },
    });
    if (target === 'PAID') {
      const subject = classifyPaymentVerification(currentPayment);
      if (subject === 'USER') {
        await tx.auditLog.create({
          data: {
            actorId: actor.id,
            action: 'PAYMENT_VERIFIED',
            entityType: 'PaymentRecord',
            entityId: id,
            metadataJson: JSON.stringify({
              userId: currentPayment.userId,
              planId: currentPayment.planId,
            }),
          },
        });
        return;
      }
      const request = await tx.accessRequest.findUnique({
        where: { id: currentPayment.accessRequestId! },
        include: {
          requestedPlan: true,
          payments: { include: { plan: true } },
        },
      });
      if (!request) throw new Error('The linked access request was not found.');
      const plan = requireResolvedAccessRequestPlan(request);
      if (plan.id !== currentPayment.planId) throw new Error('The payment plan conflicts with the access request.');
      if (!request.requestedPlanId) {
        const synchronized = await tx.accessRequest.updateMany({
          where: { id: request.id, requestedPlanId: null },
          data: { requestedPlanId: plan.id },
        });
        if (synchronized.count !== 1) {
          const latest = await tx.accessRequest.findUnique({ where: { id: request.id } });
          if (latest?.requestedPlanId !== plan.id) {
            throw new Error('The access request plan changed during payment verification.');
          }
        }
      }
      if (request.status === 'PAYMENT_PENDING') {
        if (!canTransitionAccessRequest(request.status, 'PAYMENT_CONFIRMED')) {
          throw new Error('Invalid access request transition.');
        }
        await tx.accessRequest.update({
          where: { id: request.id },
          data: { status: 'PAYMENT_CONFIRMED' },
        });
      }
    }
    await tx.auditLog.create({
      data: {
        actorId: actor.id,
        action: target === 'PAID' ? 'PAYMENT_VERIFIED' : `PAYMENT_${target}`,
        entityType: 'PaymentRecord',
        entityId: id,
        metadataJson: target === 'PAID'
          ? JSON.stringify({
            accessRequestId: currentPayment.accessRequestId,
            planId: currentPayment.planId,
          })
          : null,
      },
    });
  });
  revalidatePath('/admin/memberships/payments'); revalidatePath('/admin/memberships/requests');
}

export async function convertAccessRequestAction(formData: FormData) {
  const actor = await requireRole('ADMIN');
  const requestId = String(formData.get('requestId'));
  const rawToken = createActivationToken();
  const result = await db.$transaction(async (tx) => {
    const request = await tx.accessRequest.findUnique({
      where: { id: requestId },
      include: {
        requestedPlan: true,
        payments: { include: { plan: true } },
      },
    });
    if (!request || request.status !== 'PAYMENT_CONFIRMED' || request.convertedUserId
      || !canTransitionAccessRequest(request.status, 'CONVERTED')) {
      throw new Error('Request is not ready for conversion.');
    }
    const plan = requireResolvedAccessRequestPlan(request);
    if (await tx.user.findUnique({ where: { email: request.email } })) {
      throw new Error('An account with this email already exists.');
    }
    const claimed = await tx.accessRequest.updateMany({
      where: {
        id: request.id,
        status: 'PAYMENT_CONFIRMED',
        convertedUserId: null,
      },
      data: { status: 'CONVERTED', requestedPlanId: plan.id },
    });
    if (claimed.count !== 1) throw new Error('Request was already converted.');
    const user = await tx.user.create({ data: { name: request.name, email: request.email, passwordHash: await hash(createActivationToken(), 12), accountStatus: 'INVITED', isActive: true, preferredLocale: request.preferredLocale } });
    const existingMembership = await tx.membership.findFirst({
      where: { userId: user.id },
      select: { id: true },
    });
    if (existingMembership) throw new Error('An incompatible membership already exists.');
    const membership = await tx.membership.create({ data: { userId: user.id, planId: plan.id, status: 'ACTIVE', accessSource: 'PAID', startsAt: new Date(), expiresAt: new Date(Date.now() + plan.durationDays * 86400000), createdById: actor.id } });
    await tx.paymentRecord.updateMany({
      where: {
        accessRequestId: request.id,
        status: 'PAID',
        verifiedAt: { not: null },
        verifiedById: { not: null },
        planId: plan.id,
      },
      data: { userId: user.id, membershipId: membership.id },
    });
    await tx.accessRequest.update({ where: { id: request.id }, data: { convertedUserId: user.id } });
    await tx.accountActivationToken.create({ data: { userId: user.id, tokenHash: hashActivationToken(rawToken), expiresAt: activationExpiresAt() } });
    await tx.auditLog.create({ data: { actorId: actor.id, action: 'ACCOUNT_CREATED', entityType: 'User', entityId: user.id, metadataJson: JSON.stringify({ accessRequestId: request.id }) } });
    await tx.auditLog.create({ data: { actorId: actor.id, action: 'MEMBERSHIP_ACTIVATED', entityType: 'Membership', entityId: membership.id, metadataJson: JSON.stringify({ accessRequestId: request.id, planId: plan.id }) } });
    await tx.auditLog.create({ data: { actorId: actor.id, action: 'ACTIVATION_LINK_GENERATED', entityType: 'User', entityId: user.id, metadataJson: JSON.stringify({ accessRequestId: request.id }) } });
    return user;
  }, { isolationLevel: 'Serializable' });
  const base = process.env.APP_BASE_URL || 'http://localhost:3000';
  redirect(`/admin/memberships/members?activation=${encodeURIComponent(`${base}/activate/${rawToken}`)}&user=${encodeURIComponent(result.email)}`);
}

export async function generateActivationLinkAction(formData: FormData) {
  const actor = await requireRole('ADMIN');
  const userId = String(formData.get('userId'));
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('User not found.');
  const rawToken = createActivationToken();
  await db.$transaction([
    db.accountActivationToken.updateMany({ where: { userId, usedAt: null }, data: { usedAt: new Date() } }),
    db.accountActivationToken.create({ data: { userId, tokenHash: hashActivationToken(rawToken), expiresAt: activationExpiresAt() } }),
    db.auditLog.create({ data: { actorId: actor.id, action: 'ACTIVATION_TOKEN_REISSUED', entityType: 'User', entityId: userId } }),
  ]);
  const base = process.env.APP_BASE_URL || 'http://localhost:3000';
  redirect(`/admin/memberships/members?activation=${encodeURIComponent(`${base}/activate/${rawToken}`)}&user=${encodeURIComponent(user.email)}`);
}

export async function grantPaidMembershipAction(formData: FormData) {
  const actor = await requireRole('ADMIN');
  const userId = String(formData.get('userId') || '');
  const paymentId = String(formData.get('paymentId') || '');
  const user = await db.user.findUnique({ where: { id: userId } });
  const payment = await db.paymentRecord.findUnique({ where: { id: paymentId }, include: { plan: true, accessRequest: true } });
  if (!user || !payment) throw new Error('User or payment not found.');
  if (payment.status !== 'PAID' || !payment.verifiedAt || !payment.verifiedById) throw new Error('A verified paid payment is required.');
  if (payment.membershipId) throw new Error('This payment is already linked to a membership.');
  if (!payment.plan || !payment.plan.isActive) throw new Error('The payment must reference an active membership plan.');
  if (payment.userId && payment.userId !== user.id) throw new Error('The payment belongs to a different user.');
  if (!payment.userId && payment.accessRequest?.email !== user.email) throw new Error('The payment cannot be matched safely to this user.');
  const now = new Date();
  if (await db.membership.findFirst({ where: { userId: user.id, status: 'ACTIVE', startsAt: { lte: now }, expiresAt: { gt: now } }, select: { id: true } })) {
    throw new Error('This user already has an active membership.');
  }
  const expiresAt = new Date(now.getTime() + payment.plan.durationDays * 86_400_000);
  await db.$transaction(async (tx) => {
    const membership = await tx.membership.create({ data: {
      userId: user.id, planId: payment.planId, status: 'ACTIVE', accessSource: 'PAID',
      startsAt: now, expiresAt, createdById: actor.id,
    } });
    await tx.paymentRecord.update({ where: { id: payment.id }, data: { userId: user.id, membershipId: membership.id } });
    if (payment.accessRequestId) await tx.accessRequest.update({
      where: { id: payment.accessRequestId },
      data: { convertedUserId: user.id, requestedPlanId: payment.planId, status: 'CONVERTED' },
    });
    await tx.auditLog.create({ data: {
      actorId: actor.id, action: 'MEMBERSHIP_ACTIVATED', entityType: 'Membership', entityId: membership.id,
      metadataJson: JSON.stringify({ userId: user.id, paymentId: payment.id, source: 'PAID' }),
    } });
  });
  revalidatePath('/admin/memberships/members');
  revalidatePath('/admin/memberships/payments');
  revalidatePath('/admin/memberships/requests');
  revalidatePath('/account/membership');
}

export async function changeMembershipAction(formData: FormData) {
  const actor = await requireRole('ADMIN');
  const id = String(formData.get('membershipId'));
  const target = String(formData.get('status')) as 'ACTIVE' | 'SUSPENDED' | 'CANCELLED';
  const membership = await db.membership.findUnique({ where: { id } });
  if (!membership || !canTransitionMembership(membership.status, target)) throw new Error('Invalid membership transition.');
  const reason = String(formData.get('reason') || '').trim();
  if (reason.length < 5) throw new Error('An audit reason is required.');
  if (target === 'ACTIVE' && membership.accessSource === 'PAID' && !await db.paymentRecord.findFirst({ where: { membershipId: id, status: 'PAID' } })) throw new Error('A paid membership requires a verified payment.');
  await db.membership.update({ where: { id }, data: { status: target, suspendedAt: target === 'SUSPENDED' ? new Date() : null, cancelledAt: target === 'CANCELLED' ? new Date() : null } });
  await db.auditLog.create({ data: { actorId: actor.id, action: `MEMBERSHIP_${target}`, entityType: 'Membership', entityId: id, metadataJson: JSON.stringify({ reason }) } });
  revalidatePath('/admin/memberships/members');
}

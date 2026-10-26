'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { Route } from 'next';
import { z } from 'zod';
import { assessmentFromForm, assignmentFromForm, flag, overAllocationConfirmed, profileFromForm, text } from '@/server/ba-team/ba-allocation-form';
import {
  createAssignment, createCustomer, createProject, deleteAssignment, mergeCustomer, mergeProject, saveManagerAssessment, saveProjectRole,
  saveTeamProfile, setAssignmentCancelled, updateAssignment, updateCustomer, updateProject,
} from '@/server/ba-team/ba-allocation-service';
import type { BaTeamActor } from '@/server/ba-team/ba-plan-policy';
import { requireBaTeamMember } from '@/server/ba-team/ba-team-access';

const idSchema = z.string().cuid();

/** Only team pages are valid return targets, so a crafted form cannot redirect elsewhere. */
const returnSchema = z.string().regex(/^\/team(\/[a-z0-9/-]*)?(\?[a-zA-Z0-9=&_.-]*)?$/).catch('/team/my-allocation');

function message(error: unknown) {
  if (error instanceof z.ZodError) return error.issues.slice(0, 5).map((issue) => `${issue.path.join('.') || 'input'}: ${issue.message}`).join('; ');
  return error instanceof Error ? error.message.slice(0, 400) : 'The request could not be completed.';
}

function withResult(path: string, error?: string) {
  const url = new URL(path, 'http://team.local');
  url.searchParams.delete('error');
  url.searchParams.delete('saved');
  url.searchParams.set(error ? 'error' : 'saved', error ?? '1');
  return `${url.pathname}${url.search}` as Route;
}

/** Re-authorizes the caller, runs one service operation and redirects back with a clean result flag. */
async function run(formData: FormData, operation: (actor: BaTeamActor) => Promise<unknown>, successPath?: (result: unknown) => string | undefined) {
  const actor = await requireBaTeamMember();
  const back = returnSchema.parse(formData.get('returnTo'));
  let error: string | undefined;
  let target = back;
  try {
    const result = await operation(actor);
    target = successPath?.(result) ?? back;
    revalidatePath('/team', 'layout');
  } catch (caught) {
    error = message(caught);
  }
  redirect(withResult(error ? back : target, error));
}

// ---------- Assignments ----------

export async function createAssignmentAction(formData: FormData) {
  await run(formData, async (actor) => {
    const userId = text(formData, 'userId') || actor.id;
    return createAssignment(idSchema.parse(userId), assignmentFromForm(formData), overAllocationConfirmed(formData), actor);
  });
}

export async function updateAssignmentAction(formData: FormData) {
  await run(formData, (actor) => updateAssignment(idSchema.parse(formData.get('allocationId')), assignmentFromForm(formData), overAllocationConfirmed(formData), actor));
}

export async function deleteAssignmentAction(formData: FormData) {
  const after = returnSchema.parse(formData.get('afterDelete'));
  await run(formData, (actor) => deleteAssignment(idSchema.parse(formData.get('allocationId')), actor), () => after);
}

export async function setAssignmentCancelledAction(formData: FormData) {
  await run(formData, (actor) => setAssignmentCancelled(idSchema.parse(formData.get('allocationId')), flag(formData, 'cancelled'), actor));
}

export async function saveManagerAssessmentAction(formData: FormData) {
  await run(formData, (actor) => saveManagerAssessment(idSchema.parse(formData.get('allocationId')), assessmentFromForm(formData), actor));
}

// ---------- Profiles and catalogue ----------

export async function saveTeamProfileAction(formData: FormData) {
  await run(formData, (actor) => saveTeamProfile(idSchema.parse(formData.get('userId')), profileFromForm(formData), actor));
}

export async function createCustomerAction(formData: FormData) {
  await run(formData, (actor) => createCustomer({ name: text(formData, 'name'), isInternal: flag(formData, 'isInternal') }, actor));
}

export async function updateCustomerAction(formData: FormData) {
  await run(formData, (actor) => updateCustomer(idSchema.parse(formData.get('customerId')), { name: text(formData, 'name'), isInternal: flag(formData, 'isInternal'), isActive: flag(formData, 'isActive') }, actor));
}

export async function mergeCustomerAction(formData: FormData) {
  await run(formData, (actor) => mergeCustomer(idSchema.parse(formData.get('customerId')), idSchema.parse(formData.get('targetId')), actor));
}

export async function createProjectAction(formData: FormData) {
  await run(formData, (actor) => createProject({ customerId: text(formData, 'customerId'), name: text(formData, 'name'), defaultBillableStatus: text(formData, 'defaultBillableStatus') }, actor));
}

export async function updateProjectAction(formData: FormData) {
  await run(formData, (actor) => updateProject(idSchema.parse(formData.get('projectId')), { customerId: text(formData, 'customerId'), name: text(formData, 'name'), defaultBillableStatus: text(formData, 'defaultBillableStatus'), isActive: flag(formData, 'isActive') }, actor));
}

export async function mergeProjectAction(formData: FormData) {
  await run(formData, (actor) => mergeProject(idSchema.parse(formData.get('projectId')), idSchema.parse(formData.get('targetId')), actor));
}

export async function saveProjectRoleAction(formData: FormData) {
  const roleId = text(formData, 'roleId');
  await run(formData, (actor) => saveProjectRole(roleId ? idSchema.parse(roleId) : undefined, { name: text(formData, 'name'), sortOrder: text(formData, 'sortOrder') || '0', isActive: roleId ? flag(formData, 'isActive') : true }, actor));
}

import { canUseBaTeam, isBaTeamLead, type BaTeamActor } from './ba-plan-policy';

/**
 * Resource allocation permissions (proposal section 14). Members manage their own assignments
 * without approval; the Lead sees and manages everyone, the catalogue, profiles and manager fields.
 */

export function canManageAssignment(actor: BaTeamActor, ownerId: string) {
  return canUseBaTeam(actor) && (isBaTeamLead(actor) || actor.id === ownerId);
}

/** Creating assignments for another BA is a Lead action; members only create their own. */
export function canCreateAssignmentFor(actor: BaTeamActor, ownerId: string) {
  return canManageAssignment(actor, ownerId);
}

export function canViewTeamAllocation(actor: BaTeamActor) {
  return isBaTeamLead(actor);
}

/** Performance, Risk and Manager Remark are management notes: visible to the owner, written by the Lead. */
export function canWriteManagerAssessment(actor: BaTeamActor) {
  return isBaTeamLead(actor);
}

export function canCancelAssignment(actor: BaTeamActor) {
  return isBaTeamLead(actor);
}

/** Any team member may add a missing customer or project. */
export function canAddCatalogEntry(actor: BaTeamActor) {
  return canUseBaTeam(actor);
}

/** Renaming, deactivating and project roles are Lead-only. */
export function canManageCatalog(actor: BaTeamActor) {
  return isBaTeamLead(actor);
}

export function canManageTeamProfiles(actor: BaTeamActor) {
  return isBaTeamLead(actor);
}

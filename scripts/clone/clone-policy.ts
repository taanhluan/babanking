export const cloneModelPolicy = {
  User: 'SANITIZE', MembershipPlan: 'COPY_AS_IS', MembershipPlanTranslation: 'COPY_AS_IS',
  AccessRequest: 'SANITIZE', Membership: 'SANITIZE', PaymentRecord: 'SANITIZE',
  AccountActivationToken: 'EXCLUDE', RenewalRequest: 'SANITIZE', ContentItem: 'SANITIZE',
  ContentTranslation: 'SANITIZE', TranslationRevision: 'SANITIZE', ContentRevision: 'SANITIZE',
  Bookmark: 'EXCLUDE', ReadingActivity: 'EXCLUDE', UserCareerPreference: 'EXCLUDE', AuditLog: 'EXCLUDE',
  KnowledgeScope: 'COPY_AS_IS', ContentKnowledgeScope: 'COPY_AS_IS', UserScopeGrant: 'SANITIZE',
  UserContentGrant: 'SANITIZE', KnowledgePackage: 'COPY_AS_IS', KnowledgePackagePermission: 'COPY_AS_IS',
  UserKnowledgePackageAssignment: 'SANITIZE',
} as const;

export type CloneModel = keyof typeof cloneModelPolicy;
export type CloneClassification = typeof cloneModelPolicy[CloneModel];
export const cloneModels = Object.keys(cloneModelPolicy) as CloneModel[];

export const excludedModelSet = new Set<CloneModel>(cloneModels.filter((model) => cloneModelPolicy[model] === 'EXCLUDE'));
export const contentModels = new Set<CloneModel>(['ContentItem', 'ContentRevision', 'ContentTranslation', 'TranslationRevision']);

export function classificationFor(model: string): CloneClassification {
  if (!(model in cloneModelPolicy)) throw new Error('UNKNOWN_CLASSIFICATION');
  return cloneModelPolicy[model as CloneModel];
}

export const productionUserReferenceFields = new Set([
  'ownerId', 'authorId', 'reviewerId', 'createdById', 'verifiedById', 'convertedUserId',
  'userId', 'grantedById', 'revokedById', 'assignedById',
]);

export const forbiddenOutputKeys = new Set(['token', 'tokenHash', 'passwordHash', 'activationSecret', 'authSecret', 'databaseUrl', 'directUrl', 'privateKey']);

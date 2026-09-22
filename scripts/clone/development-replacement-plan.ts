import { cloneModels, excludedModelSet, type CloneModel } from './clone-policy';

/** Schema-derived dependencies for the controlled clone surface; no DB client. */
export type ForeignKey = Readonly<{
  field: string;
  target: CloneModel;
  nullable: boolean;
  selfReference?: boolean;
}>;

export type ModelRelation = Readonly<{
  required: readonly ForeignKey[];
  nullable: readonly ForeignKey[];
  unique: readonly string[];
}>;

export const cloneRelationGraph: Readonly<Record<CloneModel, ModelRelation>> = {
  User: {
    required: [],
    nullable: [],
    unique: ['email'],
  },

  MembershipPlan: {
    required: [],
    nullable: [],
    unique: ['code'],
  },

  MembershipPlanTranslation: {
    required: [
      { field: 'planId', target: 'MembershipPlan', nullable: false },
    ],
    nullable: [],
    unique: ['planId,locale'],
  },

  AccessRequest: {
    required: [],
    nullable: [
      { field: 'requestedPlanId', target: 'MembershipPlan', nullable: true },
      { field: 'convertedUserId', target: 'User', nullable: true },
    ],
    unique: [],
  },

  Membership: {
    required: [
      { field: 'userId', target: 'User', nullable: false },
      { field: 'createdById', target: 'User', nullable: false },
    ],
    nullable: [
      { field: 'planId', target: 'MembershipPlan', nullable: true },
    ],
    unique: [],
  },

  PaymentRecord: {
    required: [],
    nullable: [
      { field: 'userId', target: 'User', nullable: true },
      { field: 'membershipId', target: 'Membership', nullable: true },
      { field: 'accessRequestId', target: 'AccessRequest', nullable: true },
      { field: 'planId', target: 'MembershipPlan', nullable: true },
      { field: 'verifiedById', target: 'User', nullable: true },
    ],
    unique: ['provider,providerReference'],
  },

  AccountActivationToken: {
    required: [
      { field: 'userId', target: 'User', nullable: false },
    ],
    nullable: [],
    unique: ['tokenHash'],
  },

  RenewalRequest: {
    required: [
      { field: 'userId', target: 'User', nullable: false },
    ],
    nullable: [
      { field: 'requestedPlanId', target: 'MembershipPlan', nullable: true },
    ],
    unique: [],
  },

  ContentItem: {
    required: [],
    nullable: [
      { field: 'ownerId', target: 'User', nullable: true },
      {
        field: 'publishedRevisionId',
        target: 'ContentRevision',
        nullable: true,
      },
      {
        field: 'primaryJourneyContentItemId',
        target: 'ContentItem',
        nullable: true,
        selfReference: true,
      },
    ],
    unique: ['stableKey', 'publishedRevisionId', 'type,slug'],
  },

  ContentTranslation: {
    required: [
      { field: 'contentItemId', target: 'ContentItem', nullable: false },
    ],
    nullable: [
      { field: 'ownerId', target: 'User', nullable: true },
      {
        field: 'publishedRevisionId',
        target: 'TranslationRevision',
        nullable: true,
      },
    ],
    unique: [
      'publishedRevisionId',
      'contentItemId,locale',
      'locale,slug',
    ],
  },

  TranslationRevision: {
    required: [
      {
        field: 'contentTranslationId',
        target: 'ContentTranslation',
        nullable: false,
      },
    ],
    nullable: [
      { field: 'authorId', target: 'User', nullable: true },
      { field: 'reviewerId', target: 'User', nullable: true },
    ],
    unique: ['contentTranslationId,version'],
  },

  ContentRevision: {
    required: [
      { field: 'contentItemId', target: 'ContentItem', nullable: false },
    ],
    nullable: [
      { field: 'authorId', target: 'User', nullable: true },
      { field: 'reviewerId', target: 'User', nullable: true },
    ],
    unique: ['contentItemId,version'],
  },

  Bookmark: {
    required: [
      { field: 'userId', target: 'User', nullable: false },
      { field: 'contentItemId', target: 'ContentItem', nullable: false },
    ],
    nullable: [],
    unique: ['userId,contentItemId'],
  },

  ReadingActivity: {
    required: [
      { field: 'userId', target: 'User', nullable: false },
      { field: 'contentItemId', target: 'ContentItem', nullable: false },
    ],
    nullable: [],
    unique: ['userId,contentItemId'],
  },

  UserCareerPreference: {
    required: [
      { field: 'userId', target: 'User', nullable: false },
    ],
    nullable: [],
    unique: ['userId'],
  },

  AuditLog: {
    required: [],
    nullable: [
      { field: 'actorId', target: 'User', nullable: true },
    ],
    unique: [],
  },

  KnowledgeScope: {
    required: [],
    nullable: [
      {
        field: 'parentId',
        target: 'KnowledgeScope',
        nullable: true,
        selfReference: true,
      },
    ],
    unique: ['code'],
  },

  ContentKnowledgeScope: {
    required: [
      { field: 'contentItemId', target: 'ContentItem', nullable: false },
      {
        field: 'knowledgeScopeId',
        target: 'KnowledgeScope',
        nullable: false,
      },
    ],
    nullable: [],
    unique: ['contentItemId,knowledgeScopeId'],
  },

  UserScopeGrant: {
    required: [
      { field: 'userId', target: 'User', nullable: false },
      {
        field: 'knowledgeScopeId',
        target: 'KnowledgeScope',
        nullable: false,
      },
      { field: 'grantedById', target: 'User', nullable: false },
    ],
    nullable: [
      { field: 'revokedById', target: 'User', nullable: true },
    ],
    unique: [],
  },

  UserContentGrant: {
    required: [
      { field: 'userId', target: 'User', nullable: false },
      { field: 'contentItemId', target: 'ContentItem', nullable: false },
      { field: 'grantedById', target: 'User', nullable: false },
    ],
    nullable: [
      { field: 'revokedById', target: 'User', nullable: true },
    ],
    unique: [],
  },

  KnowledgePackage: {
    required: [],
    nullable: [],
    unique: ['code'],
  },

  KnowledgePackagePermission: {
    required: [
      { field: 'packageId', target: 'KnowledgePackage', nullable: false },
      {
        field: 'knowledgeScopeId',
        target: 'KnowledgeScope',
        nullable: false,
      },
    ],
    nullable: [],
    unique: ['packageId,knowledgeScopeId,permission'],
  },

  UserKnowledgePackageAssignment: {
    required: [
      { field: 'userId', target: 'User', nullable: false },
      { field: 'packageId', target: 'KnowledgePackage', nullable: false },
      { field: 'assignedById', target: 'User', nullable: false },
    ],
    nullable: [
      { field: 'revokedById', target: 'User', nullable: true },
    ],
    unique: [],
  },
};

export const cleanupModels = [
  'AccountActivationToken',
  'Bookmark',
  'ReadingActivity',
  'UserCareerPreference',
  'AuditLog',
] as const;

/**
 * Nullable FK cycles that are safe to clear before deleting referenced rows.
 *
 * IMPORTANT:
 * ContentItem.primaryJourneyContentItemId MUST NOT be globally neutralized.
 * BA_DOCUMENT rows are protected by:
 *
 * CHECK (
 *   (type = 'BA_DOCUMENT' AND primaryJourneyContentItemId IS NOT NULL)
 *   OR
 *   (type <> 'BA_DOCUMENT' AND primaryJourneyContentItemId IS NULL)
 * )
 *
 * BA_DOCUMENT rows are therefore deleted before their referenced Journey rows.
 */
export const deferredPointers = [
  'ContentItem.publishedRevisionId',
  'ContentTranslation.publishedRevisionId',
  'KnowledgeScope.parentId',
] as const;

/**
 * Special deterministic subset deletions required before normal model deletion.
 */
export const deleteSubsets = [
  'ContentItem.BA_DOCUMENT',
] as const;

/**
 * ContentItem has a validated self-reference invariant:
 *
 * - BA_DOCUMENT requires primaryJourneyContentItemId
 * - non-BA_DOCUMENT requires primaryJourneyContentItemId = null
 *
 * Insert the referenced non-BA_DOCUMENT rows first, then BA_DOCUMENT rows.
 * This avoids relying on same-statement self-FK behavior in createMany().
 */
export const insertSubsets = [
  'ContentItem.NON_BA_DOCUMENT',
  'ContentItem.BA_DOCUMENT',
] as const;

/**
 * Descendants before parents.
 * EXCLUDE cleanup runs ahead of this phase.
 *
 * BA_DOCUMENT ContentItem rows are deleted separately before the general
 * ContentItem deletion so their primaryJourneyContentItemId FK never needs
 * to be neutralized.
 */
export const deleteOrder = [
  'PaymentRecord',
  'RenewalRequest',
  'UserKnowledgePackageAssignment',
  'UserContentGrant',
  'UserScopeGrant',
  'ContentKnowledgeScope',
  'KnowledgePackagePermission',
  'MembershipPlanTranslation',
  'TranslationRevision',
  'ContentTranslation',
  'ContentRevision',
  'ContentItem',
  'Membership',
  'AccessRequest',
  'KnowledgePackage',
  'KnowledgeScope',
  'MembershipPlan',
  'User',
] as const;

/**
 * Parents before descendants.
 * Deferred pointer fields are inserted as null and restored later.
 *
 * primaryJourneyContentItemId is NOT a deferred pointer. Its sanitized
 * value must be preserved when ContentItem is inserted.
 *
 * ContentItem itself is inserted through insertSubsets so Journey/non-BA rows
 * exist before BA_DOCUMENT rows that reference them.
 */
export const insertOrder = [
  'User',
  'MembershipPlan',
  'KnowledgeScope',
  'KnowledgePackage',
  'ContentTranslation',
  'ContentRevision',
  'TranslationRevision',
  'MembershipPlanTranslation',
  'ContentKnowledgeScope',
  'KnowledgePackagePermission',
  'AccessRequest',
  'Membership',
  'PaymentRecord',
  'RenewalRequest',
  'UserScopeGrant',
  'UserContentGrant',
  'UserKnowledgePackageAssignment',
] as const;

export const postImportVerificationOrder = [
  'forbiddenMaterial',
  'modelCounts',
  'excludedCounts',
  'integrity',
] as const;

export const replacementPlan = {
  neutralize: deferredPointers,
  cleanup: cleanupModels,
  deleteSubset: deleteSubsets,
  delete: deleteOrder,
  insertSubset: insertSubsets,
  insert: insertOrder,
  restore: deferredPointers,
  verify: postImportVerificationOrder,
} as const;

export type ReplacementPhaseName =
  | 'preflight'
  | `neutralize:${typeof deferredPointers[number]}`
  | `cleanup:${typeof cleanupModels[number]}`
  | `deleteSubset:${typeof deleteSubsets[number]}`
  | `delete:${typeof deleteOrder[number]}`
  | `insertSubset:${typeof insertSubsets[number]}`
  | `insert:${typeof insertOrder[number]}`
  | `restore:${typeof deferredPointers[number]}`
  | `verify:${typeof postImportVerificationOrder[number]}`;

export function replacementPhaseNames(): readonly ReplacementPhaseName[] {
  const phases: ReplacementPhaseName[] = [
    'preflight',

    ...replacementPlan.neutralize.map(
      (field) => `neutralize:${field}` as ReplacementPhaseName,
    ),

    ...replacementPlan.cleanup.map(
      (model) => `cleanup:${model}` as ReplacementPhaseName,
    ),

    ...replacementPlan.delete.map((model) => {
      if (model === 'ContentItem') {
        return [
          ...replacementPlan.deleteSubset.map(
            (subset) => `deleteSubset:${subset}` as ReplacementPhaseName,
          ),
          `delete:${model}` as ReplacementPhaseName,
        ];
      }

      return [`delete:${model}` as ReplacementPhaseName];
    }).flat(),

    ...replacementPlan.insert.flatMap((model) => {
      if (model === 'ContentTranslation') {
        return [
          ...replacementPlan.insertSubset.map(
            (subset) => `insertSubset:${subset}` as ReplacementPhaseName,
          ),
          `insert:${model}` as ReplacementPhaseName,
        ];
      }

      return [`insert:${model}` as ReplacementPhaseName];
    }),

    ...replacementPlan.restore.map(
      (field) => `restore:${field}` as ReplacementPhaseName,
    ),

    ...replacementPlan.verify.map(
      (check) => `verify:${check}` as ReplacementPhaseName,
    ),
  ];

  return phases;
}

export function assertPlan(): void {
  const managed = new Set<CloneModel>([
    ...deleteOrder,
    ...insertOrder,
    'ContentItem',
  ]);

  for (const model of cloneModels) {
    if (!excludedModelSet.has(model) && !managed.has(model)) {
      throw new Error('PLAN_MODEL_MISSING');
    }
  }

  for (const model of cleanupModels) {
    if (!excludedModelSet.has(model)) {
      throw new Error('PLAN_EXCLUDE_MISMATCH');
    }

    if (insertOrder.includes(model as never)) {
      throw new Error('EXCLUDED_MODEL_IMPORT_STEP');
    }
  }

  if (
    (deferredPointers as readonly string[]).includes(
      'ContentItem.primaryJourneyContentItemId',
    )
  ) {
    throw new Error('INVALID_PRIMARY_JOURNEY_NEUTRALIZATION');
  }

  if (
    !(deleteSubsets as readonly string[]).includes(
      'ContentItem.BA_DOCUMENT',
    )
  ) {
    throw new Error('BA_DOCUMENT_DELETE_PHASE_MISSING');
  }

  if (
    !(insertSubsets as readonly string[]).includes(
      'ContentItem.NON_BA_DOCUMENT',
    ) ||
    !(insertSubsets as readonly string[]).includes(
      'ContentItem.BA_DOCUMENT',
    )
  ) {
    throw new Error('CONTENT_ITEM_INSERT_PHASE_MISSING');
  }

  if ((insertOrder as readonly string[]).includes('ContentItem')) {
    throw new Error('CONTENT_ITEM_GENERIC_INSERT_FORBIDDEN');
  }

  const phases = replacementPhaseNames();
  const nonBaInsert = phases.indexOf(
    'insertSubset:ContentItem.NON_BA_DOCUMENT',
  );
  const baInsert = phases.indexOf(
    'insertSubset:ContentItem.BA_DOCUMENT',
  );
  const translationInsert = phases.indexOf(
    'insert:ContentTranslation',
  );

  if (
    nonBaInsert < 0 ||
    baInsert < 0 ||
    nonBaInsert >= baInsert ||
    baInsert >= translationInsert
  ) {
    throw new Error('CONTENT_ITEM_INSERT_ORDER_INVALID');
  }
}

/** A database-agnostic transaction port; no live executor is implemented here. */
export interface ReplacementTransaction {
  begin(): Promise<void>;
  step(name: ReplacementPhaseName): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

export async function exerciseReplacementPlan(
  transaction: ReplacementTransaction,
  failAt?: ReplacementPhaseName,
): Promise<void> {
  await transaction.begin();

  try {
    for (const phase of replacementPhaseNames()) {
      if (phase === failAt) {
        throw new Error('SIMULATED_FAILURE');
      }

      await transaction.step(phase);
    }

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
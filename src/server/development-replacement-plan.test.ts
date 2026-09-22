import { describe, expect, it } from 'vitest';
import {
  assertPlan,
  cleanupModels,
  cloneRelationGraph,
  deferredPointers,
  deleteOrder,
  exerciseReplacementPlan,
  insertOrder,
  insertSubsets,
  replacementPhaseNames,
  type ReplacementPhaseName,
} from '../../scripts/clone/development-replacement-plan';
import {
  cloneModels,
  excludedModelSet,
  type CloneModel,
} from '../../scripts/clone/clone-policy';

function indexOf(
  values: readonly string[],
  value: string,
): number {
  const index = values.indexOf(value);

  expect(index).toBeGreaterThanOrEqual(0);

  return index;
}

function insertPhaseForModel(
  model: CloneModel,
): string {
  return model === 'ContentItem'
    ? 'insertSubset:ContentItem.NON_BA_DOCUMENT'
    : `insert:${model}`;
}

function fakeTransaction() {
  const calls: string[] = [];

  return {
    calls,
    transaction: {
      begin: async () =>
        void calls.push('BEGIN'),

      step: async (
        phase: ReplacementPhaseName,
      ) => void calls.push(phase),

      commit: async () =>
        void calls.push('COMMIT'),

      rollback: async () =>
        void calls.push('ROLLBACK'),
    },
  };
}

describe(
  'Development replacement plan (pure harness)',
  () => {
    it('derives all clone model relation metadata and covers every managed model once per direction', () => {
      assertPlan();

      expect(
        Object.keys(cloneRelationGraph).sort(),
      ).toEqual([...cloneModels].sort());

      for (const model of cloneModels) {
        if (
          !excludedModelSet.has(model)
        ) {
          expect(
            deleteOrder.filter(
              (value) => value === model,
            ),
          ).toHaveLength(1);

          if (model === 'ContentItem') {
            expect(
              insertOrder,
            ).not.toContain('ContentItem');

            expect(
              insertSubsets,
            ).toEqual([
              'ContentItem.NON_BA_DOCUMENT',
              'ContentItem.BA_DOCUMENT',
            ]);

            continue;
          }

          expect(
            insertOrder.filter(
              (value) => value === model,
            ),
          ).toHaveLength(1);
        }
      }
    });

    it('cleans all excluded Development rows before deleting referenced users or content', () => {
      const phases =
        replacementPhaseNames();

      for (const model of cleanupModels) {
        expect(
          indexOf(
            phases,
            `cleanup:${model}`,
          ),
        ).toBeLessThan(
          indexOf(
            phases,
            'delete:ContentItem',
          ),
        );
      }

      expect(
        indexOf(
          phases,
          'cleanup:AccountActivationToken',
        ),
      ).toBeLessThan(
        indexOf(
          phases,
          'delete:User',
        ),
      );

      expect(
        indexOf(
          phases,
          'cleanup:AuditLog',
        ),
      ).toBeLessThan(
        indexOf(
          phases,
          'delete:User',
        ),
      );

      for (const model of [
        'Bookmark',
        'ReadingActivity',
      ]) {
        expect(
          indexOf(
            phases,
            `cleanup:${model}`,
          ),
        ).toBeLessThan(
          indexOf(
            phases,
            'delete:User',
          ),
        );

        expect(
          indexOf(
            phases,
            `cleanup:${model}`,
          ),
        ).toBeLessThan(
          indexOf(
            phases,
            'delete:ContentItem',
          ),
        );
      }
    });

    it('neutralizes only safe schema cycles, deletes BA Documents first, and inserts ContentItems deterministically', () => {
      const phases =
        replacementPhaseNames();

      for (const field of deferredPointers) {
        expect(
          indexOf(
            phases,
            `neutralize:${field}`,
          ),
        ).toBeLessThan(
          indexOf(
            phases,
            'delete:ContentItem',
          ),
        );

        expect(
          indexOf(
            phases,
            `restore:${field}`,
          ),
        ).toBeGreaterThan(
          indexOf(
            phases,
            'insertSubset:ContentItem.BA_DOCUMENT',
          ),
        );
      }

      expect(
        phases,
      ).not.toContain(
        'neutralize:ContentItem.primaryJourneyContentItemId',
      );

      expect(
        phases,
      ).not.toContain(
        'restore:ContentItem.primaryJourneyContentItemId',
      );

      expect(
        phases,
      ).not.toContain(
        'insert:ContentItem',
      );

      expect(
        indexOf(
          phases,
          'deleteSubset:ContentItem.BA_DOCUMENT',
        ),
      ).toBeLessThan(
        indexOf(
          phases,
          'delete:ContentItem',
        ),
      );

      expect(
        indexOf(
          phases,
          'insertSubset:ContentItem.NON_BA_DOCUMENT',
        ),
      ).toBeLessThan(
        indexOf(
          phases,
          'insertSubset:ContentItem.BA_DOCUMENT',
        ),
      );

      expect(
        indexOf(
          phases,
          'insertSubset:ContentItem.BA_DOCUMENT',
        ),
      ).toBeLessThan(
        indexOf(
          phases,
          'insert:ContentTranslation',
        ),
      );

      expect(
        indexOf(
          phases,
          'restore:ContentItem.publishedRevisionId',
        ),
      ).toBeGreaterThan(
        indexOf(
          phases,
          'insert:ContentRevision',
        ),
      );

      expect(
        indexOf(
          phases,
          'restore:ContentTranslation.publishedRevisionId',
        ),
      ).toBeGreaterThan(
        indexOf(
          phases,
          'insert:TranslationRevision',
        ),
      );

      expect(
        indexOf(
          phases,
          'restore:KnowledgeScope.parentId',
        ),
      ).toBeGreaterThan(
        indexOf(
          phases,
          'insert:KnowledgeScope',
        ),
      );
    });

    it('inserts every required parent before its dependent managed model', () => {
      const phases =
        replacementPhaseNames();

      for (const model of cloneModels) {
        if (excludedModelSet.has(model)) {
          continue;
        }

        const modelPhase =
          insertPhaseForModel(model);

        for (
          const fk of
          cloneRelationGraph[model]
            .required
        ) {
          expect(
            indexOf(
              phases,
              insertPhaseForModel(
                fk.target,
              ),
            ),
          ).toBeLessThan(
            indexOf(
              phases,
              modelPhase,
            ),
          );
        }
      }

      expect(
        indexOf(
          phases,
          'insertSubset:ContentItem.NON_BA_DOCUMENT',
        ),
      ).toBeLessThan(
        indexOf(
          phases,
          'insertSubset:ContentItem.BA_DOCUMENT',
        ),
      );
    });

    it('never emits an import phase for excluded Production models', () => {
      const phases =
        replacementPhaseNames();

      for (const model of cleanupModels) {
        expect(
          phases,
        ).not.toContain(
          `insert:${model}`,
        );
      }
    });

    it('commits only after post-import verification succeeds', async () => {
      const {
        calls,
        transaction,
      } = fakeTransaction();

      await exerciseReplacementPlan(
        transaction,
      );

      expect(
        calls.at(-1),
      ).toBe('COMMIT');

      expect(
        indexOf(
          calls,
          'verify:integrity',
        ),
      ).toBeLessThan(
        indexOf(
          calls,
          'COMMIT',
        ),
      );

      expect(
        calls,
      ).not.toContain(
        'ROLLBACK',
      );
    });

    it('rolls back for a failure at every phase, including post-import validation', async () => {
      for (
        const phase of
        replacementPhaseNames()
      ) {
        const {
          calls,
          transaction,
        } = fakeTransaction();

        await expect(
          exerciseReplacementPlan(
            transaction,
            phase,
          ),
        ).rejects.toThrow(
          'SIMULATED_FAILURE',
        );

        expect(
          calls,
        ).toContain(
          'ROLLBACK',
        );

        expect(
          calls,
        ).not.toContain(
          'COMMIT',
        );
      }
    });
  },
);
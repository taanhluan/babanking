import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import {
  cloneModels,
  classificationFor,
  excludedModelSet,
} from '../../scripts/clone/clone-policy';
import {
  dryRun,
  runCli,
} from '../../scripts/clone-production-to-development';
import { sanitizeDataset } from '../../scripts/clone/sanitize';
import { assertReplacementGates } from '../../scripts/clone/stage-and-load';
import { assertSourceProof } from '../../scripts/clone/source-reader';
import {
  safeFindingDiagnostics,
  validateSanitizedDataset,
} from '../../scripts/clone/validate-sanitized-dataset';
import {
  ProductionReadOnlySourceReader,
  isApprovedReplicaHostname,
} from '../../scripts/clone/production-readonly-source-reader';
import {
  destinationConfigurationFromEnvironment,
  developmentProofFromMetadata,
  DevelopmentReplacementExecutor,
  type DevelopmentReplacementPort,
} from '../../scripts/clone/development-replacement-executor';

const clean = {
  User: [
    {
      id: 'prod-user-a',
      name: 'Real Person',
      email: 'real.person@company.example',
      passwordHash: '$2b$production',
      role: 'CONTRIBUTOR',
      isActive: true,
      accountStatus: 'ACTIVE',
      preferredLocale: 'en',
      lastLoginAt: new Date(),
    },
  ],

  MembershipPlan: [
    {
      id: 'plan-a',
      code: 'PRO',
      name: 'Professional',
      description: 'Safe plan copy.',
    },
  ],

  ContentItem: [
    {
      id: 'content-a',
      type: 'BANKING_JOURNEY',
      slug: 'cards',
      ownerId: 'prod-user-a',
      previewJson: '{"title":"Cards"}',
    },
  ],

  ContentRevision: [
    {
      id: 'revision-a',
      contentItemId: 'content-a',
      authorId: 'prod-user-a',
      reviewerId: 'prod-user-a',
      contentJson: '{"title":"Cards","modules":[]}',
    },
  ],

  PaymentRecord: [
    {
      id: 'payment-a',
      userId: 'prod-user-a',
      amount: 100,
      currency: 'VND',
      status: 'PAID',
      provider: 'bank',
      providerReference: 'real-reference',
      adminNote: 'private',
    },
  ],

  AccountActivationToken: [
    {
      id: 'token-a',
      userId: 'prod-user-a',
      tokenHash: 'never-copy',
    },
  ],

  AuditLog: [
    {
      id: 'audit-a',
      actorId: 'prod-user-a',
      metadataJson: '{"secret":"never-copy"}',
    },
  ],
};

describe('safe clone tooling', () => {
  it('classifies every live Prisma model and fails closed for unknown models', () => {
    const schema = readFileSync(
      join(process.cwd(), 'prisma/schema.prisma'),
      'utf8',
    );

    const models = [
      ...schema.matchAll(/^model (\w+)/gm),
    ].map((match) => match[1]);

    expect(new Set(cloneModels)).toEqual(
      new Set(models),
    );

    expect(() =>
      classificationFor('UnexpectedSensitiveModel'),
    ).toThrow('UNKNOWN_CLASSIFICATION');
  });

  it('replaces production identity and remaps all approved user relationships', () => {
    const result = sanitizeDataset(clean);

    const user = result.dataset.User?.[0];
    const revision =
      result.dataset.ContentRevision?.[0];
    const payment =
      result.dataset.PaymentRecord?.[0];

    expect(user).toBeDefined();
    expect(revision).toBeDefined();
    expect(payment).toBeDefined();

    if (!user || !revision || !payment) {
      throw new Error(
        'Expected sanitized fixture rows',
      );
    }

    expect(user.id).not.toBe('prod-user-a');

    expect(user.email).toMatch(
      /@example\.test$/,
    );

    expect(user.name).toMatch(
      /^Development User/,
    );

    expect(user.passwordHash).toBe(
      '[DEVELOPMENT_HASH_REQUIRED]',
    );

    expect(user.lastLoginAt).toBeNull();

    expect(revision.authorId).toBe(user.id);
    expect(revision.reviewerId).toBe(user.id);
    expect(payment.userId).toBe(user.id);

    expect(
      JSON.stringify(result.dataset),
    ).not.toContain(
      'real.person@company.example',
    );

    expect(
      JSON.stringify(result.dataset),
    ).not.toContain('$2b$production');
  });

  it('excludes activation, audit and behavioral models and replaces payment references', () => {
    const result = sanitizeDataset(clean);

    expect(
      result.dataset.AccountActivationToken,
    ).toBeUndefined();

    expect(
      result.dataset.AuditLog,
    ).toBeUndefined();

    expect(
      excludedModelSet.has('Bookmark'),
    ).toBe(true);

    expect(
      result.dataset.PaymentRecord?.[0],
    ).toMatchObject({
      provider: 'DEVELOPMENT_SANITIZED',
      providerReference: 'DEV-PAY-000001',
      adminNote: null,
    });
  });

  it('detects sensitive content without emitting matching values', () => {
    const report = validateSanitizedDataset({
      ContentRevision: [
        {
          contentJson:
            'Contact jane@company.example for details.',
        },
      ],
    });

    expect(
      report.contentSensitivityReviewRequired,
    ).toBe(true);

    expect(report.findings).toEqual([
      {
        path: 'ContentRevision[0].contentJson',
        category: 'EMAIL',
      },
    ]);

    expect(
      JSON.stringify(report),
    ).not.toContain(
      'jane@company.example',
    );
  });

  it('reports content diagnostics without source values or record identities', () => {
    const report = validateSanitizedDataset({
      ContentRevision: [
        {
          contentJson:
            'Contact jane@company.example for details.',
        },
      ],
    });

    const diagnostics =
      safeFindingDiagnostics(report);

    expect(diagnostics).toEqual([
      {
        model: 'ContentRevision',
        field: 'contentJson',
        category: 'EMAIL',
        affectedRecords: 1,
        findings: 1,
        governedBusinessContent: true,
      },
    ]);

    expect(
      JSON.stringify(diagnostics),
    ).not.toContain(
      'jane@company.example',
    );
  });

  it('fails closed when governed content contains a sensitive value', () =>
    expect(() =>
      sanitizeDataset({
        ...clean,
        ContentRevision: [
          {
            ...clean.ContentRevision[0],
            contentJson: 'token=secret-value',
          },
        ],
      }),
    ).toThrow(
      'CONTENT_SENSITIVITY_REVIEW_REQUIRED',
    ));

  it('requires complete source and destructive-replacement gates', () => {
    expect(() =>
      assertSourceProof({
        sourceDatabaseEnvironment: 'production',
        sourceMode: 'read_only',
        sourceRole: 'not_proven',
        sourceTransaction: 'read_only',
        sourceReadReplica: 'proven',
        vercelIdentityVerified: false,
        neonIdentityVerified: true,
      }),
    ).toThrow('ENVIRONMENT_MISMATCH');

    expect(() =>
      assertReplacementGates({
        developmentReplacementAuthorized: true,
        targetIdentityVerified: true,
        sanitizedDatasetValid: true,
        stagingValid: false,
        sourceReadOnlyVerified: true,
      }),
    ).toThrow(
      'DESTRUCTIVE_REPLACEMENT_NOT_AUTHORIZED',
    );
  });

  it('dry-run reports counts only through an injected read-only reader', async () => {
    const report = await dryRun({
      kind: 'READ_ONLY_SOURCE',

      verify: async () => ({
        sourceDatabaseEnvironment: 'production',
        sourceMode: 'read_only',
        sourceRole: 'not_proven',
        sourceTransaction: 'read_only',
        sourceReadReplica: 'proven',
        vercelIdentityVerified: true,
        neonIdentityVerified: true,
      }),

      readAll: async () => clean,
    });

    expect(report).toMatchObject({
      mode: 'DRY_RUN',
      sourceModelCounts: {
        User: 1,
        ContentItem: 1,
      },
      sanitizedModelCounts: {
        User: 1,
        ContentItem: 1,
      },
    });

    expect(
      JSON.stringify(report),
    ).not.toContain(
      'real.person@company.example',
    );
  });

  it('has no production mutation operation in source abstraction', () =>
    expect(
      readFileSync(
        join(
          process.cwd(),
          'scripts/clone/source-reader.ts',
        ),
        'utf8',
      ),
    ).not.toMatch(
      /\b(INSERT|UPDATE|DELETE|TRUNCATE|CREATE TABLE|DROP TABLE)\b/i,
    ));

  it('fails closed without a replica credential or with the wrong endpoint before connecting', () => {
    const prior =
      process.env
        .PRODUCTION_CLONE_READER_DATABASE_URL;

    delete process.env
      .PRODUCTION_CLONE_READER_DATABASE_URL;

    expect(
      () => new ProductionReadOnlySourceReader(),
    ).toThrow(
      'PRODUCTION_RUNTIME_SESSION_NOT_AVAILABLE',
    );

    process.env
      .PRODUCTION_CLONE_READER_DATABASE_URL =
      'postgresql://ignored:ignored@wrong.example.test/neondb';

    expect(
      () => new ProductionReadOnlySourceReader(),
    ).toThrow(
      'SOURCE_REPLICA_IDENTITY_MISMATCH',
    );

    if (prior === undefined) {
      delete process.env
        .PRODUCTION_CLONE_READER_DATABASE_URL;
    } else {
      process.env
        .PRODUCTION_CLONE_READER_DATABASE_URL =
        prior;
    }
  });

  it('accepts only approved direct and pooled replica hostnames', () => {
    expect(
      isApprovedReplicaHostname(
        'ep-curly-boat-az0wfb6j.c-3.ap-southeast-1.aws.neon.tech',
      ),
    ).toBe(true);

    expect(
      isApprovedReplicaHostname(
        'ep-curly-boat-az0wfb6j-pooler.c-3.ap-southeast-1.aws.neon.tech',
      ),
    ).toBe(true);

    expect(
      isApprovedReplicaHostname(
        'ep-quiet-snow-azmaehn4.c-3.ap-southeast-1.aws.neon.tech',
      ),
    ).toBe(false);

    expect(
      isApprovedReplicaHostname(
        'ep-curly-boat-az0wfb6j-evil.c-3.ap-southeast-1.aws.neon.tech',
      ),
    ).toBe(false);
  });

  it('wires CLI through dryRun using an injected reader without logging a credential', async () => {
    const log = vi
      .spyOn(console, 'log')
      .mockImplementation(() => undefined);

    const code = await runCli(() => ({
      kind: 'READ_ONLY_SOURCE',

      verify: async () => ({
        sourceDatabaseEnvironment: 'production',
        sourceMode: 'read_only',
        sourceRole: 'not_proven',
        sourceTransaction: 'read_only',
        sourceReadReplica: 'proven',
        vercelIdentityVerified: true,
        neonIdentityVerified: true,
      }),

      readAll: async () => clean,
    }));

    expect(code).toBe(0);

    expect(
      log.mock.calls.join(''),
    ).not.toContain('postgresql://');

    log.mockRestore();
  });

  it('fails closed when a Development endpoint identity is absent, production, or source-equal', () => {
    expect(() =>
      destinationConfigurationFromEnvironment({}),
    ).toThrow(
      'DEVELOPMENT_IDENTITY_NOT_CONFIGURED',
    );

    expect(() =>
      destinationConfigurationFromEnvironment({
        DEVELOPMENT_CLONE_DATABASE_URL:
          'postgresql://ignored:ignored@ep-curly-boat-az0wfb6j.example.test/neondb',

        DEVELOPMENT_CLONE_DATABASE_ENDPOINT_ID:
          'ep-curly-boat-az0wfb6j',
      }),
    ).toThrow(
      'DEVELOPMENT_IDENTITY_NOT_CONFIGURED',
    );

    expect(() =>
      destinationConfigurationFromEnvironment({
        DEVELOPMENT_CLONE_DATABASE_URL:
          'postgresql://ignored:ignored@ep-quiet-snow-azmaehn4.example.test/neondb',

        DEVELOPMENT_CLONE_DATABASE_ENDPOINT_ID:
          'ep-quiet-snow-azmaehn4',
      }),
    ).toThrow(
      'DEVELOPMENT_IDENTITY_NOT_CONFIGURED',
    );

    expect(() =>
      destinationConfigurationFromEnvironment({
        DEVELOPMENT_CLONE_DATABASE_URL:
          'postgresql://ignored:ignored@ep-crimson-moon-azxy1ao5.example.test/wrongdb',

        DEVELOPMENT_CLONE_DATABASE_ENDPOINT_ID:
          'ep-crimson-moon-azxy1ao5',
      }),
    ).toThrow(
      'DEVELOPMENT_IDENTITY_NOT_CONFIGURED',
    );

    expect(() =>
      destinationConfigurationFromEnvironment({
        DEVELOPMENT_CLONE_DATABASE_URL:
          'postgresql://ignored:ignored@ep-crimson-moon-azxy1ao5.example.test/neondb',

        DEVELOPMENT_CLONE_DATABASE_ENDPOINT_ID:
          'ep-crimson-moon-azxy1ao5',

        PRODUCTION_CLONE_READER_DATABASE_URL:
          'postgresql://ignored:ignored@ep-crimson-moon-azxy1ao5.example.test/neondb',
      }),
    ).toThrow(
      'SOURCE_DESTINATION_IDENTITY_MATCH',
    );
  });

  it('proves only the approved writable Development destination from metadata and rejects unsafe metadata', () => {
    const environment = {
      APP_ENV: 'development',
      DATABASE_ENVIRONMENT: 'development',
    };

    expect(
      developmentProofFromMetadata(
        {
          database: 'neondb',
          readOnly: 'off',
          inRecovery: false,
        },
        'ep-crimson-moon-azxy1ao5',
        environment,
      ),
    ).toMatchObject({
      endpointId: 'ep-crimson-moon-azxy1ao5',
      database: 'neondb',
      destinationWritable: true,
      inRecovery: false,
    });

    expect(() =>
      developmentProofFromMetadata(
        {
          database: 'neondb',
          readOnly: 'on',
          inRecovery: false,
        },
        'ep-crimson-moon-azxy1ao5',
        environment,
      ),
    ).toThrow(
      'DEVELOPMENT_DESTINATION_NOT_WRITABLE',
    );

    expect(() =>
      developmentProofFromMetadata(
        {
          database: 'neondb',
          readOnly: 'off',
          inRecovery: true,
        },
        'ep-crimson-moon-azxy1ao5',
        environment,
      ),
    ).toThrow(
      'DEVELOPMENT_DESTINATION_NOT_WRITABLE',
    );

    expect(() =>
      developmentProofFromMetadata(
        {
          database: 'wrongdb',
          readOnly: 'off',
          inRecovery: false,
        },
        'ep-crimson-moon-azxy1ao5',
        environment,
      ),
    ).toThrow(
      'DEVELOPMENT_IDENTITY_NOT_CONFIGURED',
    );

    expect(() =>
      developmentProofFromMetadata(
        {
          database: 'neondb',
          readOnly: 'off',
          inRecovery: false,
        },
        'ep-quiet-snow-azmaehn4',
        environment,
      ),
    ).toThrow(
      'DEVELOPMENT_IDENTITY_NOT_CONFIGURED',
    );

    expect(() =>
      developmentProofFromMetadata(
        undefined,
        'ep-crimson-moon-azxy1ao5',
        environment,
      ),
    ).toThrow(
      'DEVELOPMENT_IDENTITY_NOT_CONFIGURED',
    );

    expect(() =>
      developmentProofFromMetadata(
        {
          database: 'neondb',
          inRecovery: false,
        },
        'ep-crimson-moon-azxy1ao5',
        environment,
      ),
    ).toThrow(
      'DEVELOPMENT_DESTINATION_NOT_WRITABLE',
    );
  });

  it('uses a metadata-only query for destination proof with no write statement', () => {
    const executor = readFileSync(
      join(
        process.cwd(),
        'scripts/clone/development-replacement-executor.ts',
      ),
      'utf8',
    );

    const proofBody = executor.slice(
      executor.indexOf(
        'async proveDestination()',
      ),
      executor.indexOf(
        'async diagnoseNeutralize()',
      ),
    );

    expect(proofBody).toContain(
      "current_setting('transaction_read_only')",
    );

    expect(proofBody).toContain(
      'pg_is_in_recovery()',
    );

    expect(proofBody).not.toMatch(
      /\b(INSERT|UPDATE|DELETE|TRUNCATE|CREATE|DROP)\b/i,
    );
  });

  it('requires an explicit confirmation before any Development destination is constructed', async () => {
    const previous =
      process.env.CONFIRM_REPLACE_DEVELOPMENT;

    delete process.env
      .CONFIRM_REPLACE_DEVELOPMENT;

    let destinationCreated = false;

    await expect(
      runCli(
        () => ({
          kind: 'READ_ONLY_SOURCE',

          verify: async () => {
            throw new Error(
              'SHOULD_NOT_READ',
            );
          },

          readAll: async () => clean,
        }),

        () => {
          destinationCreated = true;

          throw new Error(
            'SHOULD_NOT_CREATE',
          );
        },

        ['--replace-development'],
      ),
    ).resolves.toBe(1);

    expect(destinationCreated).toBe(false);

    if (previous === undefined) {
      delete process.env
        .CONFIRM_REPLACE_DEVELOPMENT;
    } else {
      process.env
        .CONFIRM_REPLACE_DEVELOPMENT =
        previous;
    }
  });

  it('verifies Development destination with zero writes and without constructing a Production reader', async () => {
    const log = vi
      .spyOn(console, 'log')
      .mockImplementation(() => undefined);

    let readerCreated = false;
    let transactionStarted = false;

    const destination:
      DevelopmentReplacementPort = {
      proveDestination: async () => ({
        applicationEnvironment: 'development',
        databaseEnvironment: 'development',
        endpointId: 'ep-crimson-moon-azxy1ao5',
        database: 'neondb',
        destinationWritable: true,
        inRecovery: false,
      }),

      transaction: async () => {
        transactionStarted = true;

        throw new Error('NO_TRANSACTION');
      },
    };

    await expect(
      runCli(
        () => {
          readerCreated = true;

          throw new Error('NO_SOURCE');
        },
        () => destination,
        ['--verify-development-destination'],
      ),
    ).resolves.toBe(0);

    expect(readerCreated).toBe(false);
    expect(transactionStarted).toBe(false);

    expect(
      log.mock.calls.join(''),
    ).toContain(
      'VERIFY_DEVELOPMENT_DESTINATION',
    );

    log.mockRestore();
  });

  it('hides unexpected replacement errors behind safe phase diagnostics', async () => {
    const error = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    process.env
      .CONFIRM_REPLACE_DEVELOPMENT = 'YES';

    const destination:
      DevelopmentReplacementPort = {
      proveDestination: async () => ({
        applicationEnvironment: 'development',
        databaseEnvironment: 'development',
        endpointId: 'ep-crimson-moon-azxy1ao5',
        database: 'neondb',
        destinationWritable: true,
        inRecovery: false,
      }),

      transaction: async (work) => {
        return await work({
          step: async (phase) => {
            if (
              phase === 'cleanup:AuditLog'
            ) {
              throw new Error(
                'Prisma raw host=secret@email.test',
              );
            }
          },
        });
      },
    };

    await runCli(
      () => ({
        kind: 'READ_ONLY_SOURCE',

        verify: async () => ({
          sourceDatabaseEnvironment: 'production',
          sourceMode: 'read_only',
          sourceRole: 'not_proven',
          sourceTransaction: 'read_only',
          sourceReadReplica: 'proven',
          vercelIdentityVerified: true,
          neonIdentityVerified: true,
        }),

        readAll: async () => clean,
      }),
      () => destination,
      ['--replace-development'],
    );

    const output =
      error.mock.calls.join('');

    expect(output).toContain(
      'DEVELOPMENT_REPLACEMENT_FAILED',
    );

    expect(output).toContain(
      'cleanup:AuditLog',
    );

    expect(output).not.toContain(
      'secret@email.test',
    );

    error.mockRestore();

    delete process.env
      .CONFIRM_REPLACE_DEVELOPMENT;
  });

  it('exposes only allowlisted Prisma codes for a neutralize phase', async () => {
    const error = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    process.env
      .CONFIRM_REPLACE_DEVELOPMENT = 'YES';

    for (const code of [
      'P2003',
      'P2022',
      'X9999',
    ]) {
      const destination:
        DevelopmentReplacementPort = {
        proveDestination: async () => ({
          applicationEnvironment:
            'development',
          databaseEnvironment:
            'development',
          endpointId: 'ep-crimson-moon-azxy1ao5',
          database: 'neondb',
          destinationWritable: true,
          inRecovery: false,
        }),

        transaction: async (work) =>
          await work({
            step: async (phase) => {
              if (
                phase ===
                'neutralize:ContentItem.publishedRevisionId'
              ) {
                throw Object.assign(
                  new Error(
                    'raw secret@email.test',
                  ),
                  {
                    code,
                    meta: {
                      secret: 'hidden',
                    },
                  },
                );
              }
            },
          }),
      };

      await runCli(
        () => ({
          kind: 'READ_ONLY_SOURCE',

          verify: async () => ({
            sourceDatabaseEnvironment:
              'production',
            sourceMode: 'read_only',
            sourceRole: 'not_proven',
            sourceTransaction: 'read_only',
            sourceReadReplica: 'proven',
            vercelIdentityVerified: true,
            neonIdentityVerified: true,
          }),

          readAll: async () => clean,
        }),
        () => destination,
        ['--replace-development'],
      );
    }

    const output =
      error.mock.calls.join('');

    expect(output).toContain(
      '"prismaCode":"P2003"',
    );

    expect(output).toContain(
      '"prismaCode":"P2022"',
    );

    expect(output).toContain(
      'neutralize:ContentItem.publishedRevisionId',
    );

    expect(output).not.toContain(
      'neutralize:ContentItem.primaryJourneyContentItemId',
    );

    expect(output).not.toContain(
      'X9999',
    );

    expect(output).not.toContain(
      'secret@email.test',
    );

    error.mockRestore();

    delete process.env
      .CONFIRM_REPLACE_DEVELOPMENT;
  });

  it('runs replacement phases atomically through a fake destination and excludes Production-only models', async () => {
    const calls: string[] = [];

    let committed = false;
    let rolledBack = false;

    const destination:
      DevelopmentReplacementPort = {
      proveDestination: async () => ({
        applicationEnvironment: 'development',
        databaseEnvironment: 'development',
        endpointId: 'ep-crimson-moon-azxy1ao5',
        database: 'neondb',
        destinationWritable: true,
        inRecovery: false,
      }),

      transaction: async (work) => {
        calls.push('BEGIN');

        try {
          const value = await work({
            step: async (phase) => {
              calls.push(phase);
            },
          });

          committed = true;
          calls.push('COMMIT');

          return value;
        } catch (error) {
          rolledBack = true;
          calls.push('ROLLBACK');

          throw error;
        }
      },
    };

    await new DevelopmentReplacementExecutor(
      destination,
    ).replace(
      sanitizeDataset(clean).dataset,
      {
        sourceDatabaseEnvironment: 'production',
        sourceMode: 'read_only',
        sourceRole: 'not_proven',
        sourceTransaction: 'read_only',
        sourceReadReplica: 'proven',
        vercelIdentityVerified: true,
        neonIdentityVerified: true,
      },
    );

    expect(committed).toBe(true);
    expect(rolledBack).toBe(false);

    expect(calls).toContain(
      'cleanup:AccountActivationToken',
    );

    expect(calls).not.toContain(
      'insert:AccountActivationToken',
    );

    expect(calls).toContain(
      'deleteSubset:ContentItem.BA_DOCUMENT',
    );

    expect(calls).not.toContain(
      'neutralize:ContentItem.primaryJourneyContentItemId',
    );

    expect(
      calls.indexOf(
        'deleteSubset:ContentItem.BA_DOCUMENT',
      ),
    ).toBeLessThan(
      calls.indexOf(
        'delete:ContentItem',
      ),
    );
  });

  it('keeps only the valid neutralize phases and never globally neutralizes the BA Document primary journey pointer', async () => {
    const validNeutralizePhases = [
      'neutralize:ContentItem.publishedRevisionId',
      'neutralize:ContentTranslation.publishedRevisionId',
      'neutralize:KnowledgeScope.parentId',
    ];

    const forbiddenPhase =
      'neutralize:ContentItem.primaryJourneyContentItemId';

    const destination:
      DevelopmentReplacementPort = {
      proveDestination: async () => ({
        applicationEnvironment: 'development',
        databaseEnvironment: 'development',
        endpointId: 'ep-crimson-moon-azxy1ao5',
        database: 'neondb',
        destinationWritable: true,
        inRecovery: false,
      }),

      transaction: async (work) =>
        await work({
          step: async () => undefined,
        }),
    };

    const calls: string[] = [];

    const trackingDestination:
      DevelopmentReplacementPort = {
      ...destination,

      transaction: async (work) =>
        await work({
          step: async (phase) => {
            calls.push(phase);
          },
        }),
    };

    await new DevelopmentReplacementExecutor(
      trackingDestination,
    ).replace(
      sanitizeDataset(clean).dataset,
      {
        sourceDatabaseEnvironment: 'production',
        sourceMode: 'read_only',
        sourceRole: 'not_proven',
        sourceTransaction: 'read_only',
        sourceReadReplica: 'proven',
        vercelIdentityVerified: true,
        neonIdentityVerified: true,
      },
    );

    for (
      const phase of validNeutralizePhases
    ) {
      expect(calls).toContain(phase);
    }

    expect(calls).not.toContain(
      forbiddenPhase,
    );

    expect(calls).toContain(
      'deleteSubset:ContentItem.BA_DOCUMENT',
    );

    expect(
      calls.indexOf(
        'deleteSubset:ContentItem.BA_DOCUMENT',
      ),
    ).toBeLessThan(
      calls.indexOf(
        'delete:ContentItem',
      ),
    );
  });

  it('blocks forbidden material before a Development transaction begins', async () => {
    let began = false;

    const destination:
      DevelopmentReplacementPort = {
      proveDestination: async () => ({
        applicationEnvironment: 'development',
        databaseEnvironment: 'development',
        endpointId: 'ep-crimson-moon-azxy1ao5',
        database: 'neondb',
        destinationWritable: true,
        inRecovery: false,
      }),

      transaction: async () => {
        began = true;

        throw new Error(
          'SHOULD_NOT_BEGIN',
        );
      },
    };

    await expect(
      new DevelopmentReplacementExecutor(
        destination,
      ).replace(
        {
          ContentRevision: [
            {
              contentJson:
                'token=real-secret',
            },
          ],
        },
        {
          sourceDatabaseEnvironment:
            'production',
          sourceMode: 'read_only',
          sourceRole: 'not_proven',
          sourceTransaction: 'read_only',
          sourceReadReplica: 'proven',
          vercelIdentityVerified: true,
          neonIdentityVerified: true,
        },
      ),
    ).rejects.toThrow(
      'PRE_REPLACEMENT_VALIDATION_FAILED',
    );

    expect(began).toBe(false);
  });
});
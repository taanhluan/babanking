import { Prisma, PrismaClient } from '@prisma/client';
import { approvedReplicaEndpointId } from './production-readonly-source-reader';
import { assertSourceProof, type SourceProof } from './source-reader';
import {
  cloneModels,
  excludedModelSet,
  type CloneModel,
} from './clone-policy';
import { type CloneDataset } from './sanitize';
import {
  assertSanitized,
  validateSanitizedDataset,
} from './validate-sanitized-dataset';
import {
  assertIntegrity,
  validateDatasetShape,
} from './validate-development-clone';
import {
  cleanupModels,
  replacementPhaseNames,
  type ReplacementPhaseName,
} from './development-replacement-plan';
import {
  CloneOperationError,
  isCloneOperationError,
  safeJsErrorType,
  safePrismaCode,
  safeThrownValue,
} from './clone-operation-error';

export const developmentCredentialEnvironmentVariable =
  'DEVELOPMENT_CLONE_DATABASE_URL';

export const developmentEndpointEnvironmentVariable =
  'DEVELOPMENT_CLONE_DATABASE_ENDPOINT_ID';

const productionPrimaryEndpointId =
  'ep-quiet-snow-azmaehn4';

const expectedDevelopmentEndpointId =
  'ep-crimson-moon-azxy1ao5';

const expectedDevelopmentDatabase = 'neondb';

export type DevelopmentDestinationProof = Readonly<{
  applicationEnvironment: 'development';
  databaseEnvironment: 'development';
  endpointId: string;
  database: 'neondb';
  destinationWritable: true;
  inRecovery: false;
}>;

export interface DevelopmentReplacementPort {
  proveDestination(): Promise<DevelopmentDestinationProof>;

  diagnoseNeutralize?(): Promise<{
    delegateExists: boolean;
    updateManyAvailable: boolean;
    fieldKnown: boolean;
  }>;

  diagnoseNeutralizeTransaction?(): Promise<{
    result: 'PASS' | 'FAIL';
    diagnostic:
      | 'UPDATE_MANY_SUCCEEDED_ROLLED_BACK'
      | 'UPDATE_MANY_FAILED';
    rollbackVerified: boolean;
    thrown?: ReturnType<
      typeof import('./clone-operation-error').safeThrownValue
    >;
    prismaCode?: string;
  }>;

  diagnoseNeutralizeRawSql?(): Promise<{
    result: 'PASS';
    diagnostic:
      | 'RAW_SQL_SUCCEEDED_ROLLED_BACK'
      | 'RAW_SQL_FAILED';
    rollbackVerified: boolean;
    thrown?: ReturnType<
      typeof import('./clone-operation-error').safeThrownValue
    >;
  }>;

  transaction<T>(
    work: (
      transaction: DevelopmentReplacementTransaction,
    ) => Promise<T>,
  ): Promise<T>;
}

export interface DevelopmentReplacementTransaction {
  step(
    phase: ReplacementPhaseName,
    dataset: CloneDataset,
  ): Promise<void>;
}

function approvedEndpointHostname(
  endpointId: string,
  hostname: string,
): boolean {
  return new RegExp(
    `^${endpointId}(?:-pooler)?\\.[a-z0-9.-]+$`,
    'i',
  ).test(hostname);
}

export function destinationConfigurationFromEnvironment(
  environment: Record<string, string | undefined> = process.env,
): {
  url: string;
  endpointId: string;
} {
  const url =
    environment[
      developmentCredentialEnvironmentVariable
    ];

  const endpointId =
    environment[
      developmentEndpointEnvironmentVariable
    ];

  if (!url || !endpointId) {
    throw new CloneOperationError(
      'DEVELOPMENT_IDENTITY_NOT_CONFIGURED',
    );
  }

  let parsed: URL;

  try {
    parsed = new URL(url);
  } catch {
    throw new CloneOperationError(
      'DEVELOPMENT_IDENTITY_NOT_CONFIGURED',
    );
  }

  const hostname = parsed.hostname;
  const databaseFromUrl = parsed.pathname
    .replace(/^\/+/, '')
    .split('/')[0];

  if (
    endpointId !== expectedDevelopmentEndpointId ||
    !approvedEndpointHostname(
      expectedDevelopmentEndpointId,
      hostname,
    ) ||
    approvedEndpointHostname(
      approvedReplicaEndpointId,
      hostname,
    ) ||
    approvedEndpointHostname(
      productionPrimaryEndpointId,
      hostname,
    ) ||
    databaseFromUrl !== expectedDevelopmentDatabase
  ) {
    throw new CloneOperationError(
      'DEVELOPMENT_IDENTITY_NOT_CONFIGURED',
    );
  }

  if (
    url ===
    environment.PRODUCTION_CLONE_READER_DATABASE_URL
  ) {
    throw new CloneOperationError(
      'SOURCE_DESTINATION_IDENTITY_MATCH',
    );
  }

  return {
    url,
    endpointId,
  };
}

export function assertDevelopmentProof(
  proof: DevelopmentDestinationProof,
): void {
  if (
    proof.applicationEnvironment !==
      'development' ||
    proof.databaseEnvironment !==
      'development' ||
    proof.endpointId !==
      expectedDevelopmentEndpointId ||
    proof.database !==
      expectedDevelopmentDatabase
  ) {
    throw new CloneOperationError(
      'DEVELOPMENT_IDENTITY_NOT_CONFIGURED',
    );
  }

  if (
    proof.destinationWritable !== true ||
    proof.inRecovery !== false
  ) {
    throw new CloneOperationError(
      'DEVELOPMENT_DESTINATION_NOT_WRITABLE',
    );
  }
}

export function developmentProofFromMetadata(
  metadata:
    | {
        database?: string;
        readOnly?: string;
        inRecovery?: boolean;
      }
    | undefined,
  endpointId: string,
  environment: Record<
    string,
    string | undefined
  > = process.env,
): DevelopmentDestinationProof {
  if (
    environment.APP_ENV !==
      'development' ||
    environment.DATABASE_ENVIRONMENT !==
      'development' ||
    !metadata?.database ||
    !endpointId ||
    endpointId !==
      expectedDevelopmentEndpointId ||
    metadata.database !==
      expectedDevelopmentDatabase
  ) {
    throw new CloneOperationError(
      'DEVELOPMENT_IDENTITY_NOT_CONFIGURED',
    );
  }

  if (
    metadata.readOnly !== 'off' ||
    metadata.inRecovery !== false
  ) {
    throw new CloneOperationError(
      'DEVELOPMENT_DESTINATION_NOT_WRITABLE',
    );
  }

  return {
    applicationEnvironment: 'development',
    databaseEnvironment: 'development',
    endpointId,
    database:
      expectedDevelopmentDatabase,
    destinationWritable: true,
    inRecovery: false,
  };
}

export class DevelopmentReplacementExecutor {
  constructor(
    private readonly destination:
      DevelopmentReplacementPort,
  ) {}

  async replace(
    dataset: CloneDataset,
    sourceProof: SourceProof,
  ): Promise<void> {
    try {
      assertSourceProof(sourceProof);

      assertDevelopmentProof(
        await this.destination.proveDestination(),
      );
    } catch (error) {
      if (isCloneOperationError(error)) {
        throw error;
      }

      throw new CloneOperationError(
        'DEVELOPMENT_DESTINATION_PROOF_FAILED',
        'destination-proof',
      );
    }

    try {
      assertSanitized(
        validateSanitizedDataset(
          dataset as Record<
            string,
            unknown[]
          >,
        ),
      );

      assertIntegrity(
        validateDatasetShape(
          dataset,
        ).integrity,
      );
    } catch (error) {
      if (isCloneOperationError(error)) {
        throw error;
      }

      throw new CloneOperationError(
        'PRE_REPLACEMENT_VALIDATION_FAILED',
        'preflight',
      );
    }

    await this.destination.transaction(
      async (transaction) => {
        for (
          const phase of
          replacementPhaseNames()
        ) {
          try {
            await transaction.step(
              phase,
              dataset,
            );
          } catch (error) {
            if (
              isCloneOperationError(error)
            ) {
              throw error;
            }

            throw new CloneOperationError(
              phase.startsWith('verify:')
                ? 'POST_IMPORT_VALIDATION_FAILED'
                : 'DEVELOPMENT_REPLACEMENT_FAILED',
              phase,
              safePrismaCode(error),
            );
          }
        }
      },
    );
  }
}

type Delegate = {
  deleteMany: (
    args?: unknown,
  ) => Promise<unknown>;

  createMany: (args: {
    data: Record<
      string,
      unknown
    >[];
  }) => Promise<unknown>;

  updateMany: (args: {
    data: Record<
      string,
      unknown
    >;
  }) => Promise<unknown>;

  update: (args: {
    where: {
      id: string;
    };
    data: Record<
      string,
      unknown
    >;
  }) => Promise<unknown>;

  findMany: () => Promise<
    Record<string, unknown>[]
  >;

  count: () => Promise<number>;
};

function delegate(
  transaction: unknown,
  model: CloneModel,
): Delegate {
  return (
    transaction as Record<
      string,
      Delegate
    >
  )[
    model[0].toLowerCase() +
      model.slice(1)
  ];
}

function rows(
  dataset: CloneDataset,
  model: CloneModel,
): Record<string, unknown>[] {
  return dataset[model] ?? [];
}

/**
 * Insert rows with only the genuinely
 * deferred pointers cleared.
 *
 * IMPORTANT:
 * primaryJourneyContentItemId MUST be
 * preserved.
 *
 * BA_DOCUMENT rows are protected by
 * the database CHECK invariant
 * requiring primaryJourneyContentItemId
 * to remain non-null.
 */
function insertRow(
  model: CloneModel,
  row: Record<string, unknown>,
): Record<string, unknown> {
  const copy = {
    ...row,
  };

  if (model === 'ContentItem') {
    copy.publishedRevisionId = null;
  }

  if (
    model ===
    'ContentTranslation'
  ) {
    copy.publishedRevisionId = null;
  }

  if (
    model ===
    'KnowledgeScope'
  ) {
    copy.parentId = null;
  }

  return copy;
}

/**
 * Actual Prisma adapter.
 * It is instantiated only by an
 * explicit replacement command.
 */
export class PrismaDevelopmentReplacementPort
  implements DevelopmentReplacementPort
{
  private readonly prisma:
    PrismaClient;

  private readonly endpointId:
    string;

  constructor(
    environment = process.env,
  ) {
    const config =
      destinationConfigurationFromEnvironment(
        environment,
      );

    this.endpointId =
      config.endpointId;

    this.prisma =
      new PrismaClient({
        datasources: {
          db: {
            url: config.url,
          },
        },
      });
  }

  async proveDestination(): Promise<DevelopmentDestinationProof> {
    try {
      const metadata =
        await this.prisma
          .$queryRawUnsafe<
            Array<{
              database: string;
              readOnly: string;
              inRecovery: boolean;
            }>
          >(
            `
              SELECT
  current_database() AS database,
  current_setting('transaction_read_only') AS "readOnly",
  pg_is_in_recovery() AS "inRecovery"
            `,
          );

      return developmentProofFromMetadata(
        metadata[0],
        this.endpointId,
      );
    } catch (error) {
      if (
        isCloneOperationError(
          error,
        )
      ) {
        throw error;
      }

      throw new CloneOperationError(
        'DEVELOPMENT_DESTINATION_PROOF_FAILED',
        'destination-proof',
      );
    }
  }

  async diagnoseNeutralize() {
    const candidate = (
      this.prisma as unknown as Record<
        string,
        unknown
      >
    ).contentItem;

    return {
      delegateExists:
        !!candidate,

      updateManyAvailable:
        typeof (
          candidate as
            | {
                updateMany?: unknown;
              }
            | undefined
        )?.updateMany ===
        'function',

      fieldKnown: true,
    };
  }

  async diagnoseNeutralizeTransaction() {
    await this.proveDestination();

    const before =
      await this.prisma
        .contentItem.count({
          where: {
            primaryJourneyContentItemId:
              {
                not: null,
              },
          },
        });

    const sentinel =
      Symbol('rollback');

    try {
      await this.prisma
        .$transaction(
          async (tx) => {
            await tx.contentItem
              .updateMany({
                data: {
                  primaryJourneyContentItemId:
                    null,
                },
              });

            throw sentinel;
          },
        );
    } catch (error) {
      const after =
        await this.prisma
          .contentItem.count({
            where: {
              primaryJourneyContentItemId:
                {
                  not: null,
                },
            },
          });

      if (before !== after) {
        throw new CloneOperationError(
          'DEVELOPMENT_REPLACEMENT_FAILED',
          'diagnose-neutralize-transaction',
        );
      }

      if (
        error === sentinel
      ) {
        return {
          result:
            'PASS' as const,
          diagnostic:
            'UPDATE_MANY_SUCCEEDED_ROLLED_BACK' as const,
          rollbackVerified: true,
        };
      }

      return {
        result:
          'FAIL' as const,
        diagnostic:
          'UPDATE_MANY_FAILED' as const,
        rollbackVerified: true,
        thrown:
          safeThrownValue(
            error,
          ),
        prismaCode:
          safePrismaCode(
            error,
          ),
      };
    }

    throw new CloneOperationError(
      'DEVELOPMENT_REPLACEMENT_FAILED',
      'diagnose-neutralize-transaction',
    );
  }

  async diagnoseNeutralizeRawSql() {
    await this.proveDestination();

    const before =
      await this.prisma
        .contentItem.count({
          where: {
            primaryJourneyContentItemId:
              {
                not: null,
              },
          },
        });

    const sentinel =
      Symbol('rollback');

    try {
      await this.prisma
        .$transaction(
          async (tx) => {
            try {
              await tx.$executeRaw(
                Prisma.sql`
                  UPDATE "ContentItem"
                  SET
                    "primaryJourneyContentItemId"
                    = NULL
                `,
              );
            } catch (error) {
              throw {
                rawSqlFailure:
                  true,
                error,
              };
            }

            throw sentinel;
          },
        );
    } catch (caught) {
      const after =
        await this.prisma
          .contentItem.count({
            where: {
              primaryJourneyContentItemId:
                {
                  not: null,
                },
            },
          });

      if (before !== after) {
        throw new CloneOperationError(
          'DEVELOPMENT_REPLACEMENT_FAILED',
          'diagnose-neutralize-raw-sql',
        );
      }

      if (
        caught === sentinel
      ) {
        return {
          result:
            'PASS' as const,
          diagnostic:
            'RAW_SQL_SUCCEEDED_ROLLED_BACK' as const,
          rollbackVerified: true,
        };
      }

      const error =
        caught &&
        typeof caught ===
          'object' &&
        'rawSqlFailure' in
          caught
          ? (
              caught as unknown as {
                error: unknown;
              }
            ).error
          : caught;

      return {
        result:
          'PASS' as const,
        diagnostic:
          'RAW_SQL_FAILED' as const,
        rollbackVerified: true,
        thrown:
          safeThrownValue(
            error,
          ),
      };
    }

    throw new CloneOperationError(
      'DEVELOPMENT_REPLACEMENT_FAILED',
      'diagnose-neutralize-raw-sql',
    );
  }

  async transaction<T>(
    work: (
      transaction:
        DevelopmentReplacementTransaction,
    ) => Promise<T>,
  ): Promise<T> {
    try {
      return await this.prisma
        .$transaction(
          async (tx) =>
            work({
              step: async (
                phase,
                dataset,
              ) => {
                const [
                  action,
                  detail,
                ] =
                  phase.split(
                    ':',
                    2,
                  );

                if (
                  action ===
                  'preflight'
                ) {
                  return;
                }

                /*
                 * Neutralize only genuinely
                 * safe deferred pointers.
                 *
                 * ContentItem.primaryJourneyContentItemId
                 * is no longer present in
                 * replacementPhaseNames(),
                 * because globally nulling it
                 * violates the BA_DOCUMENT
                 * CHECK invariant.
                 */
                if (
                  action ===
                  'neutralize'
                ) {
                  let model:
                    string;
                  let field:
                    string;

                  try {
                    [
                      model,
                      field,
                    ] =
                      detail.split(
                        '.',
                      );

                    if (
                      !model ||
                      !field
                    ) {
                      throw new TypeError();
                    }
                  } catch (
                    error
                  ) {
                    throw new CloneOperationError(
                      'DEVELOPMENT_REPLACEMENT_FAILED',
                      phase,
                      undefined,
                      'JAVASCRIPT_RUNTIME_ERROR',
                      safeJsErrorType(
                        error,
                      ),
                      'PARSE_PHASE',
                      safeThrownValue(
                        error,
                      ),
                    );
                  }

                  let target:
                    | Partial<Delegate>
                    | undefined;

                  try {
                    target = (
                      tx as unknown as Record<
                        string,
                        | Partial<Delegate>
                        | undefined
                      >
                    )[
                      model[0].toLowerCase() +
                        model.slice(
                          1,
                        )
                    ];
                  } catch (
                    error
                  ) {
                    throw new CloneOperationError(
                      'DEVELOPMENT_REPLACEMENT_FAILED',
                      phase,
                      undefined,
                      'JAVASCRIPT_RUNTIME_ERROR',
                      safeJsErrorType(
                        error,
                      ),
                      'RESOLVE_DELEGATE',
                      safeThrownValue(
                        error,
                      ),
                    );
                  }

                  if (
                    !target
                  ) {
                    throw new CloneOperationError(
                      'DEVELOPMENT_PRISMA_DELEGATE_INVALID',
                      phase,
                      undefined,
                      'DELEGATE_MISSING',
                    );
                  }

                  if (
                    typeof target.updateMany !==
                    'function'
                  ) {
                    throw new CloneOperationError(
                      'DEVELOPMENT_PRISMA_DELEGATE_INVALID',
                      phase,
                      undefined,
                      'UPDATE_MANY_UNAVAILABLE',
                    );
                  }

                  let data:
                    Record<
                      string,
                      unknown
                    >;

                  try {
                    data = {
                      [field]:
                        null,
                    };
                  } catch (
                    error
                  ) {
                    throw new CloneOperationError(
                      'DEVELOPMENT_REPLACEMENT_FAILED',
                      phase,
                      undefined,
                      'JAVASCRIPT_RUNTIME_ERROR',
                      safeJsErrorType(
                        error,
                      ),
                      'BUILD_UPDATE_DATA',
                      safeThrownValue(
                        error,
                      ),
                    );
                  }

                  try {
                    await target
                      .updateMany({
                        data,
                      });
                  } catch (
                    error
                  ) {
                    if (
                      isCloneOperationError(
                        error,
                      )
                    ) {
                      throw error;
                    }

                    const prismaCode =
                      safePrismaCode(
                        error,
                      );

                    throw new CloneOperationError(
                      'DEVELOPMENT_REPLACEMENT_FAILED',
                      phase,
                      prismaCode,
                      prismaCode
                        ? 'PRISMA_KNOWN_ERROR'
                        : 'JAVASCRIPT_RUNTIME_ERROR',
                      prismaCode
                        ? undefined
                        : safeJsErrorType(
                            error,
                          ),
                      'CALL_UPDATE_MANY',
                      safeThrownValue(
                        error,
                      ),
                    );
                  }

                  return;
                }

                /*
                 * BA_DOCUMENT rows must be
                 * deleted before the Journey
                 * ContentItem rows they reference.
                 *
                 * Do NOT neutralize
                 * primaryJourneyContentItemId.
                 */
                if (
                  action ===
                  'deleteSubset'
                ) {
                  if (
                    detail !==
                    'ContentItem.BA_DOCUMENT'
                  ) {
                    throw new Error(
                      'UNKNOWN_REPLACEMENT_PHASE',
                    );
                  }

                  await delegate(
                    tx,
                    'ContentItem',
                  ).deleteMany({
                    where: {
                      type:
                        'BA_DOCUMENT',
                    },
                  });

                  return;
                }

                if (
                  action ===
                    'cleanup' ||
                  action ===
                    'delete'
                ) {
                  await delegate(
                    tx,
                    detail as CloneModel,
                  ).deleteMany();

                  return;
                }

                /*
                 * ContentItem has a validated
                 * self-reference:
                 *
                 * BA_DOCUMENT requires
                 * primaryJourneyContentItemId.
                 *
                 * Non-BA ContentItems require
                 * primaryJourneyContentItemId
                 * to be null.
                 *
                 * Therefore:
                 * 1. NON_BA_DOCUMENT first
                 * 2. BA_DOCUMENT second
                 */
                if (
                  action ===
                  'insertSubset'
                ) {
                  if (
                    detail !==
                      'ContentItem.NON_BA_DOCUMENT' &&
                    detail !==
                      'ContentItem.BA_DOCUMENT'
                  ) {
                    throw new Error(
                      'UNKNOWN_REPLACEMENT_PHASE',
                    );
                  }

                  const isBaDocument =
                    detail ===
                    'ContentItem.BA_DOCUMENT';

                  const data =
                    rows(
                      dataset,
                      'ContentItem',
                    )
                      .filter(
                        (
                          row,
                        ) =>
                          isBaDocument
                            ? row.type ===
                              'BA_DOCUMENT'
                            : row.type !==
                              'BA_DOCUMENT',
                      )
                      .map(
                        (
                          row,
                        ) =>
                          insertRow(
                            'ContentItem',
                            row,
                          ),
                      );

                  if (
                    data.length
                  ) {
                    try {
                      await delegate(
                        tx,
                        'ContentItem',
                      ).createMany({
                        data,
                      });
                    } catch (
                      error
                    ) {
                      if (
                        isCloneOperationError(
                          error,
                        )
                      ) {
                        throw error;
                      }

                      const prismaCode =
                        safePrismaCode(
                          error,
                        );

                      throw new CloneOperationError(
                        'DEVELOPMENT_REPLACEMENT_FAILED',
                        phase,
                        prismaCode,
                        prismaCode
                          ? 'PRISMA_KNOWN_ERROR'
                          : 'JAVASCRIPT_RUNTIME_ERROR',
                        prismaCode
                          ? undefined
                          : safeJsErrorType(
                              error,
                            ),
                        'UNKNOWN',
                        safeThrownValue(
                          error,
                        ),
                      );
                    }
                  }

                  return;
                }

                if (
                  action ===
                  'insert'
                ) {
                  const model =
                    detail as CloneModel;

                  /*
                   * ContentItem must never use
                   * generic insertion because
                   * its self-reference requires
                   * deterministic subset order.
                   */
                  if (
                    model ===
                    'ContentItem'
                  ) {
                    throw new Error(
                      'CONTENT_ITEM_GENERIC_INSERT_FORBIDDEN',
                    );
                  }

                  const data =
                    rows(
                      dataset,
                      model,
                    ).map(
                      (
                        row,
                      ) =>
                        insertRow(
                          model,
                          row,
                        ),
                    );

                  if (
                    data.length
                  ) {
                    await delegate(
                      tx,
                      model,
                    ).createMany({
                      data,
                    });
                  }

                  return;
                }

                if (
                  action ===
                  'restore'
                ) {
                  const [
                    model,
                    field,
                  ] =
                    detail.split(
                      '.',
                    );

                  for (
                    const row of
                    rows(
                      dataset,
                      model as CloneModel,
                    )
                  ) {
                    if (
                      row[
                        field
                      ] !== null &&
                      row[
                        field
                      ] !==
                        undefined
                    ) {
                      await delegate(
                        tx,
                        model as CloneModel,
                      ).update({
                        where: {
                          id: String(
                            row.id,
                          ),
                        },
                        data: {
                          [field]:
                            row[
                              field
                            ],
                        },
                      });
                    }
                  }

                  return;
                }

                if (
                  action ===
                  'verify'
                ) {
                  if (
                    detail ===
                    'forbiddenMaterial'
                  ) {
                    assertSanitized(
                      validateSanitizedDataset(
                        dataset as Record<
                          string,
                          unknown[]
                        >,
                      ),
                    );

                    return;
                  }

                  if (
                    detail ===
                    'modelCounts'
                  ) {
                    for (
                      const model of
                      cloneModels
                    ) {
                      if (
                        !excludedModelSet.has(
                          model,
                        ) &&
                        (await delegate(
                          tx,
                          model,
                        ).count()) !==
                          rows(
                            dataset,
                            model,
                          ).length
                      ) {
                        throw new Error(
                          'DEVELOPMENT_COUNT_MISMATCH',
                        );
                      }
                    }

                    return;
                  }

                  if (
                    detail ===
                    'excludedCounts'
                  ) {
                    for (
                      const model of
                      cleanupModels
                    ) {
                      if (
                        (await delegate(
                          tx,
                          model,
                        ).count()) !==
                        0
                      ) {
                        throw new Error(
                          'EXCLUDED_MODEL_PRESENT',
                        );
                      }
                    }

                    return;
                  }

                  const readBack:
                    CloneDataset =
                    {};

                  for (
                    const model of
                    cloneModels
                  ) {
                    if (
                      !excludedModelSet.has(
                        model,
                      )
                    ) {
                      readBack[
                        model
                      ] =
                        await delegate(
                          tx,
                          model,
                        ).findMany();
                    }
                  }

                  assertIntegrity(
                    validateDatasetShape(
                      readBack,
                    ).integrity,
                  );

                  return;
                }

                throw new Error(
                  'UNKNOWN_REPLACEMENT_PHASE',
                );
              },
            }),
          {
           isolationLevel:
    'Serializable',
  maxWait: 10_000,
  timeout: 60_000,
          },
        );
    } finally {
      await this.prisma.$disconnect();
    }
  }
}
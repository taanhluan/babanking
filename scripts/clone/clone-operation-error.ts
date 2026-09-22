export const safeCloneOperationCodes = [
  'DEVELOPMENT_DESTINATION_PROOF_FAILED', 'DEVELOPMENT_DESTINATION_NOT_WRITABLE',
  'DEVELOPMENT_IDENTITY_NOT_CONFIGURED', 'SOURCE_DESTINATION_IDENTITY_MATCH',
  'DEVELOPMENT_REPLACEMENT_CONFIRMATION_REQUIRED', 'PRE_REPLACEMENT_VALIDATION_FAILED',
  'DEVELOPMENT_REPLACEMENT_FAILED', 'POST_IMPORT_VALIDATION_FAILED',
  'UNEXPECTED_CLONE_OPERATION_FAILURE',
] as const;
export type SafeCloneOperationCode = typeof safeCloneOperationCodes[number];
export class CloneOperationError extends Error {
  constructor(readonly code: SafeCloneOperationCode | 'DEVELOPMENT_PRISMA_DELEGATE_INVALID', readonly phase?: string, readonly prismaCode?: string, readonly runtimeCategory?: 'DELEGATE_MISSING' | 'UPDATE_MANY_UNAVAILABLE' | 'PRISMA_KNOWN_ERROR' | 'PRISMA_UNKNOWN_ERROR' | 'JAVASCRIPT_RUNTIME_ERROR', readonly jsErrorType?: 'TypeError' | 'RangeError' | 'ReferenceError' | 'SyntaxError' | 'Error' | 'UnknownError', readonly operation?: 'PARSE_PHASE' | 'RESOLVE_DELEGATE' | 'BUILD_UPDATE_DATA' | 'CALL_UPDATE_MANY' | 'UNKNOWN', readonly thrown?: ReturnType<typeof safeThrownValue>) { super(code); }
}
export function isCloneOperationError(error: unknown): error is CloneOperationError { return error instanceof CloneOperationError; }
export function safePrismaCode(error: unknown): string | undefined {
  const code = error && typeof error === 'object' && 'code' in error ? (error as { code?: unknown }).code : undefined;
  return typeof code === 'string' && /^P[0-9]{4}$/.test(code) ? code : undefined;
}
export function safeJsErrorType(error: unknown): 'TypeError' | 'RangeError' | 'ReferenceError' | 'SyntaxError' | 'Error' | 'UnknownError' { const name = error instanceof Error ? error.name : ''; return name === 'TypeError' || name === 'RangeError' || name === 'ReferenceError' || name === 'SyntaxError' || name === 'Error' ? name : 'UnknownError'; }
export function safeThrownValue(value: unknown) {
  const type = value === null ? 'NULL' : value === undefined ? 'UNDEFINED' : typeof value === 'string' ? 'STRING' : typeof value === 'number' ? 'NUMBER' : typeof value === 'boolean' ? 'BOOLEAN' : typeof value === 'symbol' ? 'SYMBOL' : typeof value === 'bigint' ? 'BIGINT' : typeof value === 'function' ? 'FUNCTION' : value instanceof Error ? 'ERROR_OBJECT' : typeof value === 'object' ? 'OBJECT' : 'UNKNOWN';
  if (type !== 'ERROR_OBJECT' && type !== 'OBJECT') return { thrownValueType: type } as const;
  const object = value as Record<string, unknown>; const name = typeof object.name === 'string' ? object.name : '';
  const prismaCode = safePrismaCode(value); const meta = object.meta;
  const databaseErrorCode = prismaCode === 'P2010' && meta && typeof meta === 'object' && typeof (meta as { code?: unknown }).code === 'string' && /^[0-9A-Z]{5}$/.test((meta as { code: string }).code) ? (meta as { code: string }).code : undefined;
  return { thrownValueType: type, hasCode: 'code' in object, hasName: 'name' in object, hasMessage: 'message' in object, hasMeta: 'meta' in object, isPrismaKnownRequestError: name === 'PrismaClientKnownRequestError', isPrismaUnknownRequestError: name === 'PrismaClientUnknownRequestError', isPrismaRustPanicError: name === 'PrismaClientRustPanicError', isPrismaInitializationError: name === 'PrismaClientInitializationError', isPrismaValidationError: name === 'PrismaClientValidationError', ...(prismaCode ? { prismaCode } : {}), ...(databaseErrorCode ? { databaseErrorCode } : {}) } as const;
}

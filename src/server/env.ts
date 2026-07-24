import 'server-only';
import {
  parseServerEnvironment,
  type ServerEnvironment,
} from './environment-core';

let cachedEnvironment: ServerEnvironment | undefined;

export function getServerEnvironment(): ServerEnvironment & { AUTH_SECRET: string } {
  cachedEnvironment ??= parseServerEnvironment(process.env);
  if (!cachedEnvironment.AUTH_SECRET) {
    throw new Error('AUTH_SECRET is required for the server runtime.');
  }
  return cachedEnvironment as ServerEnvironment & { AUTH_SECRET: string };
}

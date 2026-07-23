import type { PrismaClient } from '@prisma/client';

const unavailable = () =>
  Promise.reject(
    new Error('Database operations are unavailable in the public preview deployment.'),
  );

const unavailableOperation = new Proxy(unavailable, {
  get: () => unavailableOperation,
});

export const db = new Proxy(
  {},
  {
    get: () => unavailableOperation,
  },
) as PrismaClient;

import 'server-only';
import { randomBytes } from 'node:crypto';
export { hashActivationToken, isActivationTokenValid, tokenHashesMatch } from './activation-core';

export const createActivationToken = () => randomBytes(32).toString('base64url');
export const activationExpiresAt = (now = new Date()) => {
  const hours = Math.min(72, Math.max(24, Number(process.env.ACTIVATION_TOKEN_TTL_HOURS ?? 48)));
  return new Date(now.getTime() + hours * 60 * 60 * 1000);
};

import 'server-only';
import { getServerEnvironment } from '@/server/env';
import { assertJourneyCmsEnvironmentAllowed } from './journey-cms-environment-core';

export function assertJourneyCmsDevelopmentEnvironment() {
  const environment = getServerEnvironment();
  assertJourneyCmsEnvironmentAllowed(environment);
  return environment;
}

import type { ApplicationEnvironment } from '@/server/environment-core';

type JourneyCmsEnvironment = {
  APP_ENV: ApplicationEnvironment;
  DATABASE_ENVIRONMENT: ApplicationEnvironment;
};

export function isJourneyCmsEnvironmentAllowed(environment: JourneyCmsEnvironment) {
  return environment.APP_ENV === 'development'
    && environment.DATABASE_ENVIRONMENT === 'development';
}

export function assertJourneyCmsEnvironmentAllowed(environment: JourneyCmsEnvironment) {
  if (!isJourneyCmsEnvironmentAllowed(environment)) {
    throw new Error('Journey CMS is available only in the Development environment.');
  }
}

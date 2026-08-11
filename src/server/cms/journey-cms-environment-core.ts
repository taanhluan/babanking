import type { ApplicationEnvironment } from '@/server/environment-core';

type JourneyCmsEnvironment = {
  APP_ENV: ApplicationEnvironment;
  DATABASE_ENVIRONMENT: ApplicationEnvironment;
  ALLOW_PRODUCTION_DATABASE_OPERATIONS?: boolean;
};

function hasMatchingCmsEnvironment(environment: JourneyCmsEnvironment) {
  return environment.APP_ENV === environment.DATABASE_ENVIRONMENT;
}

export function isJourneyCmsRouteAvailable(environment: JourneyCmsEnvironment) {
  return hasMatchingCmsEnvironment(environment)
    && ['development', 'production'].includes(environment.APP_ENV);
}

export function isJourneyCmsWriteAllowed(environment: JourneyCmsEnvironment) {
  return isJourneyCmsRouteAvailable(environment);
}

export function assertJourneyCmsRouteAvailable(environment: JourneyCmsEnvironment) {
  if (!isJourneyCmsRouteAvailable(environment)) {
    throw new Error('Journey CMS route is unavailable in this environment.');
  }
}

export function assertJourneyCmsWriteAllowed(environment: JourneyCmsEnvironment) {
  if (!isJourneyCmsWriteAllowed(environment)) {
    throw new Error('Journey CMS writes are unavailable in this environment.');
  }
}

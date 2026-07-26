import 'server-only';
import { notFound } from 'next/navigation';
import { getServerEnvironment } from '@/server/env';
import {
  assertJourneyCmsRouteAvailable,
  assertJourneyCmsWriteAllowed,
  isJourneyCmsRouteAvailable,
} from './journey-cms-environment-core';

export function requireJourneyCmsRouteAvailability() {
  const environment = getServerEnvironment();
  if (!isJourneyCmsRouteAvailable(environment)) notFound();
  return environment;
}

export function assertJourneyCmsReadEnvironment() {
  const environment = getServerEnvironment();
  assertJourneyCmsRouteAvailable(environment);
  return environment;
}

export function assertJourneyCmsWriteEnvironment() {
  const environment = getServerEnvironment();
  assertJourneyCmsWriteAllowed(environment);
  return environment;
}

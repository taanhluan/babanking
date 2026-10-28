import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { getDevelopmentMockupHref, getDevelopmentMockupStepLinks, getJourneyMockup, getMockupResource } from './catalog';

const mocks = vi.hoisted(() => ({
  authorize: vi.fn(),
  readFile: vi.fn(),
  environment: { APP_ENV: 'development', DATABASE_ENVIRONMENT: 'development' },
}));
vi.mock('node:fs/promises', () => ({ readFile: mocks.readFile }));
vi.mock('@/server/env', () => ({ getServerEnvironment: () => mocks.environment }));
vi.mock('@/server/access-control/require-knowledge-access', () => ({ requireContentSlugAccess: mocks.authorize }));

import { GET } from '@/app/banking-journeys/[slug]/mockup/[[...asset]]/route';

const request = (asset?: string[], slug = 'customer-onboarding') => GET(
  new Request(`https://example.test/en/banking-journeys/${slug}/mockup`),
  { params: Promise.resolve({ slug, asset }) },
);

beforeEach(() => {
  vi.resetAllMocks();
  Object.assign(mocks.environment, { APP_ENV: 'development', DATABASE_ENVIRONMENT: 'development' });
  mocks.authorize.mockResolvedValue({});
  mocks.readFile.mockResolvedValue(Buffer.from('<html><head></head><body>Datum Bank</body></html>'));
});

describe('Development-only Journey mockup', () => {
  it('shows only registered Journey links and preserves the page locale', () => {
    const dev = { APP_ENV: 'development', DATABASE_ENVIRONMENT: 'development' } as const;
    expect(getDevelopmentMockupHref('BANKING_JOURNEY', 'customer-onboarding', 'en', dev))
      .toBe('/en/banking-journeys/customer-onboarding/mockup');
    expect(getDevelopmentMockupHref('BANKING_JOURNEY', 'customer-onboarding', 'vi', dev))
      .toBe('/vi/banking-journeys/customer-onboarding/mockup');
    expect(getDevelopmentMockupHref('BANKING_JOURNEY', 'lending', 'vi', dev))
      .toBe('/vi/banking-journeys/lending/mockup');
    expect(getDevelopmentMockupHref('BANKING_JOURNEY', 'payments-and-transfers', 'en', dev))
      .toBe('/en/banking-journeys/payments-and-transfers/mockup');
    expect(getDevelopmentMockupHref('BANKING_JOURNEY', 'cards', 'en', dev)).toBeNull();
    expect(getDevelopmentMockupHref('CASE_STUDY', 'customer-onboarding', 'en', dev)).toBeNull();
    expect(getDevelopmentMockupHref('BANKING_JOURNEY', 'customer-onboarding', 'en', {
      APP_ENV: 'production', DATABASE_ENVIRONMENT: 'production',
    })).toBeNull();
  });

  it('builds per-stage deep links only for mapped Journeys in Development', () => {
    const dev = { APP_ENV: 'development', DATABASE_ENVIRONMENT: 'development' } as const;
    const links = getDevelopmentMockupStepLinks('BANKING_JOURNEY', 'lending', 'vi', dev);
    expect(links?.stages['credit-assessment']).toEqual({ href: '/vi/banking-journeys/lending/mockup#step=bureau', label: 'Credit check' });
    expect(links?.stages['decision-engine'].href).toBe('/vi/banking-journeys/lending/mockup#step=decision');
    expect(links?.sections['offer-and-agreement-step-5-agreement-signing'].href).toBe('/vi/banking-journeys/lending/mockup#step=signing');
    expect(Object.keys(links?.stages ?? {})).toHaveLength(10);
    const onboarding = getDevelopmentMockupStepLinks('BANKING_JOURNEY', 'customer-onboarding', 'en', dev);
    expect(onboarding?.stages['customer-information-service']).toEqual({ href: '/en/banking-journeys/customer-onboarding/mockup#step=information', label: 'Your information' });
    expect(onboarding?.stages['card-enrollment-service'].href).toBe('/en/banking-journeys/customer-onboarding/mockup#step=card');
    expect(onboarding?.sections['application-management-start-application'].href).toBe('/en/banking-journeys/customer-onboarding/mockup#step=product');
    expect(getDevelopmentMockupStepLinks('BANKING_JOURNEY', 'payments-and-transfers', 'en', dev)).toBeNull();
    expect(getDevelopmentMockupStepLinks('BANKING_JOURNEY', 'lending', 'en', { APP_ENV: 'production', DATABASE_ENVIRONMENT: 'production' })).toBeNull();
  });

  it('checks Journey VIEW access before reading the HTML', async () => {
    const response = await request();
    expect(mocks.authorize).toHaveBeenCalledWith('BANKING_JOURNEY', 'customer-onboarding');
    expect(mocks.authorize.mock.invocationCallOrder[0]).toBeLessThan(mocks.readFile.mock.invocationCallOrder[0]);
    expect(response.headers.get('Content-Type')).toBe('text/html; charset=utf-8');
    expect(await response.text()).toContain('<base href="/banking-journeys/customer-onboarding/mockup/">');
  });

  it('serves each registered Journey from its own mockup directory', async () => {
    await request(undefined, 'lending');
    expect(mocks.authorize).toHaveBeenCalledWith('BANKING_JOURNEY', 'lending');
    expect(String(mocks.readFile.mock.calls[0][0])).toMatch(/docs\/mockups\/digital-lending\/index\.html$/);
  });

  it('serves the IFT fee workbench with its own allow-list for Payments & Transfers', async () => {
    await request(undefined, 'payments-and-transfers');
    expect(mocks.authorize).toHaveBeenCalledWith('BANKING_JOURNEY', 'payments-and-transfers');
    expect(String(mocks.readFile.mock.calls[0][0])).toMatch(/docs\/mockups\/ift-fee-workbench\/index\.html$/);
    const response = await request(['styles.css'], 'payments-and-transfers');
    expect(response.headers.get('Content-Type')).toBe('text/css; charset=utf-8');
    expect(response.headers.get('Content-Security-Policy')).toContain("style-src 'self' 'unsafe-inline'");
    const ift = getJourneyMockup('payments-and-transfers')!;
    expect(getMockupResource(ift, ['engine.mjs'])?.contentType).toBe('text/javascript; charset=utf-8');
    expect(getMockupResource(ift, ['assets', 'manrope-bold.ttf'])?.contentType).toBe('font/ttf');
    expect(getMockupResource(ift, ['assets', 'Manrope-OFL.txt'])).toBeNull();
    for (const asset of [['model.mjs'], ['engine.test.mjs'], ['README.md']]) expect(getMockupResource(ift, asset)).toBeNull();
    expect(getMockupResource(getJourneyMockup('lending')!, ['engine.mjs'])).toBeNull();
  });

  it('ships the IFT fee workbench in English with Datum Bank branding only', () => {
    const directory = path.join(process.cwd(), 'docs/mockups/ift-fee-workbench');
    for (const file of Object.keys(getJourneyMockup('payments-and-transfers')!.files).filter((name) => !name.startsWith('assets/'))) {
      const text = readFileSync(path.join(directory, file), 'utf8');
      expect(text, file).not.toMatch(/vietcombank|\bVCB\b/i);
      expect(text, file).not.toMatch(/[ạ-ỹăâđêôơưẠ-ỸĂÂĐÊÔƠƯ]/);
    }
  });

  it('does not read files when access is denied', async () => {
    mocks.authorize.mockRejectedValue(new Error('Journey access denied'));
    await expect(request()).rejects.toThrow('Journey access denied');
    expect(mocks.readFile).not.toHaveBeenCalled();
  });

  it.each([
    [['app.mjs'], 'text/javascript; charset=utf-8'],
    [['model.mjs'], 'text/javascript; charset=utf-8'],
    [['assets', 'datum-logo-white.png'], 'image/png'],
    [['assets', 'manrope-regular.ttf'], 'font/ttf'],
  ])('authorizes direct resource requests %j', async (asset, contentType) => {
    const response = await request(asset as string[]);
    expect(mocks.authorize).toHaveBeenCalledTimes(1);
    expect(response.headers.get('Content-Type')).toBe(contentType);
    expect(response.headers.get('Cache-Control')).toContain('private, no-store');
    expect(response.headers.get('X-Robots-Tag')).toBe('noindex, nofollow');
  });

  it('blocks direct requests outside Development before authorization or file access', async () => {
    for (const env of ['production', 'preview', 'test']) {
      mocks.environment.APP_ENV = env;
      await expect(request()).rejects.toThrow('404');
    }
    Object.assign(mocks.environment, { APP_ENV: 'development', DATABASE_ENVIRONMENT: 'production' });
    await expect(request()).rejects.toThrow('404');
    expect(mocks.authorize).not.toHaveBeenCalled();
    expect(mocks.readFile).not.toHaveBeenCalled();
  });

  it('does not serve unregistered Journeys, source tests, docs or traversed paths', async () => {
    await expect(request(undefined, 'cards')).rejects.toThrow('404');
    for (const asset of [['model.test.mjs'], ['README.md'], ['assets', '..', 'app.mjs'], ['toString']]) {
      expect(getMockupResource(getJourneyMockup('customer-onboarding')!, asset)).toBeNull();
      await expect(request(asset)).rejects.toThrow('404');
    }
    expect(mocks.readFile).not.toHaveBeenCalled();
  });

  it('keeps the prototype disconnected from APIs, form submission and cross-origin embedding', async () => {
    const response = await request();
    const policy = response.headers.get('Content-Security-Policy');
    expect(policy).toContain("connect-src 'none'");
    expect(policy).toContain("form-action 'none'");
    expect(policy).toContain("frame-ancestors 'self'");
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
  });
});

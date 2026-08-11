import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ getAccountAccessState: vi.fn() }));
vi.mock('@/lib/membership', () => ({ getAccountAccessState: mocks.getAccountAccessState }));
vi.mock('@/components/landing/LandingPage', () => ({ LandingPage: () => <div>GUEST_LANDING Request Paid Access Member Login</div> }));
vi.mock('@/components/member/MemberHome', () => ({ MemberHome: ({userName}:{userName:string}) => <div>MEMBER_HOME {userName}</div> }));
vi.mock('@/i18n/server', () => ({ getCurrentLocale: vi.fn().mockResolvedValue('en') }));

import Home from './page';

describe('/en homepage presentation state', () => {
  beforeEach(() => mocks.getAccountAccessState.mockReset());
  it('renders the existing landing page for a guest', async () => {
    mocks.getAccountAccessState.mockResolvedValue({ user: null, hasPremiumAccess: false });
    const html = renderToStaticMarkup(await Home());
    expect(html).toContain('GUEST_LANDING');
    expect(html).toContain('Request Paid Access');
    expect(html).toContain('Member Login');
    expect(html).not.toContain('MEMBER_HOME');
  });
  it('renders Member Home for an active premium member', async () => {
    mocks.getAccountAccessState.mockResolvedValue({ user: { id: 'member-1', name: 'Avery' }, hasPremiumAccess: true });
    const html = renderToStaticMarkup(await Home());
    expect(html).toContain('MEMBER_HOME Avery');
    expect(html).not.toContain('GUEST_LANDING');
  });
});

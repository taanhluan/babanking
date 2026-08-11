import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { MemberHomeData } from '@/lib/repository';

vi.mock('@/components/layout/Navbar', () => ({ Navbar: () => <nav>MEMBER_NAV</nav> }));
vi.mock('@/components/layout/Footer', () => ({ Footer: ({mode}:{mode:string}) => <footer>{mode}</footer> }));
vi.mock('@/lib/repository', () => ({ ContentRepository: {}, MemberHomeData: {} }));
vi.mock('@/i18n/server', () => ({ getCurrentLocale: vi.fn().mockResolvedValue('en') }));
import { MemberHomeView } from './MemberHome';

const base: MemberHomeData = { permittedTypes: [], domains: [], recentlyUpdated: [] };
describe('Member Home rendering', () => {
  it('excludes guest sales actions', () => {
    const html=renderToStaticMarkup(<MemberHomeView locale="en" userName="Avery" data={base}/>);
    expect(html).toContain('What do you want to explore?');
    expect(html).not.toContain('Request Access');
    expect(html).not.toContain('Request Paid Access');
    expect(html).not.toContain('Member Login');
  });
  it('derives suggestions from authorized recent data and omits the row when empty', () => {
    const withSuggestion={...base,recentlyUpdated:[{id:'allowed',type:'BANKING_JOURNEY' as const,slug:'allowed',title:'Authorized Journey',summary:'Summary',updatedAt:new Date('2026-08-09')}]};
    expect(renderToStaticMarkup(<MemberHomeView locale="en" userName="Avery" data={withSuggestion}/>)).toContain('Try: Authorized Journey');
    expect(renderToStaticMarkup(<MemberHomeView locale="en" userName="Avery" data={base}/>)).not.toContain('Try:');
  });
  it('does not show English recently-updated data for Vietnamese data state', () => {
    const html=renderToStaticMarkup(<MemberHomeView locale="vi" userName="An" data={base}/>);
    expect(html).not.toContain('Recently updated');
    expect(html).not.toContain('Try:');
  });
});

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe,expect,it,vi } from 'vitest';
import { en } from '@/i18n/dictionaries/en';
vi.mock('next/navigation',()=>({usePathname:()=>'/en',useSearchParams:()=>new URLSearchParams()}));
vi.mock('@/app/actions',()=>({logoutAction:vi.fn(),setLocaleAction:vi.fn()}));
import { NavbarClient } from './NavbarClient';

describe('Member navigation Role Matrix presentation',()=>{
  const render=(role:'MEMBER'|'ADMIN')=>renderToStaticMarkup(<NavbarClient mode="member" role={role} locale="en" labels={en.nav} permittedTypes={['BANKING_JOURNEY']}/>);
  it('does not show Admin navigation to a member',()=>expect(render('MEMBER')).not.toContain('>Admin<'));
  it('shows Admin navigation to an ADMIN resolved by the server',()=>expect(render('ADMIN')).toContain('>Admin<'));
});

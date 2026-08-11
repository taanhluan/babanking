import { describe,expect,it } from 'vitest';
import { readFileSync } from 'node:fs';

const page=readFileSync(new URL('../../app/banking-journeys/[slug]/page.tsx',import.meta.url),'utf8');
const portal=readFileSync(new URL('./JourneyPortal.tsx',import.meta.url),'utf8');
const navigator=readFileSync(new URL('./JourneyNavigator.tsx',import.meta.url),'utf8');
const navigation=readFileSync(new URL('./journey-navigation.ts',import.meta.url),'utf8');
const blocks=readFileSync(new URL('./blocks/JourneyBlockRenderer.tsx',import.meta.url),'utf8');
describe('Journey reading architecture regressions',()=>{
  it('keeps one authorized repository content fetch at the route boundary',()=>expect(page.match(/ContentRepository\.getContentBySlug/g)).toHaveLength(1));
  it('keeps navigation derivation outside the client component graph',()=>{expect(portal).toContain("import { deriveJourneyNavigation } from './journey-navigation'");expect(portal).not.toMatch(/deriveJourneyNavigation[^\n]*from '\.\/JourneyNavigator'/);expect(navigator.startsWith("'use client';")).toBe(true);expect(navigation).not.toContain("'use client'")});
  it('keeps previous and next stage query navigation',()=>{expect(portal).toContain('← Previous:');expect(portal).toContain('Next:');expect(portal).toContain('?paymentType=${paymentType}&stage=')});
  it('keeps the existing BPMN renderer path and local containment untouched',()=>{expect(blocks).toContain("import { BusinessProcessDiagram, isBusinessProcessDiagram } from './BusinessProcessDiagram'");expect(blocks).toContain('<BusinessProcessDiagram payload={payload} />')});
});

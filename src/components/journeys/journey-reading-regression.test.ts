import { describe,expect,it } from 'vitest';
import { readFileSync } from 'node:fs';

const page=readFileSync(new URL('../../app/banking-journeys/[slug]/page.tsx',import.meta.url),'utf8');
const portal=readFileSync(new URL('./JourneyPortal.tsx',import.meta.url),'utf8');
const reader=readFileSync(new URL('./SharedJourneyReader.tsx',import.meta.url),'utf8');
const navigator=readFileSync(new URL('./JourneyNavigator.tsx',import.meta.url),'utf8');
const navigation=readFileSync(new URL('./journey-navigation.ts',import.meta.url),'utf8');
const blocks=readFileSync(new URL('./blocks/JourneyBlockRenderer.tsx',import.meta.url),'utf8');
describe('Journey reading architecture regressions',()=>{
  it('keeps one authorized repository content fetch at the route boundary',()=>expect(page.match(/ContentRepository\.getContentBySlug/g)).toHaveLength(1));
  it('keeps callable navigation derivation outside the client component graph',()=>{expect(reader).toContain("from './journey-navigation'");expect(reader).not.toMatch(/deriveJourneyNavigation[^\n]*from '\.\/JourneyNavigator'/);expect(navigator.startsWith("'use client';")).toBe(true);expect(navigation).not.toContain("'use client'")});
  it('keeps Payments as a thin adapter supplying paymentType query state',()=>{expect(portal).toContain('<SharedJourneyReader');expect(portal).toContain("preservedQueryParams:{paymentType:selected.slug}");expect(reader).toContain('← Previous:');expect(reader).toContain('Next:')});
  it('keeps the existing BPMN renderer path and local containment untouched',()=>{expect(blocks).toContain("import { BusinessProcessDiagram, isBusinessProcessDiagram } from './BusinessProcessDiagram'");expect(blocks).toContain('<BusinessProcessDiagram payload={payload} />')});
});

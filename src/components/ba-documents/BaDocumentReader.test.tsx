import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { baDocumentTemplates } from '@/server/ba-document/ba-document-templates';
import { BaDocumentReader } from './BaDocumentReader';

describe('BA Document reader', () => {
  it('reuses responsive Journey navigation and contains wide governed tables', () => {
    const content=structuredClone(baDocumentTemplates.BRD_STANDARD);
    content.modules[0]!.sections[0]!.blocks = [
      {id:'rich',schemaVersion:1,blockType:'RICH_TEXT',payload:{text:'Project-specific analysis'}},
      {id:'table',schemaVersion:1,blockType:'TABLE',payload:{headers:['Field','Value'],rows:[['Status','Ready']]}},
      {id:'check',schemaVersion:1,blockType:'CHECKLIST',payload:{items:['Validated']}},
      {id:'callout',schemaVersion:1,blockType:'CALLOUT',payload:{title:'Decision',text:'Approved'}},
      {id:'diagram',schemaVersion:1,blockType:'DIAGRAM',payload:{nodes:[],edges:[]}},
      {id:'reference',schemaVersion:1,blockType:'REFERENCE',payload:{text:'Journey rule'}},
      {id:'code',schemaVersion:1,blockType:'CODE',payload:{text:'SELECT 1'}},
      {id:'api',schemaVersion:1,blockType:'API_REFERENCE',payload:{method:'GET',path:'/example'}},
    ];
    const html=renderToStaticMarkup(<BaDocumentReader content={content} slug="pilot-brd"/>);
    expect(html).toContain('Journey Navigator');
    expect(html).toContain('Project-specific analysis');
    expect(html).toContain('Requirements Traceability Matrix');
    expect(html).toContain('Same-document traceability only');
    expect(html).toContain('overflow-x-auto');
    expect(html).toContain('Next:');
  });

  it('labels canonical Journey references without copying definitions', () => {
    const content=structuredClone(baDocumentTemplates.BRD_STANDARD);
    content.references={journeyKnowledge:[{journeySlug:'cards',referenceKind:'RULE',referenceId:'eligibility',displayLabel:'Card eligibility rule'}]};
    const html=renderToStaticMarkup(<BaDocumentReader content={content} slug="pilot-brd"/>);
    expect(html).toContain('Canonical Journey Reference');
    expect(html).toContain('/banking-journeys/cards');
    expect(html).toContain('Card eligibility rule');
  });
});

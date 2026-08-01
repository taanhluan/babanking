import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { DatabaseArticle } from './DatabaseContent';

vi.mock('@/components/member/KnowledgeActions', () => ({
  KnowledgeActions: () => createElement('div', null, 'Knowledge actions'),
}));

describe('DatabaseArticle', () => {
  it('keeps rendering the existing legacy Journey schema', () => {
    const html = renderToStaticMarkup(createElement(DatabaseArticle, {
      content: {
        id: 'journey',
        type: 'BANKING_JOURNEY',
        slug: 'customer-onboarding',
        title: 'Payments and Transfers',
        summary: 'Existing summary',
        body: {
          title: 'Payments and Transfers',
          summary: 'Existing summary',
          businessOverview: 'Existing business overview',
          customerGoals: ['Move money safely'],
        },
      },
    }));
    expect(html).toContain('Business Overview');
    expect(html).toContain('Existing business overview');
    expect(html).toContain('Move money safely');
  });

  it('renders generic modules, sections and blocks without raw HTML', () => {
    const html = renderToStaticMarkup(createElement(DatabaseArticle, {
      content: {
        id: 'journey',
        type: 'BANKING_JOURNEY',
        slug: 'customer-onboarding',
        title: 'Updated Payments Journey',
        summary: 'Updated summary',
        body: {
          title: 'Updated Payments Journey',
          summary: 'Updated summary',
          schemaVersion: 1,
          modules: [{
            id: 'overview',
            title: 'Payment Overview',
            sections: [{
              id: 'introduction',
              title: 'Introduction',
              blocks: [
                {
                  id: 'rich-text',
                  blockType: 'RICH_TEXT',
                  payload: { content: '<p>Development CMS marker</p><script>alert(1)</script>' },
                },
                {
                  id: 'rules',
                  blockType: 'CHECKLIST',
                  payload: { items: ['Validate beneficiary', 'Screen AML'] },
                },
                {
                  id: 'table',
                  blockType: 'TABLE',
                  payload: {
                    columns: ['Step', 'Owner'],
                    rows: [['Validate', 'Payment Hub']],
                  },
                },
                {
                  id: 'download',
                  blockType: 'DOWNLOAD',
                  payload: {
                    assetId: 'payment-reference',
                    storageKey: 'private/payment-reference.pdf',
                    signedUrl: 'https://storage.example/private-token',
                  },
                },
              ],
            }],
          }],
        },
      },
    }));
    expect(html).toContain('Payment Overview');
    expect(html).toContain('Development CMS marker');
    expect(html).toContain('Validate beneficiary');
    expect(html).toContain('Payment Hub');
    expect(html).toContain('payment-reference');
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('private/payment-reference.pdf');
    expect(html).not.toContain('private-token');
  });
});

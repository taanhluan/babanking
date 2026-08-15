import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { JourneyBusinessEditor } from './JourneyBusinessEditor';

vi.mock('../actions', () => ({
  saveJourneyDraftAction: vi.fn(),
}));

const legacyContent = {
  slug: 'notification-and-engagement',
  title: 'Notification and Engagement',
  summary: 'A legacy flat Journey summary that satisfies the existing content schema.',
  businessOverview: 'Legacy flat content without structured modules.',
};

function renderEditor(content: object) {
  return renderToStaticMarkup(
    <JourneyBusinessEditor
      slug="notification-and-engagement"
      revisionId="draft-revision"
      initialContentJson={JSON.stringify(content)}
    />,
  );
}

describe('JourneyBusinessEditor legacy content compatibility', () => {
  it('renders legacy flat Journey content without dereferencing a missing selected node', () => {
    const html = renderEditor(legacyContent);

    expect(html).toContain('Legacy Journey content');
    expect(html).toContain('Use Advanced JSON to inspect or upgrade this Draft');
    expect(html).toContain('Advanced JSON');
  });

  it('renders a structured path with zero blocks without reading a missing block type', () => {
    const html = renderEditor({
      ...legacyContent,
      modules: [{ title: 'Module', sections: [{ title: 'Empty section', blocks: [] }] }],
    });

    expect(html).toContain('Selected module');
    expect(html).toContain('Empty section');
  });

  it.each([
    'Customer Onboarding',
    'Deposits',
    'Cards',
    'Lending',
    'Customer Service',
  ])('continues to render canonical structured content for %s', (title) => {
    const html = renderEditor({
      ...legacyContent,
      title,
      metadata: { journeyReader: 'canonical' },
      modules: [{ title: 'Canonical module', sections: [{ title: 'Purpose', blocks: [{ blockType: 'RICH_TEXT', schemaVersion: 1, payload: { title: 'Purpose' } }] }] }],
    });

    expect(html).toContain('Selected module');
    expect(html).toContain('Canonical module');
    expect(html).not.toContain('Legacy Journey content');
  });
});

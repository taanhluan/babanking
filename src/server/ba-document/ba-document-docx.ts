import {
  AlignmentType, BorderStyle, Document, Footer, Header, HeadingLevel, PageBreak,
  PageNumber, Packer, Paragraph, ShadingType, Table, TableCell, TableRow, TextRun,
  VerticalAlign, WidthType,
} from 'docx';
import type { BaDocumentExportModel, ExportArtifact, ExportBlock } from './ba-document-export-model';

const NAVY = '0B2545';
const BLUE = '2E65D1';
const LIGHT = 'E8EEF5';
const A4 = { width: 11906, height: 16838 };
const margins = { top: 1134, right: 1134, bottom: 1134, left: 1134, header: 567, footer: 567 };
type RunOptions = NonNullable<Exclude<ConstructorParameters<typeof TextRun>[0], string>>;
type ParagraphOptions = NonNullable<Exclude<ConstructorParameters<typeof Paragraph>[0], string>>;

const text = (value: string, options: RunOptions = {}) => new TextRun({ text: value, font: 'Aptos', size: 22, color: NAVY, ...options });
const paragraph = (value = '', options: ParagraphOptions = {}) => new Paragraph({ children: value ? [text(value)] : [], spacing: { after: 120, line: 276 }, ...options });
const cell = (value: string, bold = false, shade?: string) => new TableCell({
  verticalAlign: VerticalAlign.CENTER,
  shading: shade ? { type: ShadingType.CLEAR, fill: shade } : undefined,
  margins: { top: 90, bottom: 90, left: 120, right: 120 },
  children: [new Paragraph({ children: [text(value, { bold })], spacing: { after: 0 } })],
});
const table = (headers: string[], rows: string[][], widths?: number[]) => new Table({
  width: { size: 9638, type: WidthType.DXA },
  columnWidths: widths,
  rows: [
    new TableRow({ tableHeader: true, children: headers.map((value) => cell(value, true, LIGHT)) }),
    ...rows.map((row) => new TableRow({ cantSplit: true, children: headers.map((_, index) => cell(row[index] ?? '')) })),
  ],
});
const heading = (value: string, level: typeof HeadingLevel.HEADING_1 | typeof HeadingLevel.HEADING_2 | typeof HeadingLevel.HEADING_3) => new Paragraph({
  heading: level,
  children: [text(value, { bold: true, color: level === HeadingLevel.HEADING_1 ? BLUE : NAVY })],
  spacing: { before: level === HeadingLevel.HEADING_1 ? 320 : 220, after: 120 }, keepNext: true,
});

function blockChildren(block: ExportBlock) {
  const children: Array<Paragraph | Table> = [];
  if (block.title) children.push(new Paragraph({ children: [text(block.title, { bold: true })], spacing: { before: 80, after: 80 }, keepNext: true }));
  children.push(...block.paragraphs.map((value) => paragraph(value)));
  if (block.headers?.length && block.rows?.length) children.push(table(block.headers, block.rows));
  if (!children.length) children.push(paragraph(`[${block.type}: ${block.id}]`));
  return children;
}

function artifactChildren(item: ExportArtifact) {
  const rows = item.fields.map((field) => [field.label, Array.isArray(field.value) ? field.value.join('\n') : field.value]);
  return [
    new Paragraph({ heading: HeadingLevel.HEADING_3, children: [text(`${item.id} - ${item.title}`, { bold: true })], spacing: { before: 180, after: 100 }, keepNext: true }),
    ...(rows.length ? [table(['Field', 'Documented value'], rows, [2300, 7338])] : []),
  ];
}

export async function renderBaDocumentDocx(model: BaDocumentExportModel) {
  const m = model.metadata;
  const body: Array<Paragraph | Table> = [
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 1800, after: 300 }, children: [text('BANKING BA KNOWLEDGE HUB', { bold: true, color: BLUE, size: 24 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 800 }, children: [text('BUSINESS REQUIREMENTS DOCUMENT', { bold: true, color: NAVY, size: 36 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 220 }, children: [text(m.documentCode, { bold: true, color: BLUE, size: 28 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 800 }, children: [text(m.title, { bold: true, size: 32 })] }),
    table(['Document detail', 'Governed value'], [
      ['Primary Journey', m.primaryJourney], ['Version', `v${m.version}`], ['Status', m.status], ['Last Updated', new Date(m.lastUpdated).toLocaleDateString(model.locale)],
    ], [3000, 6638]),
    new Paragraph({ children: [new PageBreak()] }),
    heading('Document Control', HeadingLevel.HEADING_1),
    table(['Field', 'Value'], [
      ['Document Code', m.documentCode], ['Document Type', m.documentType], ['Title', m.title], ['Summary', m.summary], ['Primary Journey', m.primaryJourney], ['Version', `v${m.version}`], ['Status', m.status], ['Last Updated', new Date(m.lastUpdated).toLocaleDateString(model.locale)],
    ], [2600, 7038]),
    heading('Revision History', HeadingLevel.HEADING_1),
    table(['Version', 'Date', 'Change Summary', 'Author / Publisher'], model.revisionHistory.map((row) => [
      `v${row.version}`, row.date ? new Date(row.date).toLocaleDateString(model.locale) : '', row.changeSummary ?? '', row.authorOrPublisher ?? '',
    ]), [1200, 1700, 4300, 2438]),
    heading('Contents', HeadingLevel.HEADING_1),
    ...model.modules.flatMap((module, moduleIndex) => [
      paragraph(`${moduleIndex + 1}. ${module.title}`, { indent: { left: 180 } }),
      ...module.sections.map((section, sectionIndex) => paragraph(`${moduleIndex + 1}.${sectionIndex + 1} ${section.title}`, { indent: { left: 540 } })),
    ]),
  ];
  model.modules.forEach((module, moduleIndex) => {
    body.push(heading(`${moduleIndex + 1}. ${module.title}`, HeadingLevel.HEADING_1));
    if (module.summary) body.push(paragraph(module.summary));
    module.sections.forEach((section, sectionIndex) => {
      body.push(heading(`${moduleIndex + 1}.${sectionIndex + 1} ${section.title}`, HeadingLevel.HEADING_2));
      if (section.summary) body.push(paragraph(section.summary));
      body.push(...section.blocks.flatMap(blockChildren));
    });
  });
  if (model.artifactGroups.length) {
    body.push(heading('Business Analysis Artifacts', HeadingLevel.HEADING_1));
    for (const group of model.artifactGroups) {
      body.push(heading(group.title, HeadingLevel.HEADING_2));
      body.push(...group.items.flatMap(artifactChildren));
    }
  }
  if (model.traceability.length) {
    body.push(heading('Requirements Traceability Matrix', HeadingLevel.HEADING_1));
    body.push(table(
      ['Requirement', 'Rules', 'Validations', 'Processes', 'Acceptance Criteria', 'UAT', 'Integrity'],
      model.traceability.map((row) => [row.requirement, row.businessRules.join('\n'), row.validations.join('\n'), row.processes.join('\n'), row.acceptanceCriteria.join('\n'), row.uat.join('\n'), row.integrity]),
    ));
  }
  const doc = new Document({
    creator: 'Banking BA Knowledge Hub',
    title: `${m.documentCode} ${m.title}`,
    description: 'Governed BA Document export',
    styles: {
      default: { document: { run: { font: 'Aptos', size: 22, color: NAVY }, paragraph: { spacing: { after: 120, line: 276 } } } },
      paragraphStyles: [
        { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: 'Aptos Display', size: 32, bold: true, color: BLUE }, paragraph: { spacing: { before: 320, after: 160 }, outlineLevel: 0 } },
        { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: 'Aptos Display', size: 27, bold: true, color: NAVY }, paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 1 } },
        { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: 'Aptos', size: 24, bold: true, color: NAVY }, paragraph: { spacing: { before: 180, after: 100 }, outlineLevel: 2 } },
      ],
    },
    sections: [{
      properties: { page: { size: A4, margin: margins } },
      headers: { default: new Header({ children: [new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' } }, children: [text(`${m.documentCode} | ${m.title}`, { size: 18, color: '64748B' })] })] }) },
      footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [text('Page ', { size: 18, color: '64748B' }), new TextRun({ children: [PageNumber.CURRENT], size: 18, color: '64748B' })] })] }) },
      children: body,
    }],
  });
  return Packer.toBuffer(doc);
}

import PDFDocument from 'pdfkit';
import type { BaDocumentExportModel, ExportArtifact, ExportBlock } from './ba-document-export-model';

const NAVY = '#0B2545';
const BLUE = '#2E65D1';
const GRAY = '#64748B';
const LIGHT = '#E8EEF5';
const PAGE = { size: 'A4' as const, margins: { top: 58, right: 50, bottom: 58, left: 50 } };

function ensureSpace(doc: PDFKit.PDFDocument, height: number) {
  if (doc.y + height > doc.page.height - PAGE.margins.bottom) doc.addPage(PAGE);
}
function h(doc: PDFKit.PDFDocument, value: string, size: number, color = NAVY) {
  ensureSpace(doc, size * 2.2);
  doc.moveDown(0.5).font('Helvetica-Bold').fontSize(size).fillColor(color).text(value).moveDown(0.35);
}
function p(doc: PDFKit.PDFDocument, value: string, options: PDFKit.Mixins.TextOptions = {}) {
  doc.font('Helvetica').fontSize(9.5).fillColor(NAVY).text(value, { lineGap: 3, ...options }).moveDown(0.35);
}
function simpleTable(doc: PDFKit.PDFDocument, headers: string[], rows: string[][], widths?: number[]) {
  const available = doc.page.width - PAGE.margins.left - PAGE.margins.right;
  const cols = widths ?? headers.map(() => available / headers.length);
  const drawRow = (values: string[], header = false) => {
    const heights = headers.map((_, index) => doc.heightOfString(values[index] ?? '', { width: cols[index]! - 12, lineGap: 2 }));
    const height = Math.max(24, ...heights) + 10;
    ensureSpace(doc, height + (header ? 0 : 4));
    const y = doc.y;
    let x = PAGE.margins.left;
    values.forEach((value, index) => {
      doc.rect(x, y, cols[index]!, height).fillAndStroke(header ? LIGHT : '#FFFFFF', '#CBD5E1');
      doc.font(header ? 'Helvetica-Bold' : 'Helvetica').fontSize(8).fillColor(NAVY).text(value, x + 6, y + 6, { width: cols[index]! - 12, lineGap: 2 });
      x += cols[index]!;
    });
    doc.y = y + height;
  };
  drawRow(headers, true);
  rows.forEach((row) => drawRow(headers.map((_, index) => row[index] ?? '')));
  doc.moveDown(0.5);
}
function renderBlock(doc: PDFKit.PDFDocument, block: ExportBlock) {
  if (block.title) h(doc, block.title, 10);
  block.paragraphs.forEach((value) => p(doc, value));
  if (block.headers?.length && block.rows?.length) simpleTable(doc, block.headers, block.rows);
  if (!block.paragraphs.length && !block.rows?.length) p(doc, `[${block.type}: ${block.id}]`);
}
function renderArtifact(doc: PDFKit.PDFDocument, item: ExportArtifact) {
  h(doc, `${item.id} - ${item.title}`, 10.5, BLUE);
  simpleTable(doc, ['Field', 'Documented value'], item.fields.map((field) => [field.label, Array.isArray(field.value) ? field.value.join('\n') : field.value]), [120, 375]);
}

export function renderBaDocumentPdf(model: BaDocumentExportModel): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({ ...PAGE, bufferPages: true, info: { Title: `${model.metadata.documentCode} ${model.metadata.title}`, Author: 'Banking BA Knowledge Hub', Subject: 'Governed BA Document export' } });
    doc.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    doc.on('error', reject);
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    const m = model.metadata;
    doc.moveDown(5).font('Helvetica-Bold').fontSize(12).fillColor(BLUE).text('BANKING BA KNOWLEDGE HUB', { align: 'center' }).moveDown(2);
    doc.fontSize(22).fillColor(NAVY).text('BUSINESS REQUIREMENTS DOCUMENT', { align: 'center' }).moveDown(1.5);
    doc.fontSize(16).fillColor(BLUE).text(m.documentCode, { align: 'center' }).moveDown(0.7);
    doc.fontSize(18).fillColor(NAVY).text(m.title, { align: 'center' }).moveDown(2);
    simpleTable(doc, ['Document detail', 'Governed value'], [['Primary Journey', m.primaryJourney], ['Version', `v${m.version}`], ['Status', m.status], ['Last Updated', new Date(m.lastUpdated).toLocaleDateString(model.locale)]], [150, 345]);
    doc.addPage(PAGE);
    h(doc, 'Document Control', 16, BLUE);
    simpleTable(doc, ['Field', 'Value'], [['Document Code', m.documentCode], ['Document Type', m.documentType], ['Title', m.title], ['Summary', m.summary], ['Primary Journey', m.primaryJourney], ['Version', `v${m.version}`], ['Status', m.status], ['Last Updated', new Date(m.lastUpdated).toLocaleDateString(model.locale)]], [135, 360]);
    h(doc, 'Revision History', 16, BLUE);
    simpleTable(doc, ['Version', 'Date', 'Change Summary', 'Author / Publisher'], model.revisionHistory.map((row) => [`v${row.version}`, row.date ? new Date(row.date).toLocaleDateString(model.locale) : '', row.changeSummary ?? '', row.authorOrPublisher ?? '']), [50, 75, 230, 140]);
    h(doc, 'Contents', 16, BLUE);
    model.modules.forEach((module, mi) => { p(doc, `${mi + 1}. ${module.title}`); module.sections.forEach((section, si) => p(doc, `${mi + 1}.${si + 1} ${section.title}`, { indent: 18 })); });
    model.modules.forEach((module, mi) => {
      h(doc, `${mi + 1}. ${module.title}`, 16, BLUE); if (module.summary) p(doc, module.summary);
      module.sections.forEach((section, si) => { h(doc, `${mi + 1}.${si + 1} ${section.title}`, 13); if (section.summary) p(doc, section.summary); section.blocks.forEach((block) => renderBlock(doc, block)); });
    });
    if (model.artifactGroups.length) h(doc, 'Business Analysis Artifacts', 16, BLUE);
    model.artifactGroups.forEach((group) => { h(doc, group.title, 13); group.items.forEach((item) => renderArtifact(doc, item)); });
    if (model.traceability.length) {
      h(doc, 'Requirements Traceability Matrix', 16, BLUE);
      model.traceability.forEach((row) => {
        renderArtifact(doc, { id: row.requirement, title: 'Traceability', fields: [
          ['Business Rules', row.businessRules], ['Validations', row.validations], ['Processes', row.processes], ['Acceptance Criteria', row.acceptanceCriteria], ['UAT', row.uat], ['Integrity', row.integrity],
        ].filter(([, value]) => !Array.isArray(value) || value.length).map(([field, value]) => ({ label: String(field), value: value as string | string[] })) });
      });
    }
    const range = doc.bufferedPageRange();
    for (let index = range.start; index < range.start + range.count; index += 1) {
      doc.switchToPage(index);
      const width = doc.page.width - PAGE.margins.left - PAGE.margins.right;
      const bottomMargin = doc.page.margins.bottom;
      doc.page.margins.bottom = 0;
      doc.font('Helvetica').fontSize(8).fillColor(GRAY).text(`${m.documentCode} | ${m.title}`, PAGE.margins.left, 24, { width, align: 'left', lineBreak: false });
      doc.text(`Page ${index + 1} of ${range.count}`, PAGE.margins.left, doc.page.height - 34, { width, align: 'right', lineBreak: false });
      doc.page.margins.bottom = bottomMargin;
    }
    doc.end();
  });
}

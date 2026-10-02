import type { GlossaryDomain, GlossaryKind, RegulationStatus } from '@/server/glossary/glossary-domain';

export const glossaryCopy = {
  en: {
    eyebrow: 'Banking Reference', title: 'Glossary & Regulations', current: 'Glossary',
    description: 'Banking terms and Vietnamese and international regulations, explained for business analysts.',
    search: 'Search terms, abbreviations or document numbers', allKinds: 'All types', allDomains: 'All domains', allJurisdictions: 'All jurisdictions',
    apply: 'Filter', reset: 'Reset', empty: 'No entries match these filters.', count: (n: number) => `${n} entr${n === 1 ? 'y' : 'ies'}`,
    definition: 'Definition', details: 'Details', baNotes: 'BA notes', sources: 'Sources', related: 'Related terms & regulations', journeys: 'Related Journeys',
    aliases: 'Also known as', issuer: 'Issuer', documentNumber: 'Document number', issued: 'Issued', effective: 'Effective', status: 'Status',
    jurisdiction: 'Jurisdiction', supersededBy: 'Superseded by', lastVerified: 'Last verified', back: 'Back to glossary',
    disclaimer: 'Reference summary for analysis only. Always confirm against the official legal text.',
    journeyPanel: 'Terms & regulations in this Journey',
  },
  vi: {
    eyebrow: 'Tra cứu ngân hàng', title: 'Thuật ngữ & Quy định', current: 'Thuật ngữ',
    description: 'Thuật ngữ ngân hàng và các quy định Việt Nam, quốc tế, giải thích cho Business Analyst.',
    search: 'Tìm thuật ngữ, viết tắt hoặc số hiệu văn bản', allKinds: 'Tất cả loại', allDomains: 'Tất cả lĩnh vực', allJurisdictions: 'Tất cả phạm vi',
    apply: 'Lọc', reset: 'Xóa lọc', empty: 'Không có mục nào phù hợp.', count: (n: number) => `${n} mục`,
    definition: 'Định nghĩa', details: 'Chi tiết', baNotes: 'Ghi chú cho BA', sources: 'Nguồn', related: 'Thuật ngữ & quy định liên quan', journeys: 'Hành trình liên quan',
    aliases: 'Tên gọi khác', issuer: 'Cơ quan ban hành', documentNumber: 'Số hiệu', issued: 'Ngày ban hành', effective: 'Ngày hiệu lực', status: 'Tình trạng',
    jurisdiction: 'Phạm vi', supersededBy: 'Được thay thế bởi', lastVerified: 'Kiểm tra lần cuối', back: 'Quay lại danh mục',
    disclaimer: 'Tóm tắt tham khảo phục vụ phân tích. Luôn đối chiếu với văn bản pháp lý chính thức.',
    journeyPanel: 'Thuật ngữ & quy định trong hành trình này',
  },
} as const;

export const glossaryKindLabels: Record<'en' | 'vi', Record<GlossaryKind, string>> = {
  en: { TERM: 'Term', REGULATION: 'Regulation' },
  vi: { TERM: 'Thuật ngữ', REGULATION: 'Quy định' },
};

export const glossaryDomainLabels: Record<'en' | 'vi', Record<GlossaryDomain, string>> = {
  en: { PAYMENTS: 'Payments', LENDING: 'Lending', CARDS: 'Cards', DEPOSITS: 'Deposits', AML_KYC: 'AML / KYC', RISK: 'Risk', TREASURY: 'Treasury', TRADE_FINANCE: 'Trade Finance', DIGITAL_BANKING: 'Digital Banking', DATA_REPORTING: 'Data & Reporting', SECURITY: 'Security', ACCOUNTING: 'Accounting', GENERAL: 'General' },
  vi: { PAYMENTS: 'Thanh toán', LENDING: 'Cho vay', CARDS: 'Thẻ', DEPOSITS: 'Tiền gửi', AML_KYC: 'AML / KYC', RISK: 'Rủi ro', TREASURY: 'Nguồn vốn', TRADE_FINANCE: 'Tài trợ thương mại', DIGITAL_BANKING: 'Ngân hàng số', DATA_REPORTING: 'Dữ liệu & Báo cáo', SECURITY: 'Bảo mật', ACCOUNTING: 'Kế toán', GENERAL: 'Chung' },
};

export const regulationStatusLabels: Record<'en' | 'vi', Record<RegulationStatus, string>> = {
  en: { IN_FORCE: 'In force', AMENDED: 'Amended', SUPERSEDED: 'Superseded', REPEALED: 'Repealed' },
  vi: { IN_FORCE: 'Còn hiệu lực', AMENDED: 'Đã sửa đổi', SUPERSEDED: 'Đã được thay thế', REPEALED: 'Hết hiệu lực' },
};

export const regulationStatusTone: Record<RegulationStatus, string> = {
  IN_FORCE: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  AMENDED: 'bg-amber-50 text-amber-800 border-amber-200',
  SUPERSEDED: 'bg-orange-50 text-orange-800 border-orange-200',
  REPEALED: 'bg-red-50 text-red-800 border-red-200',
};

export function jurisdictionLabel(value: string, locale: 'en' | 'vi') {
  if (value === 'INTERNATIONAL') return locale === 'vi' ? 'Quốc tế' : 'International';
  if (value === 'VN') return 'Việt Nam';
  return value;
}

const vietnameseIssuers: Record<string, string> = {
  'State Bank of Vietnam (SBV)': 'Ngân hàng Nhà nước Việt Nam (NHNN)',
  'Government of Vietnam': 'Chính phủ',
  'National Assembly of Vietnam': 'Quốc hội',
};

/** Issuers are stored in English; /vi pages show the Vietnamese name for known Vietnamese issuers. */
export function issuerLabel(issuer: string, locale: 'en' | 'vi') {
  return locale === 'vi' ? vietnameseIssuers[issuer] ?? issuer : issuer;
}

import type { ContentPreview } from '@/lib/repository';

export type SegmentLocaleContent = { title: string; description: string; focus: string[]; alt: string };
export type SegmentLandingSection =
  | { type: 'TEXT'; heading: string; content: string }
  | { type: 'FEATURE_GRID'; heading: string; items: { title: string; description: string }[] }
  | { type: 'IMAGE'; assetKey: 'retail-banking' | 'sme' | 'enterprise-banking'; alt: string; caption?: string };
export type JourneySegment = { slug: 'retail-banking' | 'sme' | 'enterprise-banking'; en: SegmentLocaleContent & { sections?: SegmentLandingSection[] }; vi: SegmentLocaleContent & { sections?: SegmentLandingSection[] }; journeys: string[] };
export const journeySegments: JourneySegment[] = [
  {
    slug: 'retail-banking',
    en: { title: 'Retail Banking', description: 'Banking for individuals and households: everyday payments, saving, borrowing and long-term financial wellbeing.', focus: ['Everyday banking', 'Saving and borrowing', 'Customer experience'], alt: 'A home, payment card and personal savings' },
    vi: { title: 'Ngân hàng bán lẻ', description: 'Ngân hàng dành cho cá nhân và hộ gia đình: thanh toán hằng ngày, tiết kiệm, vay vốn và xây dựng nền tảng tài chính dài hạn.', focus: ['Ngân hàng hằng ngày', 'Tiết kiệm và vay vốn', 'Trải nghiệm khách hàng'], alt: 'Ngôi nhà, thẻ thanh toán và tiết kiệm cá nhân' },
    journeys: ['cards', 'customer-onboarding', 'customer-service', 'deposits', 'lending', 'notification-and-engagement', 'payments-and-transfers', 'paymentsandtransfers', 'personal-finance-management', 'security-and-access', 'wealth-and-investment'],
  },
  {
    slug: 'sme',
    en: { title: 'SME', description: 'Banking for small and medium-sized enterprises: managing cash flow, collecting payments, funding working capital and supporting business growth.', focus: ['Business cash flow', 'Working capital', 'Business growth'], alt: 'A small business storefront and growth chart' },
    vi: { title: 'Doanh nghiệp vừa và nhỏ', description: 'Ngân hàng dành cho doanh nghiệp vừa và nhỏ: quản lý dòng tiền, thu nhận thanh toán, tài trợ vốn lưu động và hỗ trợ phát triển kinh doanh.', focus: ['Dòng tiền doanh nghiệp', 'Vốn lưu động', 'Phát triển kinh doanh'], alt: 'Cửa hàng doanh nghiệp nhỏ và biểu đồ tăng trưởng' },
    journeys: [],
  },
  {
    slug: 'enterprise-banking',
    en: { title: 'Enterprise Banking', description: 'Banking for large enterprises and corporate groups: treasury, liquidity, trade finance and complex financing across entities and markets.', focus: ['Treasury and liquidity', 'Trade finance', 'Corporate financing'], alt: 'Corporate buildings and connected markets' },
    vi: { title: 'Ngân hàng doanh nghiệp lớn', description: 'Ngân hàng dành cho doanh nghiệp lớn và tập đoàn: quản lý ngân quỹ, thanh khoản, tài trợ thương mại và nhu cầu tài trợ trên nhiều đơn vị, thị trường.', focus: ['Ngân quỹ và thanh khoản', 'Tài trợ thương mại', 'Tài trợ doanh nghiệp'], alt: 'Các tòa nhà doanh nghiệp và thị trường kết nối' },
    journeys: [],
  },
] ;
export function findJourneySegment(slug: string) {
  return journeySegments.find((segment) => segment.slug === slug);
}
/** Only narrows previews already authorized by the repository. Never grants access. */
export function segmentJourneys(segment: JourneySegment, authorized: ContentPreview[]) {
  const slugs = new Set<string>(segment.journeys);
  return authorized.filter((item) => item.type === 'BANKING_JOURNEY' && slugs.has(item.slug));
}

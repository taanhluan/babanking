import { PrismaClient } from '@prisma/client';
import { assertDatabaseOperationAllowed, parseServerEnvironment } from '../src/server/environment-core';
import { loadEnvironmentFiles } from './load-environment-files';

loadEnvironmentFiles();
const environment = parseServerEnvironment(process.env, { requireAuthSecret: false });
assertDatabaseOperationAllowed('seed-development', environment);

const db = new PrismaClient();

const translations: Record<string, Record<string, unknown>> = {
  'fresher-ba': {
    slug: 'fresher-ba', level: 1, title: 'BA mới vào nghề', shortTitle: 'Mới vào nghề',
    summary: 'Xây dựng nền tảng vững chắc về ngôn ngữ BA, hành trình ngân hàng và tài liệu nghiệp vụ.',
    primaryFocus: ['Tài liệu hóa yêu cầu và hiểu quy trình'],
    bankingKnowledge: ['Các sản phẩm ngân hàng cốt lõi', 'Các hành trình khách hàng cơ bản', 'Thuật ngữ của các bên liên quan'],
    responsibilities: ['Ghi nhận biên bản cuộc họp', 'Tài liệu hóa các luồng đơn giản', 'Hỗ trợ rà soát yêu cầu'],
    expectedDeliverables: ['Ghi chú yêu cầu', 'Quy trình cơ bản', 'Tiêu chí chấp nhận'],
    stakeholderScope: ['Nhóm BA, sản phẩm và triển khai trực tiếp'],
    recommendedPracticeSlugs: ['requirement-discovery', 'ba-documentation'],
    recommendedJourneySlugs: ['customer-onboarding', 'payments-and-transfers'],
    readinessIndicators: ['Tự lập ghi chú rõ ràng', 'Giải thích được một hành trình ngân hàng cơ bản', 'Đặt được các câu hỏi làm rõ phù hợp'],
    commonDevelopmentGaps: ['Tập trung vào tài liệu thay vì kết quả', 'Bỏ sót ngoại lệ và tác động hạ nguồn', 'Xác thực giả định quá muộn'],
    nextLevelSlug: 'junior-ba',
    keywords: ['BA mới vào nghề', 'Tài liệu hóa yêu cầu và hiểu quy trình', 'Các sản phẩm ngân hàng cốt lõi', 'Các hành trình khách hàng cơ bản', 'Thuật ngữ của các bên liên quan', 'Khám phá yêu cầu', 'Tài liệu BA'],
  },
  'junior-ba': {
    slug: 'junior-ba', level: 2, title: 'BA sơ cấp', shortTitle: 'Sơ cấp',
    summary: 'Áp dụng phương pháp phân tích có cấu trúc cho các tính năng và quy trình vận hành có phạm vi rõ ràng.',
    primaryFocus: ['Phân tích có cấu trúc và làm rõ với các bên liên quan'],
    bankingKnowledge: ['Các hành trình cốt lõi', 'Quy tắc nghiệp vụ', 'Các hoạt động ngân hàng phổ biến'],
    responsibilities: ['Chuyển nội dung thảo luận thành user story', 'Lập bản đồ quy trình', 'Làm rõ yêu cầu'],
    expectedDeliverables: ['User story', 'Sơ đồ quy trình', 'Danh mục quy tắc'],
    stakeholderScope: ['Nhóm tính năng và chuyên gia nghiệp vụ vận hành'],
    recommendedPracticeSlugs: ['business-process-mapping', 'business-rules-definition'],
    recommendedJourneySlugs: ['customer-onboarding', 'payments-and-transfers'],
    readinessIndicators: ['Phụ trách trọn vẹn một tính năng nhỏ', 'Xác định được các ngoại lệ', 'Duy trì khả năng truy vết yêu cầu'],
    commonDevelopmentGaps: ['Tập trung vào tài liệu thay vì kết quả', 'Bỏ sót ngoại lệ và tác động hạ nguồn', 'Xác thực giả định quá muộn'],
    previousLevelSlug: 'fresher-ba', nextLevelSlug: 'middle-ba',
    keywords: ['BA sơ cấp', 'Phân tích có cấu trúc và làm rõ với các bên liên quan', 'Các hành trình cốt lõi', 'Quy tắc nghiệp vụ', 'Các hoạt động ngân hàng phổ biến', 'Lập bản đồ quy trình nghiệp vụ', 'Định nghĩa quy tắc nghiệp vụ'],
  },
  'middle-ba': {
    slug: 'middle-ba', level: 3, title: 'BA trung cấp', shortTitle: 'Trung cấp',
    summary: 'Kết nối nhu cầu liên chức năng và định hình các phương án giải pháp khả thi.',
    primaryFocus: ['Phân tích liên chức năng và định hình giải pháp'],
    bankingKnowledge: ['Quy trình đầu cuối', 'Tác động hệ thống', 'Kiểm soát và dữ liệu'],
    responsibilities: ['Dẫn dắt hoạt động phân tích', 'Đánh giá tác động', 'Điều phối các nhóm triển khai'],
    expectedDeliverables: ['Các phần của BRD', 'Phân tích khoảng cách', 'Đánh giá tác động'],
    stakeholderScope: ['Nhiều nhóm sản phẩm, vận hành, công nghệ và kiểm soát'],
    recommendedPracticeSlugs: ['capability-mapping', 'fit-gap-analysis', 'impact-assessment'],
    recommendedJourneySlugs: ['lending', 'security-and-access'],
    readinessIndicators: ['Giải quyết sự mơ hồ giữa các nhóm', 'Trình bày phương án và các đánh đổi', 'Dự liệu tác động hạ nguồn'],
    commonDevelopmentGaps: ['Tập trung vào tài liệu thay vì kết quả', 'Bỏ sót ngoại lệ và tác động hạ nguồn', 'Xác thực giả định quá muộn'],
    previousLevelSlug: 'junior-ba', nextLevelSlug: 'senior-ba',
    keywords: ['BA trung cấp', 'Phân tích liên chức năng và định hình giải pháp', 'Quy trình đầu cuối', 'Tác động hệ thống', 'Kiểm soát và dữ liệu', 'Lập bản đồ năng lực', 'Phân tích Fit-Gap', 'Đánh giá tác động'],
  },
  'senior-ba': {
    slug: 'senior-ba', level: 4, title: 'BA cao cấp', shortTitle: 'Cao cấp',
    summary: 'Dẫn dắt phân tích miền nghiệp vụ phức tạp và tạo ảnh hưởng đến các quyết định quan trọng.',
    primaryFocus: ['Phân tích miền nghiệp vụ phức tạp và đưa ra khuyến nghị'],
    bankingKnowledge: ['Chính sách và rủi ro', 'Thiết kế vận hành', 'Tác động cấp doanh nghiệp'],
    responsibilities: ['Dẫn dắt khám phá', 'Định hình khuyến nghị', 'Hướng dẫn các chuyên viên phân tích'],
    expectedDeliverables: ['Quy trình đầu cuối', 'Đánh giá phương án', 'Khuyến nghị giải pháp'],
    stakeholderScope: ['Lãnh đạo cấp cao về sản phẩm, kiến trúc, rủi ro và vận hành'],
    recommendedPracticeSlugs: ['solution-recommendation', 'stakeholder-alignment'],
    recommendedJourneySlugs: ['lending', 'security-and-access'],
    readinessIndicators: ['Tạo ảnh hưởng đến quyết định cấp cao', 'Cân bằng giá trị, rủi ro và tính khả thi', 'Nâng cao chất lượng phân tích của nhóm'],
    commonDevelopmentGaps: ['Tập trung vào tài liệu thay vì kết quả', 'Bỏ sót ngoại lệ và tác động hạ nguồn', 'Xác thực giả định quá muộn'],
    previousLevelSlug: 'middle-ba', nextLevelSlug: 'lead-principal-ba',
    keywords: ['BA cao cấp', 'Phân tích miền nghiệp vụ phức tạp và đưa ra khuyến nghị', 'Chính sách và rủi ro', 'Thiết kế vận hành', 'Tác động cấp doanh nghiệp', 'Khuyến nghị giải pháp', 'Điều phối các bên liên quan'],
  },
  'lead-principal-ba': {
    slug: 'lead-principal-ba', level: 5, title: 'BA trưởng hoặc BA chủ chốt', shortTitle: 'Trưởng / Chủ chốt',
    summary: 'Thiết lập định hướng phân tích và củng cố quản trị miền nghiệp vụ cũng như quản trị triển khai.',
    primaryFocus: ['Chiến lược, quản trị và định hướng chuyển đổi'],
    bankingKnowledge: ['Năng lực cấp doanh nghiệp', 'Bối cảnh kiến trúc', 'Quản trị triển khai'],
    responsibilities: ['Định hướng các sáng kiến', 'Cố vấn các nhóm', 'Dẫn dắt các quyết định chiến lược'],
    expectedDeliverables: ['Góc nhìn năng lực', 'Tài liệu quản trị', 'Đầu vào cho lộ trình'],
    stakeholderScope: ['Lãnh đạo danh mục và lãnh đạo doanh nghiệp'],
    recommendedPracticeSlugs: ['capability-mapping', 'stakeholder-alignment', 'solution-recommendation'],
    recommendedJourneySlugs: ['lending', 'security-and-access'],
    readinessIndicators: ['Định hình lộ trình gồm nhiều sáng kiến', 'Thiết lập các thực hành có thể tái sử dụng', 'Đóng vai trò cố vấn miền nghiệp vụ đáng tin cậy'],
    commonDevelopmentGaps: ['Tập trung vào tài liệu thay vì kết quả', 'Bỏ sót ngoại lệ và tác động hạ nguồn', 'Xác thực giả định quá muộn'],
    previousLevelSlug: 'senior-ba', nextLevelSlug: 'product-owner-domain-consultant',
    keywords: ['BA trưởng hoặc BA chủ chốt', 'Chiến lược, quản trị và định hướng chuyển đổi', 'Năng lực cấp doanh nghiệp', 'Bối cảnh kiến trúc', 'Quản trị triển khai', 'Lập bản đồ năng lực', 'Điều phối các bên liên quan', 'Khuyến nghị giải pháp'],
  },
  'product-owner-domain-consultant': {
    slug: 'product-owner-domain-consultant', level: 6, title: 'Product Owner hoặc Chuyên gia tư vấn miền nghiệp vụ', shortTitle: 'PO / Tư vấn',
    summary: 'Chuyển hóa chuyên môn sâu về miền nghiệp vụ thành định hướng sản phẩm hoặc định hướng doanh nghiệp.',
    primaryFocus: ['Kết quả sản phẩm, chiến lược miền nghiệp vụ và định hướng đầu tư'],
    bankingKnowledge: ['Chiến lược thị trường và khách hàng', 'Mô hình vận hành ngân hàng', 'Kinh tế danh mục'],
    responsibilities: ['Chịu trách nhiệm về kết quả', 'Ưu tiên đầu tư', 'Tư vấn chuyển đổi'],
    expectedDeliverables: ['Lộ trình sản phẩm', 'Chiến lược miền nghiệp vụ', 'Ưu tiên đầu tư'],
    stakeholderScope: ['Lãnh đạo điều hành, danh mục, sản phẩm và đối tác bên ngoài'],
    recommendedPracticeSlugs: ['prioritization', 'strategic-discovery', 'domain-advisory'],
    recommendedJourneySlugs: ['lending', 'security-and-access'],
    readinessIndicators: ['Chịu trách nhiệm về các kết quả đo lường được', 'Kết nối chiến lược với triển khai', 'Định hướng quyết định xuyên miền nghiệp vụ'],
    commonDevelopmentGaps: ['Tập trung vào tài liệu thay vì kết quả', 'Bỏ sót ngoại lệ và tác động hạ nguồn', 'Xác thực giả định quá muộn'],
    previousLevelSlug: 'lead-principal-ba',
    keywords: ['Product Owner hoặc Chuyên gia tư vấn miền nghiệp vụ', 'Kết quả sản phẩm, chiến lược miền nghiệp vụ và định hướng đầu tư', 'Chiến lược thị trường và khách hàng', 'Mô hình vận hành ngân hàng', 'Kinh tế danh mục', 'Ưu tiên hóa', 'Khám phá chiến lược', 'Tư vấn miền nghiệp vụ'],
  },
};

const structuralKeys = new Set([
  'slug', 'level', 'recommendedPracticeSlugs', 'recommendedJourneySlugs',
  'previousLevelSlug', 'nextLevelSlug',
]);

function assertParity(source: Record<string, unknown>, translated: Record<string, unknown>, slug: string) {
  const sourceKeys = Object.keys(source).sort();
  const translatedKeys = Object.keys(translated).sort();
  if (JSON.stringify(sourceKeys) !== JSON.stringify(translatedKeys)) throw new Error(`${slug}: top-level key mismatch`);
  for (const key of structuralKeys) {
    if (key in source && JSON.stringify(source[key]) !== JSON.stringify(translated[key])) {
      throw new Error(`${slug}: structural field ${key} changed`);
    }
  }
  for (const key of sourceKeys) {
    if (Array.isArray(source[key]) && (source[key] as unknown[]).length !== (translated[key] as unknown[]).length) {
      throw new Error(`${slug}: array length mismatch for ${key}`);
    }
  }
}

async function main() {
  const items = await db.contentItem.findMany({
    where: { type: 'CAREER_LEVEL', isArchived: false, publishedRevisionId: { not: null } },
    include: { publishedRevision: true, translations: { where: { locale: 'vi' }, include: { revisions: { select: { version: true } } } } },
  });
  if (items.length !== 6) throw new Error(`Expected 6 active career levels, found ${items.length}`);

  for (const item of items) {
    const translated = translations[item.slug];
    const sourceRevision = item.publishedRevision;
    if (!translated || !sourceRevision) throw new Error(`Missing source or translation for ${item.slug}`);
    const source = JSON.parse(sourceRevision.contentJson) as Record<string, unknown>;
    assertParity(source, translated, item.slug);
    const contentJson = JSON.stringify(translated);

    await db.$transaction(async (tx) => {
      const existing = item.translations[0];
      const translation = existing ?? await tx.contentTranslation.create({
        data: {
          contentItemId: item.id, locale: 'vi', slug: item.slug,
          title: String(translated.title), summary: String(translated.summary),
          status: 'NOT_STARTED', ownerId: item.ownerId,
        },
        include: { revisions: { select: { version: true } } },
      });
      const nextVersion = Math.max(0, ...translation.revisions.map((revision) => revision.version)) + 1;
      const now = new Date();
      const revision = await tx.translationRevision.create({
        data: {
          contentTranslationId: translation.id, version: nextVersion, status: 'PUBLISHED',
          contentJson, schemaVersion: sourceRevision.schemaVersion,
          authorId: item.ownerId, reviewerId: item.ownerId,
          reviewNote: 'Vietnamese career-level translation reviewed for structure and terminology.',
          submittedAt: now, reviewedAt: now, publishedAt: now,
        },
      });
      await tx.contentTranslation.update({
        where: { id: translation.id },
        data: {
          title: String(translated.title), summary: String(translated.summary), status: 'PUBLISHED',
          publishedRevisionId: revision.id, sourceUpdatedAt: sourceRevision.updatedAt,
        },
      });
    });
  }
  console.log(`Published ${items.length} Vietnamese career-level translations.`);
}

main().finally(() => db.$disconnect());

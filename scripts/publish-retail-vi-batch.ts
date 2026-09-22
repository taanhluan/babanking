import { PrismaClient } from '@prisma/client';
import { assertDatabaseOperationAllowed, parseServerEnvironment } from '../src/server/environment-core';
import { loadEnvironmentFiles } from './load-environment-files';

loadEnvironmentFiles();
const environment = parseServerEnvironment(process.env, { requireAuthSecret: false });
assertDatabaseOperationAllowed('seed-development', environment);
const db = new PrismaClient();

const journeyTranslations: Record<string, Record<string, unknown>> = {
  'personal-finance-management': {
    slug: 'personal-finance-management',
    title: 'Quản lý Tài chính Cá nhân',
    shortTitle: 'Tài chính Cá nhân',
    category: 'Khách hàng và Tài khoản',
    summary: 'Lập ngân sách, mục tiêu tiết kiệm, phân tích giao dịch và hỗ trợ sức khỏe tài chính.',
    businessOverview: 'Quản lý Tài chính Cá nhân kết nối mục tiêu của khách hàng với các hoạt động vận hành, quyết định, hệ thống và biện pháp kiểm soát. BA cần xem xét cả trải nghiệm hiển thị cho khách hàng và công việc hỗ trợ cần thiết để hoàn thành hành trình một cách tin cậy.',
    customerGoals: ['Hiểu thói quen chi tiêu và tiến gần hơn đến các mục tiêu tài chính cá nhân.', 'Hiểu trạng thái hiện tại, hành động tiếp theo và kết quả.'],
    businessGoals: ['Cung cấp dịch vụ quản lý tài chính cá nhân nhất quán trên các kênh được hỗ trợ.', 'Kiểm soát rủi ro vận hành và rủi ro khách hàng với bằng chứng kiểm toán rõ ràng.'],
    keyActors: ['Khách hàng', 'Quản lý Sản phẩm', 'Chuyên viên Phân tích Dữ liệu', 'Chuyên viên Tư vấn'],
    channels: ['Ngân hàng di động'],
    systems: ['Ngân hàng di động', 'Nền tảng phân tích', 'Dịch vụ thông báo'],
    capabilities: ['Lập ngân sách', 'Theo dõi Mục tiêu', 'Phân tích chuyên sâu', 'Khuyến nghị'],
    processSteps: [
      { title: 'Tổng hợp hoạt động', description: 'Bước điển hình 1: xác nhận đầu vào, quyền sở hữu, trạng thái, quyết định và bằng chứng cho hoạt động tổng hợp.' },
      { title: 'Phân loại chi tiêu', description: 'Bước điển hình 2: xác nhận đầu vào, quyền sở hữu, trạng thái, quyết định và bằng chứng cho việc phân loại chi tiêu.' },
      { title: 'Thiết lập mục tiêu', description: 'Bước điển hình 3: xác nhận đầu vào, quyền sở hữu, trạng thái, quyết định và bằng chứng cho việc thiết lập mục tiêu.' },
      { title: 'Theo dõi tiến độ', description: 'Bước điển hình 4: xác nhận đầu vào, quyền sở hữu, trạng thái, quyết định và bằng chứng cho việc theo dõi tiến độ.' },
      { title: 'Khuyến nghị hành động', description: 'Bước điển hình 5: xác nhận đầu vào, quyền sở hữu, trạng thái, quyết định và bằng chứng cho hành động được khuyến nghị.' },
    ],
    businessRules: [
      { title: 'Quy tắc minh họa 1', description: 'Khách hàng kiểm soát việc đồng ý sử dụng dữ liệu', illustrative: true },
      { title: 'Quy tắc minh họa 2', description: 'Khuyến nghị phải giải thích rõ nguồn dữ liệu', illustrative: true },
    ],
    dataEntities: ['Khách hàng', 'Tài khoản', 'Yêu cầu', 'Trạng thái', 'Ngân sách', 'Theo dõi Mục tiêu', 'Phân tích chuyên sâu'],
    risksAndControls: [
      { risk: 'Phân loại không chính xác', control: 'Xác định kiểm tra phòng ngừa hoặc phát hiện, trách nhiệm sở hữu, xử lý ngoại lệ và bằng chứng cho trường hợp phân loại không chính xác.' },
      { risk: 'Vi phạm quyền riêng tư', control: 'Xác định kiểm tra phòng ngừa hoặc phát hiện, trách nhiệm sở hữu, xử lý ngoại lệ và bằng chứng cho trường hợp vi phạm quyền riêng tư.' },
      { risk: 'Khuyến nghị gây hiểu nhầm', control: 'Xác định kiểm tra phòng ngừa hoặc phát hiện, trách nhiệm sở hữu, xử lý ngoại lệ và bằng chứng cho trường hợp khuyến nghị gây hiểu nhầm.' },
    ],
    commonExceptions: ['Thông tin không đầy đủ hoặc không nhất quán', 'Không thể hoàn tất một kiểm tra kiểm soát', 'Phản hồi từ hệ thống hạ nguồn bị chậm hoặc thất bại'],
    baQuestions: ['Kết quả nào xác định thành công cho Quản lý Tài chính Cá nhân?', 'Quy tắc nào thay đổi theo sản phẩm, kênh, khách hàng hoặc mức độ rủi ro?', 'Ai chịu trách nhiệm xử lý ngoại lệ?', 'Hệ thống nào là nguồn dữ liệu chuẩn?'],
    baOutputs: ['Quy tắc phân tích chuyên sâu', 'Yêu cầu về sự đồng ý', 'Ánh xạ dữ liệu', 'Hành trình khách hàng'],
    relatedPracticeSlugs: ['requirement-discovery', 'capability-mapping'],
    relatedCaseStudySlugs: ['mapping-business-requirements-to-capabilities'],
    relatedJourneySlugs: ['deposits', 'payments-and-transfers'],
    keywords: ['Quản lý Tài chính Cá nhân', 'Khách hàng và Tài khoản', 'Lập ngân sách', 'Theo dõi Mục tiêu', 'Phân tích chuyên sâu', 'Khuyến nghị', 'Ngân hàng di động', 'Nền tảng phân tích', 'Dịch vụ thông báo'],
  },
  'security-and-access': {
    slug: 'security-and-access',
    title: 'Bảo mật và Truy cập',
    shortTitle: 'Bảo mật & Truy cập',
    category: 'Rủi ro, Bảo mật và Truy cập',
    summary: 'Xác thực, phân quyền, vai trò người dùng, kiểm soát gian lận và quản trị truy cập.',
    businessOverview: 'Bảo mật và Truy cập kết nối mục tiêu của khách hàng với các hoạt động vận hành, quyết định, hệ thống và biện pháp kiểm soát. BA cần xem xét cả trải nghiệm hiển thị cho người dùng và công việc hỗ trợ cần thiết để hoàn thành hành trình một cách tin cậy.',
    customerGoals: ['Truy cập dịch vụ ngân hàng an toàn mà không gặp cản trở không cần thiết.', 'Hiểu trạng thái hiện tại, hành động tiếp theo và kết quả.'],
    businessGoals: ['Cung cấp khả năng bảo mật và truy cập nhất quán trên các kênh được hỗ trợ.', 'Kiểm soát rủi ro vận hành và rủi ro khách hàng với bằng chứng kiểm toán rõ ràng.'],
    keyActors: ['Khách hàng', 'Nhân viên', 'Đội Bảo mật', 'Chuyên viên Phân tích Gian lận', 'Kiểm toán viên'],
    channels: [],
    systems: ['Nhà cung cấp định danh', 'Bộ máy chống gian lận', 'Quản lý truy cập', 'Nền tảng kiểm toán'],
    capabilities: ['MFA', 'Truy cập theo Vai trò', 'Dấu vết Kiểm toán', 'Rà soát Gian lận'],
    processSteps: [
      { title: 'Nhận diện người dùng', description: 'Bước điển hình 1: xác nhận đầu vào, quyền sở hữu, trạng thái, quyết định và bằng chứng cho việc nhận diện người dùng.' },
      { title: 'Xác thực', description: 'Bước điển hình 2: xác nhận đầu vào, quyền sở hữu, trạng thái, quyết định và bằng chứng cho việc xác thực.' },
      { title: 'Đánh giá rủi ro', description: 'Bước điển hình 3: xác nhận đầu vào, quyền sở hữu, trạng thái, quyết định và bằng chứng cho việc đánh giá rủi ro.' },
      { title: 'Cấp quyền hành động', description: 'Bước điển hình 4: xác nhận đầu vào, quyền sở hữu, trạng thái, quyết định và bằng chứng cho việc cấp quyền hành động.' },
      { title: 'Ghi nhận kiểm toán', description: 'Bước điển hình 5: xác nhận đầu vào, quyền sở hữu, trạng thái, quyết định và bằng chứng cho việc ghi nhận kiểm toán.' },
    ],
    businessRules: [
      { title: 'Quy tắc minh họa 1', description: 'Tín hiệu rủi ro quyết định mức độ xác thực', illustrative: true },
      { title: 'Quy tắc minh họa 2', description: 'Quyền truy cập đặc quyền phải được phê duyệt và rà soát', illustrative: true },
    ],
    dataEntities: ['Khách hàng', 'Tài khoản', 'Yêu cầu', 'Trạng thái', 'MFA', 'Truy cập theo Vai trò', 'Dấu vết Kiểm toán'],
    risksAndControls: [
      { risk: 'Chiếm quyền tài khoản', control: 'Xác định kiểm tra phòng ngừa hoặc phát hiện, trách nhiệm sở hữu, xử lý ngoại lệ và bằng chứng cho trường hợp chiếm quyền tài khoản.' },
      { risk: 'Quyền hạn vượt mức', control: 'Xác định kiểm tra phòng ngừa hoặc phát hiện, trách nhiệm sở hữu, xử lý ngoại lệ và bằng chứng cho trường hợp quyền hạn vượt mức.' },
      { risk: 'Thiếu bằng chứng kiểm toán', control: 'Xác định kiểm tra phòng ngừa hoặc phát hiện, trách nhiệm sở hữu, xử lý ngoại lệ và bằng chứng cho trường hợp thiếu bằng chứng kiểm toán.' },
    ],
    commonExceptions: ['Thông tin không đầy đủ hoặc không nhất quán', 'Không thể hoàn tất một kiểm tra kiểm soát', 'Phản hồi từ hệ thống hạ nguồn bị chậm hoặc thất bại'],
    baQuestions: ['Kết quả nào xác định thành công cho Bảo mật và Truy cập?', 'Quy tắc nào thay đổi theo sản phẩm, kênh, khách hàng hoặc mức độ rủi ro?', 'Ai chịu trách nhiệm xử lý ngoại lệ?', 'Hệ thống nào là nguồn dữ liệu chuẩn?'],
    baOutputs: ['Ma trận truy cập', 'Quy tắc xác thực', 'Yêu cầu kiểm soát', 'Kịch bản kiểm toán'],
    relatedPracticeSlugs: ['impact-assessment', 'business-rules-definition'],
    relatedCaseStudySlugs: ['mapping-business-requirements-to-capabilities'],
    relatedJourneySlugs: ['notification-and-engagement', 'customer-onboarding'],
    keywords: ['Bảo mật và Truy cập', 'Rủi ro, Bảo mật và Truy cập', 'MFA', 'Truy cập theo Vai trò', 'Dấu vết Kiểm toán', 'Rà soát Gian lận', 'Nhà cung cấp định danh', 'Bộ máy chống gian lận', 'Quản lý truy cập', 'Nền tảng kiểm toán'],
  },
  'wealth-and-investment': {
    slug: 'wealth-and-investment',
    title: 'Quản lý Tài sản và Đầu tư',
    shortTitle: 'Tài sản & Đầu tư',
    category: 'Quản lý Tài sản và Tư vấn',
    summary: 'Tiếp nhận nhà đầu tư, đánh giá tính phù hợp, thiết lập danh mục, quản lý lệnh và báo cáo.',
    businessOverview: 'Quản lý Tài sản và Đầu tư kết nối mục tiêu của khách hàng với các hoạt động vận hành, quyết định, hệ thống và biện pháp kiểm soát. BA cần xem xét cả trải nghiệm hiển thị cho khách hàng và công việc hỗ trợ cần thiết để hoàn thành hành trình một cách tin cậy.',
    customerGoals: ['Đầu tư phù hợp với mục tiêu cá nhân, khẩu vị rủi ro và yêu cầu phù hợp theo quy định.', 'Hiểu trạng thái hiện tại, hành động tiếp theo và kết quả.'],
    businessGoals: ['Cung cấp dịch vụ quản lý tài sản và đầu tư nhất quán trên các kênh được hỗ trợ.', 'Kiểm soát rủi ro vận hành và rủi ro khách hàng với bằng chứng kiểm toán rõ ràng.'],
    keyActors: ['Nhà đầu tư', 'Chuyên viên Tư vấn', 'Quản lý Danh mục', 'Tuân thủ'],
    channels: [],
    systems: ['Nền tảng quản lý tài sản', 'Quản lý lệnh', 'Dữ liệu thị trường', 'CRM'],
    capabilities: ['Thiết lập Danh mục', 'Hồ sơ Rủi ro', 'Lệnh Đầu tư', 'Báo cáo'],
    processSteps: [
      { title: 'Lập hồ sơ khách hàng', description: 'Bước điển hình 1: xác nhận đầu vào, quyền sở hữu, trạng thái, quyết định và bằng chứng cho việc lập hồ sơ khách hàng.' },
      { title: 'Đánh giá tính phù hợp', description: 'Bước điển hình 2: xác nhận đầu vào, quyền sở hữu, trạng thái, quyết định và bằng chứng cho việc đánh giá tính phù hợp.' },
      { title: 'Mở danh mục', description: 'Bước điển hình 3: xác nhận đầu vào, quyền sở hữu, trạng thái, quyết định và bằng chứng cho việc mở danh mục.' },
      { title: 'Đặt lệnh', description: 'Bước điển hình 4: xác nhận đầu vào, quyền sở hữu, trạng thái, quyết định và bằng chứng cho việc đặt lệnh.' },
      { title: 'Báo cáo hiệu quả', description: 'Bước điển hình 5: xác nhận đầu vào, quyền sở hữu, trạng thái, quyết định và bằng chứng cho việc báo cáo hiệu quả.' },
    ],
    businessRules: [
      { title: 'Quy tắc minh họa 1', description: 'Sản phẩm phải phù hợp với hồ sơ đánh giá tính phù hợp', illustrative: true },
      { title: 'Quy tắc minh họa 2', description: 'Tư vấn và sự đồng ý phải được ghi nhận', illustrative: true },
    ],
    dataEntities: ['Khách hàng', 'Tài khoản', 'Yêu cầu', 'Trạng thái', 'Thiết lập Danh mục', 'Hồ sơ Rủi ro', 'Lệnh Đầu tư'],
    risksAndControls: [
      { risk: 'Tư vấn không phù hợp', control: 'Xác định kiểm tra phòng ngừa hoặc phát hiện, trách nhiệm sở hữu, xử lý ngoại lệ và bằng chứng cho trường hợp tư vấn không phù hợp.' },
      { risk: 'Rủi ro thị trường', control: 'Xác định kiểm tra phòng ngừa hoặc phát hiện, trách nhiệm sở hữu, xử lý ngoại lệ và bằng chứng cho rủi ro thị trường.' },
      { risk: 'Lỗi lệnh', control: 'Xác định kiểm tra phòng ngừa hoặc phát hiện, trách nhiệm sở hữu, xử lý ngoại lệ và bằng chứng cho trường hợp lỗi lệnh.' },
    ],
    commonExceptions: ['Thông tin không đầy đủ hoặc không nhất quán', 'Không thể hoàn tất một kiểm tra kiểm soát', 'Phản hồi từ hệ thống hạ nguồn bị chậm hoặc thất bại'],
    baQuestions: ['Kết quả nào xác định thành công cho Quản lý Tài sản và Đầu tư?', 'Quy tắc nào thay đổi theo sản phẩm, kênh, khách hàng hoặc mức độ rủi ro?', 'Ai chịu trách nhiệm xử lý ngoại lệ?', 'Hệ thống nào là nguồn dữ liệu chuẩn?'],
    baOutputs: ['Quy tắc đánh giá tính phù hợp', 'Quy trình tư vấn', 'Yêu cầu công bố thông tin', 'Ánh xạ dữ liệu'],
    relatedPracticeSlugs: ['requirement-discovery', 'capability-mapping'],
    relatedCaseStudySlugs: ['mapping-business-requirements-to-capabilities'],
    relatedJourneySlugs: ['lending', 'customer-service'],
    keywords: ['Quản lý Tài sản và Đầu tư', 'Quản lý Tài sản và Tư vấn', 'Thiết lập Danh mục', 'Hồ sơ Rủi ro', 'Lệnh Đầu tư', 'Báo cáo', 'Nền tảng quản lý tài sản', 'Quản lý lệnh', 'Dữ liệu thị trường', 'CRM'],
  },
};

const immutableKeys = new Set(['slug', 'level', 'schemaVersion', 'type', 'assetKey', 'illustrative', 'order', 'id', 'key', 'blockType', 'diagramType', 'orientation', 'laneId', 'source', 'target', 'state']);
const immutableArrays = new Set(['relatedPracticeSlugs', 'relatedCaseStudySlugs', 'relatedJourneySlugs', 'journeys']);

function assertParity(source: unknown, translated: unknown, path = 'root') {
  if (Array.isArray(source)) {
    if (!Array.isArray(translated) || source.length !== translated.length) throw new Error(`${path}: array mismatch`);
    source.forEach((value, index) => assertParity(value, translated[index], `${path}[${index}]`));
    return;
  }
  if (source && typeof source === 'object') {
    if (!translated || typeof translated !== 'object' || Array.isArray(translated)) throw new Error(`${path}: object mismatch`);
    const a = Object.keys(source as Record<string, unknown>).sort();
    const b = Object.keys(translated as Record<string, unknown>).sort();
    if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${path}: key mismatch`);
    for (const key of a) {
      const left = (source as Record<string, unknown>)[key];
      const right = (translated as Record<string, unknown>)[key];
      if ((immutableKeys.has(key) || immutableArrays.has(key)) && JSON.stringify(left) !== JSON.stringify(right)) throw new Error(`${path}.${key}: structural value changed`);
      assertParity(left, right, `${path}.${key}`);
    }
    return;
  }
  if (typeof source !== typeof translated) throw new Error(`${path}: primitive type mismatch`);
}

async function publish(item: Awaited<ReturnType<typeof loadItem>>, content: Record<string, unknown>, title: string, summary: string) {
  const sourceRevision = item?.publishedRevision;
  if (!sourceRevision) throw new Error('Missing source revision');
  const source = JSON.parse(sourceRevision.contentJson) as Record<string, unknown>;
  assertParity(source, content, item.slug);
  await db.$transaction(async (tx) => {
    let translation = item.translations[0];
    if (!translation) translation = await tx.contentTranslation.create({ data: { contentItemId: item.id, locale: 'vi', slug: item.slug, title, summary, status: 'NOT_STARTED', ownerId: item.ownerId }, include: { revisions: { select: { version: true } } } });
    const version = Math.max(0, ...translation.revisions.map((r) => r.version)) + 1;
    const now = new Date();
    const revision = await tx.translationRevision.create({ data: { contentTranslationId: translation.id, version, status: 'PUBLISHED', contentJson: JSON.stringify(content), schemaVersion: sourceRevision.schemaVersion, authorId: item.ownerId, reviewerId: item.ownerId, reviewNote: 'Vietnamese Retail Banking translation reviewed for structure and terminology.', submittedAt: now, reviewedAt: now, publishedAt: now } });
    await tx.contentTranslation.update({ where: { id: translation.id }, data: { title, summary, status: 'PUBLISHED', publishedRevisionId: revision.id, sourceUpdatedAt: sourceRevision.updatedAt } });
  });
}

function loadItem(slug: string, type: 'BANKING_JOURNEY' | 'CUSTOMER_SEGMENT') {
  return db.contentItem.findUnique({ where: { type_slug: { type, slug } }, include: { publishedRevision: true, translations: { where: { locale: 'vi' }, include: { revisions: { select: { version: true } } } } } });
}

async function main() {
  for (const [slug, content] of Object.entries(journeyTranslations)) {
    const item = await loadItem(slug, 'BANKING_JOURNEY');
    if (!item) throw new Error(`Missing journey ${slug}`);
    await publish(item, content, String(content.title), String(content.summary));
  }

  const segment = await loadItem('retail-banking', 'CUSTOMER_SEGMENT');
  if (!segment?.publishedRevision) throw new Error('Missing retail-banking segment');
  const segmentContent = JSON.parse(segment.publishedRevision.contentJson) as { vi: { title: string; description: string } } & Record<string, unknown>;
  await publish(segment, segmentContent, segmentContent.vi.title, segmentContent.vi.description);
  console.log('Published Vietnamese Retail Banking segment and 3 linked journeys.');
}

main().finally(() => db.$disconnect());

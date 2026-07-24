-- Safe, idempotent content-access backfill. It never deletes user, payment, or content data.
INSERT INTO "KnowledgeScope" ("id", "code", "type", "nameEn", "nameVi", "descriptionEn", "descriptionVi", "displayOrder", "isActive", "createdAt", "updatedAt") VALUES
  ('scope_customer_onboarding', 'CUSTOMER_ONBOARDING', 'BANKING_DOMAIN', 'Customer Onboarding', 'Tiếp nhận khách hàng', 'Customer Onboarding knowledge scope.', 'Phạm vi kiến thức Tiếp nhận khách hàng.', 1, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('scope_payments', 'PAYMENTS', 'BANKING_DOMAIN', 'Payments', 'Thanh toán', 'Payments knowledge scope.', 'Phạm vi kiến thức Thanh toán.', 2, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('scope_cards', 'CARDS', 'BANKING_DOMAIN', 'Cards', 'Thẻ', 'Cards knowledge scope.', 'Phạm vi kiến thức Thẻ.', 3, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('scope_deposits', 'DEPOSITS', 'BANKING_DOMAIN', 'Deposits', 'Tiền gửi', 'Deposits knowledge scope.', 'Phạm vi kiến thức Tiền gửi.', 4, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('scope_lending', 'LENDING', 'BANKING_DOMAIN', 'Lending', 'Cho vay', 'Lending knowledge scope.', 'Phạm vi kiến thức Cho vay.', 5, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('scope_wealth_investment', 'WEALTH_INVESTMENT', 'BANKING_DOMAIN', 'Wealth and Investment', 'Quản lý tài sản và đầu tư', 'Wealth and Investment knowledge scope.', 'Phạm vi kiến thức Quản lý tài sản và đầu tư.', 6, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('scope_customer_service', 'CUSTOMER_SERVICE', 'BANKING_DOMAIN', 'Customer Service', 'Dịch vụ khách hàng', 'Customer Service knowledge scope.', 'Phạm vi kiến thức Dịch vụ khách hàng.', 7, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('scope_security_access', 'SECURITY_ACCESS', 'BANKING_DOMAIN', 'Security and Access', 'Bảo mật và truy cập', 'Security and Access knowledge scope.', 'Phạm vi kiến thức Bảo mật và truy cập.', 8, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('scope_notification_engagement', 'NOTIFICATION_ENGAGEMENT', 'BANKING_DOMAIN', 'Notification and Engagement', 'Thông báo và tương tác', 'Notification and Engagement knowledge scope.', 'Phạm vi kiến thức Thông báo và tương tác.', 9, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('scope_personal_finance_management', 'PERSONAL_FINANCE_MANAGEMENT', 'BANKING_DOMAIN', 'Personal Finance Management', 'Quản lý tài chính cá nhân', 'Personal Finance Management knowledge scope.', 'Phạm vi kiến thức Quản lý tài chính cá nhân.', 10, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('scope_ba_practice', 'BA_PRACTICE', 'BA_PRACTICE', 'BA Practice', 'Thực hành BA', 'BA Practice knowledge scope.', 'Phạm vi kiến thức Thực hành BA.', 11, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('scope_career_roadmap', 'CAREER_ROADMAP', 'CAREER', 'Career Roadmap', 'Lộ trình nghề nghiệp', 'Career Roadmap knowledge scope.', 'Phạm vi kiến thức Lộ trình nghề nghiệp.', 12, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO UPDATE SET "isActive" = true, "updatedAt" = CURRENT_TIMESTAMP;

UPDATE "ContentItem" AS item
SET "previewJson" = jsonb_build_object(
  'title', revision."contentJson"::jsonb ->> 'title',
  'summary', revision."contentJson"::jsonb ->> 'summary',
  'difficulty', revision."contentJson"::jsonb ->> 'level',
  'estimatedReadingTime', revision."contentJson"::jsonb ->> 'readingTime'
)::text
FROM "ContentRevision" AS revision
WHERE item."publishedRevisionId" = revision."id"
  AND item."previewJson" IS NULL
  AND revision."contentJson" IS NOT NULL;

INSERT INTO "ContentKnowledgeScope" ("id", "contentItemId", "knowledgeScopeId", "relationshipType", "isRequired", "createdAt")
SELECT 'mapping_' || item."id" || '_' || scope."id", item."id", scope."id", 'PRIMARY', true, CURRENT_TIMESTAMP
FROM "ContentItem" AS item
JOIN "KnowledgeScope" AS scope ON scope."code" = CASE
  WHEN item."type" = 'BANKING_JOURNEY' AND item."slug" = 'customer-onboarding' THEN 'CUSTOMER_ONBOARDING'
  WHEN item."type" = 'BANKING_JOURNEY' AND item."slug" = 'payments-and-transfers' THEN 'PAYMENTS'
  WHEN item."type" = 'BANKING_JOURNEY' AND item."slug" = 'cards' THEN 'CARDS'
  WHEN item."type" = 'BANKING_JOURNEY' AND item."slug" = 'deposits' THEN 'DEPOSITS'
  WHEN item."type" = 'BANKING_JOURNEY' AND item."slug" = 'lending' THEN 'LENDING'
  WHEN item."type" = 'BANKING_JOURNEY' AND item."slug" = 'wealth-and-investment' THEN 'WEALTH_INVESTMENT'
  WHEN item."type" = 'BANKING_JOURNEY' AND item."slug" = 'customer-service' THEN 'CUSTOMER_SERVICE'
  WHEN item."type" = 'BANKING_JOURNEY' AND item."slug" = 'security-and-access' THEN 'SECURITY_ACCESS'
  WHEN item."type" = 'BANKING_JOURNEY' AND item."slug" = 'notification-and-engagement' THEN 'NOTIFICATION_ENGAGEMENT'
  WHEN item."type" = 'BANKING_JOURNEY' AND item."slug" = 'personal-finance-management' THEN 'PERSONAL_FINANCE_MANAGEMENT'
  WHEN item."type" = 'BA_PRACTICE' THEN 'BA_PRACTICE'
  WHEN item."type" = 'CAREER_LEVEL' THEN 'CAREER_ROADMAP'
  WHEN item."type" = 'CASE_STUDY' AND item."slug" IN ('understanding-payment-journey', 'payment-limits-business-rules') THEN 'PAYMENTS'
  WHEN item."type" = 'CASE_STUDY' AND item."slug" = 'digital-onboarding-journey' THEN 'CUSTOMER_ONBOARDING'
  WHEN item."type" = 'CASE_STUDY' AND item."slug" IN ('conducting-fit-gap-analysis', 'requirement-notes-to-brd') THEN 'BA_PRACTICE'
END
ON CONFLICT ("contentItemId", "knowledgeScopeId") DO UPDATE SET "relationshipType" = 'PRIMARY', "isRequired" = true;

INSERT INTO "KnowledgePackage" ("id", "code", "nameEn", "nameVi", "descriptionEn", "descriptionVi", "displayOrder", "isActive", "createdAt", "updatedAt") VALUES
  ('package_payment_knowledge', 'PAYMENT_KNOWLEDGE_PACK', 'Payment Knowledge Pack', 'Gói kiến thức thanh toán', 'Payment Knowledge Pack permission template.', 'Mẫu phân quyền Gói kiến thức thanh toán.', 1, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('package_banking_ba_foundation', 'BANKING_BA_FOUNDATION', 'Banking BA Foundation', 'Nền tảng BA ngân hàng', 'Banking BA Foundation permission template.', 'Mẫu phân quyền Nền tảng BA ngân hàng.', 2, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('package_full_knowledge_access', 'FULL_KNOWLEDGE_ACCESS', 'Full Knowledge Access', 'Toàn quyền truy cập kiến thức', 'Full Knowledge Access permission template.', 'Mẫu phân quyền Toàn quyền truy cập kiến thức.', 3, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO UPDATE SET "isActive" = true, "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "KnowledgePackagePermission" ("id", "packageId", "knowledgeScopeId", "permission", "createdAt")
SELECT 'package_permission_' || package."id" || '_' || scope."id", package."id", scope."id", 'VIEW', CURRENT_TIMESTAMP
FROM "KnowledgePackage" AS package
JOIN "KnowledgeScope" AS scope ON (
  (package."code" = 'PAYMENT_KNOWLEDGE_PACK' AND scope."code" = 'PAYMENTS') OR
  (package."code" = 'BANKING_BA_FOUNDATION' AND scope."code" IN ('BA_PRACTICE', 'CAREER_ROADMAP', 'CUSTOMER_ONBOARDING', 'PAYMENTS')) OR
  (package."code" = 'FULL_KNOWLEDGE_ACCESS')
)
ON CONFLICT ("packageId", "knowledgeScopeId", "permission") DO NOTHING;

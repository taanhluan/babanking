import type { ContentType } from "@prisma/client";

const genericReviewContentTypes = new Set<ContentType>([
  "BA_PRACTICE",
  "CASE_STUDY",
  "CAREER_LEVEL",
  "CUSTOMER_SEGMENT",
]);

export function isGenericReviewContentType(
  contentType: ContentType,
): boolean {
  return genericReviewContentTypes.has(contentType);
}

export function assertGenericReviewContentType(contentType: ContentType) {
  if (!isGenericReviewContentType(contentType)) {
    throw new Error("This content type is not handled by the generic review workflow.");
  }
}

export const genericReviewContentTypeList = [...genericReviewContentTypes];
export const reviewQueueContentTypeList: ContentType[] = [
  ...genericReviewContentTypeList,
  "BANKING_JOURNEY",
];

export function isReviewDetailContentType(contentType: ContentType) {
  return contentType === "BANKING_JOURNEY" || isGenericReviewContentType(contentType);
}

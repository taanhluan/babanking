import type { MetadataRoute } from 'next';
export default function robots(): MetadataRoute.Robots {
  const base = process.env.APP_BASE_URL || 'http://localhost:3000';
  return {
    rules: [{ userAgent: '*', allow: ['/en', '/vi', '/en/request-access', '/vi/request-access', '/en/privacy', '/vi/privacy', '/en/terms', '/vi/terms', '/en/membership-terms', '/vi/membership-terms'], disallow: ['/en/admin','/vi/admin','/en/workspace','/vi/workspace','/en/contributor','/vi/contributor','/en/review','/vi/review','/en/search','/vi/search','/en/banking-journeys','/vi/banking-journeys','/en/ba-practice','/vi/ba-practice','/en/case-studies','/vi/case-studies','/en/career-roadmap','/vi/career-roadmap','/en/account','/vi/account','/en/activate','/vi/activate'] }],
    sitemap: `${base}/sitemap.xml`,
  };
}

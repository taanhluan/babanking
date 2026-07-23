import type { MetadataRoute } from 'next';
export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.APP_BASE_URL || 'http://localhost:3000';
  return ['en','vi'].flatMap(locale=>['', '/request-access', '/privacy', '/terms', '/membership-terms'].map((path) => ({ url: `${base}/${locale}${path}`, changeFrequency: path === '' ? 'weekly' as const : 'monthly' as const, alternates:{languages:{en:`${base}/en${path}`,vi:`${base}/vi${path}`}} })));
}

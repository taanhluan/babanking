/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Full Journey JSON drafts can exceed the default 1 MB request limit.
    // Image blocks allow up to 15 MB; base64 overhead (~33%) + JSON envelope requires 30 MB.
    serverActions: { bodySizeLimit: '30mb' },
  },
  turbopack: process.env.CLOUDFLARE_PUBLIC_PREVIEW === '1'
    ? { resolveAlias: { '@/lib/db': './src/lib/db.preview.ts' } }
    : undefined,
};

export default nextConfig;

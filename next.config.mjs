/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Full Journey JSON drafts can exceed the default 1 MB request limit.
    serverActions: { bodySizeLimit: '10mb' },
  },
  turbopack: process.env.CLOUDFLARE_PUBLIC_PREVIEW === '1'
    ? { resolveAlias: { '@/lib/db': './src/lib/db.preview.ts' } }
    : undefined,
};

export default nextConfig;

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  turbopack: process.env.CLOUDFLARE_PUBLIC_PREVIEW === '1'
    ? { resolveAlias: { '@/lib/db': './src/lib/db.preview.ts' } }
    : undefined,
};

export default nextConfig;

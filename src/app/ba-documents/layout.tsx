import { requirePremiumAccess } from '@/lib/membership';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export default async function Layout({ children }: { children: React.ReactNode }) { await requirePremiumAccess('/ba-documents'); return children; }

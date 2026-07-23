import { requirePremiumAccess } from '@/lib/membership';
export const dynamic = 'force-dynamic'; export const revalidate = 0;
export const metadata = { title: 'Member Search | Banking BA Knowledge Hub', robots: { index: false, follow: false } };
export default async function Layout({children}:{children:React.ReactNode}){await requirePremiumAccess('/search');return children}

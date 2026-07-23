import { requireUser } from '@/lib/auth';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false, follow: false } };
export default async function Layout({children}:{children:React.ReactNode}){await requireUser('/account/access');return <><Navbar/><main className="min-h-[70vh] px-4 py-12 sm:px-6"><div className="mx-auto max-w-5xl">{children}</div></main><Footer/></>}

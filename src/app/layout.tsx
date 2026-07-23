import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { getCurrentLocale } from '@/i18n/server';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Banking BA Knowledge Hub | Banking Knowledge and BA Career Direction',
  description:
    'Explore banking domain journeys, practical Business Analyst knowledge, real project case studies, and professional BA career direction.',
  keywords: ['banking BA', 'business analyst', 'banking knowledge', 'case studies'],
  openGraph: {
    title: 'Banking BA Knowledge Hub | Banking Knowledge and BA Career Direction',
    description:
      'Explore banking domain journeys, practical Business Analyst knowledge, real project case studies, and professional BA career direction.',
    type: 'website',
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getCurrentLocale();
  return (
    <html lang={locale} className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}

import { LandingPage } from '@/components/landing/LandingPage';
import type {Metadata} from 'next'; import {getCurrentLocale} from '@/i18n/server';
import { getAccountAccessState } from '@/lib/membership';
import { MemberHome } from '@/components/member/MemberHome';
export async function generateMetadata():Promise<Metadata>{const locale=await getCurrentLocale(),v=locale==='vi';return {title:v?'Banking BA Knowledge Hub | Kiến thức nghiệp vụ ngân hàng dành cho Business Analyst':'Banking BA Knowledge Hub | Banking Knowledge for Business Analysts',description:v?'Khám phá nền tảng thành viên chuyên nghiệp về hành trình ngân hàng, phương pháp BA, case study và định hướng nghề nghiệp.':'Explore a curated professional membership platform for banking journeys, BA practices, case studies, and career direction.',alternates:{languages:{en:'/en',vi:'/vi','x-default':'/en'}},openGraph:{locale:v?'vi_VN':'en_US',alternateLocale:v?['en_US']:['vi_VN']}}}

export default async function Home() {
  const state = await getAccountAccessState();
  return state.hasPremiumAccess && state.user
    ? <MemberHome userId={state.user.id} userName={state.user.name}/>
    : <LandingPage />;
}

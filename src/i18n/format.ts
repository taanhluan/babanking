import type { SupportedLocale } from './config';
export const intlLocale=(locale:SupportedLocale)=>locale==='vi'?'vi-VN':'en-US';
export const formatDate=(date:Date,locale:SupportedLocale)=>new Intl.DateTimeFormat(intlLocale(locale),{dateStyle:'long'}).format(date);
export const formatDateTime=(date:Date,locale:SupportedLocale)=>new Intl.DateTimeFormat(intlLocale(locale),{dateStyle:'medium',timeStyle:'short'}).format(date);
export const formatCurrency=(minorUnits:number,currency:string,locale:SupportedLocale)=>new Intl.NumberFormat(intlLocale(locale),{style:'currency',currency,maximumFractionDigits:currency==='VND'?0:2}).format(minorUnits/100);

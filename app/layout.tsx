import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
export const metadata: Metadata = { title: 'بازار — پاکستان ہول سیل مارکیٹ', description: 'پاکستان کے تصدیق شدہ ہول سیل سپلائرز سے خریداری' };
export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <html lang="ur" dir="rtl"><body>{children}</body></html>;
}

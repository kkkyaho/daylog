import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: { default: 'Daylog · 나의 하루', template: '%s · Daylog' }, description: '일정, 할 일, 루틴, 메모를 한곳에서 관리하는 개인 대시보드', robots: { index: false, follow: false } };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="ko"><body>{children}</body></html>; }

import Link from 'next/link';
export default function NotFound() { return <main className="error-page"><h1>페이지를 찾을 수 없어요.</h1><Link href="/dashboard" className="button primary">대시보드로 이동</Link></main>; }

import Link from 'next/link';
import { Sparkles } from 'lucide-react';
export const dynamic = 'force-dynamic';
export default function AuthLayout({ children }: { children: React.ReactNode }) { return <main className="auth-page"><Link className="brand" href="/"><span className="brand-mark"><Sparkles size={22} /></span>daylog.</Link><div className="auth-card">{children}</div><p className="auth-footnote">나의 하루를 한곳에서.</p></main>; }

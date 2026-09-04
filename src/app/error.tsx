'use client';
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) { return <main className="error-page"><h1>정보를 불러오지 못했어요.</h1><p>연결과 서비스 설정을 확인한 뒤 다시 시도해 주세요.</p><button className="button primary" onClick={reset}>다시 시도</button></main>; }

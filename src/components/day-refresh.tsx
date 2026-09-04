'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { seoulDate } from '@/lib/dates';
export function DayRefresh() {
  const router = useRouter();
  useEffect(function () {
    let date = seoulDate();
    function check() { const next = seoulDate(); if (date !== next) { date = next; router.refresh(); } }
    const interval = window.setInterval(check, 15000);
    window.addEventListener('focus', check);
    return function () { window.clearInterval(interval); window.removeEventListener('focus', check); };
  }, [router]);
  return null;
}

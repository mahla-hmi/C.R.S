'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
// New requests show up on their own: a 30-second timer, plus an instant refresh when the service worker
// receives a "new reservation" push while this tab is open.
export default function AutoRefresh({ seconds = 30 }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => { if (document.visibilityState === 'visible') router.refresh(); }, seconds * 1000);
    const onMsg = (e) => { if (e.data?.type === 'reservation') router.refresh(); };
    navigator.serviceWorker?.addEventListener('message', onMsg);
    return () => { clearInterval(id); navigator.serviceWorker?.removeEventListener('message', onMsg); };
  }, [router, seconds]);
  return null;
}

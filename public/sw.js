// Guest service worker (scope "/"): shows booking notifications (Web Push) and opens "My reservations" when one is tapped.
// The owner panel has its own worker at /admin-sw.js (scope /admin). This one has no fetch handler: it never caches anything.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch { d = { body: event.data ? event.data.text() : '' }; }
  const lang = d.lang === 'en' ? 'en' : 'fa';
  event.waitUntil(self.registration.showNotification(d.title || (lang === 'fa' ? 'رزرو شما' : 'Your booking'), {
    body: d.body || '', icon: '/admin-icon-192.png', badge: '/admin-badge.png', lang, dir: lang === 'fa' ? 'rtl' : 'ltr',
    tag: d.tag || undefined, renotify: !!d.tag, vibrate: [120, 60, 120], data: { url: d.url || `/${lang}/my` },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || '/fa/my', self.location.origin).href;
  event.waitUntil((async () => {
    const open = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of open) {
      if (!c.url.startsWith(self.location.origin + '/admin') && 'focus' in c) { try { await c.navigate(url); } catch {} return c.focus(); }
    }
    return self.clients.openWindow(url);
  })());
});

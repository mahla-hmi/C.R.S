// Owner-panel service worker: shows "new reservation" notifications (Web Push) and opens the panel when one is tapped.
// It has no fetch handler: it never caches or intercepts anything.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch { d = { body: event.data ? event.data.text() : '' }; }
  event.waitUntil((async () => {
    await self.registration.showNotification(d.title || 'درخواست رزرو جدید', {
      body: d.body || '', icon: '/admin-icon-192.png', badge: '/admin-badge.png', lang: 'fa', dir: 'rtl',
      tag: d.tag || undefined, vibrate: [120, 60, 120], data: { url: d.url || '/admin/reservations?view=pending' },
    });
    // a panel that is open right now refreshes at once instead of waiting for its 30-second timer
    const open = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    open.forEach((c) => c.postMessage({ type: 'reservation' }));
  })());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || '/admin', self.location.origin).href;
  event.waitUntil((async () => {
    const open = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of open) {
      if (c.url.startsWith(self.location.origin + '/admin') && 'focus' in c) { try { await c.navigate(url); } catch {} return c.focus(); }
    }
    return self.clients.openWindow(url);
  })());
});

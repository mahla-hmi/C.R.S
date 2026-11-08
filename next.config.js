/** @type {import('next').NextConfig} */
module.exports = {
  poweredByHeader: false,
  serverExternalPackages: ['web-push'], // used by lib/push.js (owner notifications)
  async headers() {
    return [
      // photos: browser keeps them for a day and refreshes in the background for a week (safe even when a file is replaced)
      // service workers must always be re-checked by the browser, otherwise an updated one is not picked up
      { source: '/sw.js', headers: [{ key: 'Cache-Control', value: 'no-cache, max-age=0' }] },
      { source: '/admin-sw.js', headers: [{ key: 'Cache-Control', value: 'no-cache, max-age=0' }] },
      { source: '/images/:path*', headers: [{ key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' }] },
    ];
  },
};

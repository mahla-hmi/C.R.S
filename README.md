# Cafe app — Step 15 (collapsible sidebar, refined wording)

## Run it locally
1. `copy .env.local.example .env.local`   (macOS/Linux: `cp`)
2. `npm install`
3. `npm run db:up`      → MongoDB 7 in Docker (needs Docker Desktop). First start creates the `cafe_app` user.
4. `npm run dev`        → http://localhost:3000  (/fa Persian, /en English)

No Docker? Install MongoDB yourself and set `MONGODB_URI=mongodb://127.0.0.1:27017/cafe` in `.env.local`.
Health check: http://localhost:3000/api/health  (`{"ok":true}` = app can reach MongoDB; also runs pending migrations).

| command | what it does |
|---|---|
| `npm run db:up / db:down` | start / stop the database (data is kept in a Docker volume) |
| `npm run db:logs` | follow MongoDB logs |
| `npm run db:reset` | **wipe** the database and start fresh (re-seeds on next start) |
| `npm run db:backup` | `backups/cafe-<date>.archive.gz` |
| `npm run db:restore -- backups/<file> --yes` | **replaces** current data with the backup |

If the first start failed, or you changed the passwords in `.env.local` after the first start: `npm run db:reset` (users are only created on an empty volume).

## Database
Collections: `reservations`, `tables`, `menu_categories`, `menu_items`, `_migrations`.
- **Migrations** (`lib/db/migrations.js`) run automatically on first connection and are recorded in `_migrations`. They create validators (`$jsonSchema`), indexes and the initial data. Never edit one that already ran: append a new one.
- **Tables and menu now live in the database** (seeded once from `lib/db/seed/*`). Prices are full toman. An item/category with `available:false` / `visible:false` is hidden from guests. If MongoDB is down the menu page falls back to the built-in menu.
- **Double-booking is blocked by MongoDB itself**: unique index `no_overlap` on (date, tableId, 15-min cells) for active reservations.
- The app user can only access its own database (`readWrite` + `dbAdmin` on `cafe`). Port 27017 is bound to 127.0.0.1.

## Skeleton loading
Every page that waits for the backend shows grey, shimmering placeholders shaped like the real content, then fades the content in:
menu (streamed behind `<Suspense>` + route `loading.js`), reserve (start times, floor plan), my bookings (cards), QR sheet.
Skeletons appear only after ~150 ms, so fast responses never flash one. `prefers-reduced-motion` turns the animation off. Components: `components/Skeleton.js`.

## Going to the VPS later (checklist)
- Create the DB user on the server with a long random password; use `mongodb://user:pass@host:27017/cafe?authSource=cafe` (URL-encode special characters).
- Never expose 27017 to the internet: firewall it or keep MongoDB on localhost / a private network; enable `authorization` (the Docker image already does).
- Schedule `mongodump` backups (cron) and copy them off the server. Test a restore once.
- Set `SITE_URL` to the real domain (QR codes) and a real `SMS_PROVIDER`.
- Replace the in-memory rate limiter (`lib/ratelimit.js`) if you run more than one server process.

## Other pieces (unchanged from earlier steps)
Booking rules `lib/booking.js` · "My bookings" `/fa/my` · bottom nav (phones/tablets) · SMS hook `lib/sms.js` (console by default) ·
local photos `public/images` (`lib/images.js`; one stand-in remains: `photo-1495474472287-4d71bcdd2085`).

## Reservation form (step 10)
Two steps: (1) name, email (optional), phone, occasion, guests, seating area, date, arrival time, message → (2) table map + confirm.
- The guest is **not asked how long they stay.** The server estimates it (`PURPOSES` / `stayMinutes` in `lib/booking.js`): normal visit 60 min, groups of 5+ get +30,
  birthday 150, anniversary 90, other 90. A stay never runs past closing time (arriving at 21:30 = 30 min). The client cannot choose or change it.
- Seating area ("Indoor / By the window / Terrace / Anywhere") is a preference: it filters the available times and decides which table is suggested first.
  The best fitting table is pre-selected on the map; the guest can tap another one.
- New reservation fields: `email`, `zonePref`. Old reservations with the removed "quick drink" occasion still display fine.

## Owner panel (step 11) — /admin
Open http://localhost:3000/admin . **Test login: `owner` / `cafe-admin-123`** (placeholder, shown on the login page in development only).
Set `ADMIN_USER`, `ADMIN_PASSWORD` and `ADMIN_SECRET` in `.env.local` to replace it (see `.env.local.example`); the panel shows a yellow warning until you do.
- **Dashboard:** pending requests (need action), today's schedule, counters. Refreshes itself every 30 s.
- **Reservations:** every reservation with filters (all / pending / today / upcoming / confirmed / past / cancelled), search by name, phone or code, pages of 20.
  Actions: pending → *confirm* or *reject*; confirmed → *done*, *no-show* or *cancel*. Rejected/cancelled/done free the table. Each change is stored in `history` (who, when).
  The guest gets an SMS on confirm / reject / cancel (console log until a real SMS provider is added in `lib/sms.js`).
- **Orders:** the site has no online ordering yet (the menu is display-only), so "Orders" is a greyed-out "coming soon" entry.
- **Security:** signed, httpOnly cookie (12 h), checked in the middleware AND again in every admin page and API route; login attempts are rate-limited; state-changing calls
  check the Origin header; `/admin` is `noindex`. In production the cookie is `secure` (needs HTTPS). The admin pages do not use the public site's layout.
- Files: `app/admin/**`, `app/api/admin/**`, `components/admin/**`, `lib/admin/**`, `middleware.js`.

## Team management (step 13) — /admin/team
The owner can add people (employees or other owners) with a username and password and choose what each one may do.
- **Main owner** = the login in `.env.local` (`ADMIN_USER` / `ADMIN_PASSWORD`). It always works (even if the database is down), always has full access and is not editable from the panel.
- **Members** live in the `admins` collection (created by migration `003_admins`). Passwords are stored as salted scrypt hashes, never in plain text.
  Username: 3-32 chars, lowercase latin letters, digits, `.` `_` `-`. Password: at least 8 characters (the form can generate a random one).
- **Roles:** *owner* = everything, including this page. *staff* = only what is ticked:
  `reservations.view` (dashboard + list, read-only) and `reservations.manage` (confirm / reject / cancel / done / no-show; includes view).
  New permissions: add them in `lib/admin/permissions.js` and check them with `can()` in the page AND the API route.
- **Instant effect:** members are re-read from the database on every request, so disabling someone, deleting them or changing their permissions applies at once.
  Resetting a password or disabling an account also ends that person's open sessions.
- **Guard rails:** you cannot demote, disable or delete your own account (no accidental lock-out); usernames are unique (case-insensitive) and the main owner's name is reserved;
  permission checks run on the server for every page and API call (hiding a button is only cosmetic).
- Staff only see menu items they can use; a member without any permission can log in but sees "no access".
- **Phones/tablets:** floating bottom bar (dashboard, reservations, members (owners), site). **Skeletons** on every panel page, including when you change a filter, search or page.

## New-reservation notifications (step 14)
When a guest submits a reservation, the owner (and every active member who may view reservations) gets a **web notification** on their phone/computer,
even when the panel and the browser are closed. Optionally an SMS too.
- **Turn it on:** sign in to /admin, press *فعال‌سازی اعلان* (a banner appears on every page until you do; the dashboard has the full card with a *test notification* button).
  Do it once on each device. Works on Chrome/Edge/Firefox (desktop + Android) and Safari. **iPhone/iPad: add the panel to the Home Screen first** (iOS 16.4+), then enable it from that icon.
  Notifications need HTTPS (or localhost); the VPS must serve the site over HTTPS.
- **How it works:** Web Push with VAPID keys (created automatically on first use and stored in the `settings` collection, or set `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`;
  `npm run push:keys` prints a pair). The service worker is `public/admin-sw.js`; devices are stored in `push_subscriptions` (migration `004_push`). Needs `npm install` (package `web-push`).
- **Who gets it:** decided at send time: the main owner, owner members, and staff with the *view reservations* permission. Disabled/deleted members and members without permission stop receiving at once.
- **Safe by design:** sending runs after the guest's response and can never fail or slow down a booking; dead devices are removed automatically.
- Signing out on purpose also turns notifications off on that device. An open panel refreshes instantly when a notification arrives (otherwise every 30 s).
- **Owner SMS:** set `OWNER_PHONE` in `.env.local`; it goes through the same SMS hook as guest SMS (console log until a real provider is added in `lib/sms.js`).
- Set `PUSH_CONTACT` to a real `mailto:` or https address before going public (push services such as Apple's require a valid one).

## Collapsible sidebar (step 15)
`components/admin/AdminShell.js` is the frame of the owner panel.
- **Phones and tablets (< 900 px):** the menu button (top right) opens the sidebar as a drawer with a dimmed backdrop. It closes with the backdrop, the ✕ button, the Esc key, or by choosing a page.
  The floating bottom bar is still there for quick switching.
- **Desktop:** the same button collapses the sidebar to a narrow icon rail (hover shows the name) and expands it again; the choice is remembered on this device.
- Menu items shown depend on the person's permissions (see team management).

## Wording (step 15)
All visible Persian text uses a refined, formal register. The no-show action/status is labelled **«کنسلی»** (owner's choice): `lib/admin/labels.js`, `components/admin/StatusActions.js`, `lib/admin/permissions.js`.
`npm run check:wording` scans the site's texts for informal words (list and suggested replacements in `scripts/check-wording.mjs`) and exits with an error if it finds any; add new words to `RULES` as you notice them.

## Public page polish (step 17)
- The footer shows only the café name (the "© 2026 · made with ♥ …" line was removed).
- The gallery has 6 photos, so the grid is complete on phones (2 columns) and desktop (4 columns). To change one, edit `gal` in `app/[locale]/page.js`.
- The reservation step cards ("in two steps…") are centred in the page (`.steps` in `app/globals.css`), whatever their number.

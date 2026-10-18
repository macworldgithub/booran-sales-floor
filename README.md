# Booran Sales Floor

Next.js 16 frontend for the sales floor, inventory, appointments, and location management.

## Local development

Use Node.js 22. Run `npm ci`, copy `.env.example` to `.env.local`, then run `npm run dev`. Start the backend separately on port 5001.

`API_URL` is a **server-only** variable pointing to the backend, including `/api`. The browser always uses the same-origin `/api` proxy; the old `NEXT_PUBLIC_API_URL` setting is no longer used. Never put MongoDB credentials in this frontend project.

## Authentication and location access

The dashboard mounts only after the server verifies an HttpOnly session cookie. The backend enforces the role and site on lists, individual records, searches, aggregates, and writes.

- `devs@omnisuiteai.com`: super admin, all locations.
- `southmorang@booran.com`: manager, South Morang location group (including its BYD, Chery, Hyundai, and Kia dealerships).

There is no client-side role switch or offline login fallback. Global DMS feed logs are available only to the super admin. Password provisioning is described in the backend README. Passwords are never stored in this repository.

## Vercel deployment

Deploy the two directories as separate Vercel projects. Deploy the backend first, then this frontend.

1. Frontend root directory: `booran-sales-floor`; framework: Next.js; Node.js 22.
2. Set `API_URL` to the deployed backend URL ending in `/api` for the appropriate Preview and Production environments.
3. Run `npm run typecheck`, `npm test`, and `npm run build` before deployment. `vercel.json` uses `npm ci --include=dev` and the normal Next.js build. Tailwind, PostCSS, Autoprefixer, and TypeScript are required during the build, even when `NODE_ENV=production` or npm is configured to omit development dependencies. If your Vercel project overrides the install command, use `npm ci --include=dev` there too. After changing the install command, redeploy without the existing build cache.
4. Verify both accounts over HTTPS: unauthenticated API calls return 401, site users cannot read another location by ID or filter, and signing out revokes the session.

The API proxy uses the App Router Node.js runtime and a 30-second maximum duration. See [Vercel function duration configuration](https://vercel.com/docs/functions/configuring-functions/duration).

## Responsive interface and data lists

Layouts use dynamic viewport height and device safe areas. Compact layouts use record cards, large layouts use scrollable tables, and the mobile navigation stays clear of install/status notices. Dialogs support keyboard focus containment, Escape, and focus restoration. Browser zoom remains enabled.

Leads, inventory, actions, appointments, and feed logs use server pagination, bounded page sizes, request cancellation, and visible error/retry controls. Search and filter changes reset the page; deleted/resolved final-page records move back to a valid page. Staff and locations paginate their complete filtered directory data locally. Appointment date/type controls query the selected day. Real counts replace demonstration totals.

## PWA

The app has a stable manifest identity, standalone display, home-screen shortcuts, existing 192/512 icons, platform-aware installation guidance, offline status, and an explicit update action. Shortcuts select the correct app tab and browser back/forward restores tabs.

The production-only service worker caches a standalone offline document and public immutable assets. It never caches customer API responses, authenticated HTML, or React server responses, and it removes the old API/page caches during activation. Offline writes are not queued: reconnect to load or save customer information. Updates wait for the user so an open form is not silently replaced. Bump the cache version in `public/sw.js` when changing the offline shell.

## Validation

`npm test` checks that the service worker excludes customer requests and resolves offline navigation to an actual cached response. The backend has separate tests for pagination, password hashing, and location boundaries. HTTP smoke checks cover login, HttpOnly cookies, unauthenticated access, cross-location reads/filter tampering, cross-origin writes, and session revocation.

Phone/tablet visual review and installation on actual iOS/Android devices should be performed against the HTTPS deployment; no browser was connected to the implementation session.

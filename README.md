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

Customer360 includes SMS messaging, reusable photo/video links and paginated Booran Sales Floor history. Every send records its verified staff identity, recipient and delivery state. Add number / Edit number controls let staff update a lead's mobile number. Uploads support five files per SMS, up to 100 MB each, using 2 MB requests. Files use local backend disk on a normal server and the existing backend database on Vercel. Provider credentials and storage settings stay on the backend.

SMS history contains only Booran Sales Floor messages. Phone edits update the SMS recipient immediately after saving. Delivery statuses refresh automatically. Public photo/video links open a Booran viewer with photo display, video playback and downloads.

Capital Radar is under Group Management in the desktop sidebar and mobile More menu. The mobile bottom navigation provides Today, Leads, Stock and Showroom.

Layouts use dynamic viewport height and device safe areas. Compact layouts use record cards, large layouts use scrollable tables, and the mobile navigation stays clear of install/status notices. Dialogs support keyboard focus containment, Escape, and focus restoration. Browser zoom remains enabled.

Leads, inventory, actions, appointments, and feed logs use server pagination, bounded page sizes, request cancellation, and visible error/retry controls. Search and filter changes reset the page; deleted/resolved final-page records move back to a valid page. Staff and locations paginate their complete filtered directory data locally. Appointment date/type controls query the selected day. Real counts replace demonstration totals.

## PWA

The app has a stable manifest identity, standalone display, home-screen shortcuts, existing 192/512 icons, platform-aware installation guidance, offline status, and an explicit update action. Shortcuts select the correct app tab and browser back/forward restores tabs.

PWA icons, maskable Android icons, the Apple touch icon, favicons, and the Apple splash use the exact Booran Motors logo artwork on black. Re-export these assets with `node scripts/generate-brand-icons.cjs` after changing `public/images/booran-motors-logo.png`. The manifest and page metadata use brand-specific asset URLs, and the service-worker cache version changes when replacing cached icons.

The production-only service worker caches a standalone offline document and public immutable assets. It never caches customer API responses, authenticated HTML, or React server responses, and it removes the old API/page caches during activation. Offline writes are not queued: reconnect to load or save customer information. Updates wait for the user so an open form is not silently replaced. Bump the cache version in `public/sw.js` when changing the offline shell.

## Validation

`npm test` checks that the service worker excludes customer requests and resolves offline navigation to an actual cached response. The backend has separate tests for pagination, password hashing, and location boundaries. HTTP smoke checks cover login, HttpOnly cookies, unauthenticated access, cross-location reads/filter tampering, cross-origin writes, and session revocation.

Phone/tablet visual review and installation on actual iOS/Android devices should be performed against the HTTPS deployment; no browser was connected to the implementation session.

## Filter regression checks

The active dealership is shared by the sidebar and list controls and applies to dashboard totals, leads, inventory, actions, staff, appointments, search, and the locations directory. Status/category/aging/search filters combine with that dealership instead of replacing it. List totals and pagination use the same filtered query as the records; changing a filter resets the page and hides previous results/counts until the new response arrives. Sort controls contain sort fields only.

Dealership options and the dashboard network card use the authorised location directory. South Morang accounts see the South Morang dealerships, without sample group-wide location cards or fabricated notifications. Appointment forms record a specific authorised dealership so later location filters can find them.

Frontend filter-control tests exercise the actual event handlers and outgoing query parameters. Backend fixtures cover combined predicates, exact dealership matching, South Morang boundaries, and matching result/count scopes. Live database checks during this change were blocked by DNS timeouts; device/browser interaction testing was unavailable in the session.

## Runtime regression checks

Session verification cannot overwrite a newer sign-in; stale requests cannot sign out a newer session. Open dashboards recheck sessions on visibility changes, reconnection, and every minute, and authentication changes propagate between tabs. Failed directory loads expose a retry action. Mutation failures appear as errors, and unsupported response failures do not trigger success refreshes.

Runtime tests cover those session races, failed API responses, encoded record IDs, calendar date validation, CSS theme variables, and service-worker updates following a first installation in the same tab. Backend HTTP integration tests separately verify write validation, consistent lead responses, access boundaries, and safe vehicle holds.

The second audit adds protection against delayed dialog updates and stale search results, clears protected UI state immediately when account permissions change, and uses actual vehicle status in stock badges. Search includes inventory actions and opens their matching status/filter. Booking forms exclude location groups and reject local times skipped by daylight saving. Failed PWA cache writes no longer prevent valid network assets from loading.

Lists, search, the dashboard, and directories refresh after reconnection or returning to the visible app. Mutation refreshes immediately hide the previous result set, and the dashboard advances its appointment day when midnight passes. A PWA update accepted in another tab offers a reload action instead of discarding the current tab's open form; installations already in progress are also detected. Invalid upstream configuration produces a controlled 503 response.

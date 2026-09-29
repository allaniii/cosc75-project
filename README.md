# CentriTruck — Owens Trucking Services

A multi-page fleet management application built with **HTML, CSS, vanilla JavaScript, Vite, and Supabase**. The source contains **15 editable HTML pages, 15 optional PHP entry points, 25 original reference screenshots**, PostgreSQL migrations, Edge Functions, tests, and an editing guide.

## Start here

1. Extract the ZIP and open the `CentriTruck` folder in VS Code.
2. Open **Terminal → New Terminal** inside that folder.
3. Install Node.js **22.12 or newer** (Node 24 is also supported).
4. Run:

```sh
npm ci
```

5. Copy `.env.example` to `.env.local`. On Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
```

On macOS/Linux:

```sh
cp .env.example .env.local
```

6. Follow the Supabase setup below. Put your project URL and **publishable key** in `.env.local`:

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_YOUR_KEY
VITE_APP_BASE=
```

7. Start the frontend:

```sh
npm run dev
```

Open **http://localhost:5173/login.html**. Use the first administrator account you create below. There are no built-in passwords and no fake operational data. Opening an HTML file by double-clicking is not supported: the source uses ES modules and npm packages, which Vite serves/builds.

## Supabase setup

Use a **fresh development project** for the initial installation. The migrations create the application tables; they are not a merge script for an unrelated existing database. No hosted database was changed while preparing this source package.

### 1. Install the database

Choose either route:

**SQL Editor:** open your Supabase project's SQL Editor and run the following files, once each, in order:

1. `supabase/migrations/20260926131026_centritruck_core.sql`
2. `supabase/migrations/20260926132126_centritruck_storage_realtime.sql`

The first creates tables, constraints, indexes, roles/ownership policies, and checked transactional functions. The second configures the private image bucket, image read policy, and Realtime publication. Supabase already supplies the `auth` and `storage` schemas and the `supabase_realtime` publication.

**CLI:** the CLI is pinned in `package.json` and installed by `npm ci`:

```sh
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push --dry-run
npx supabase db push
```

Review the dry run and use the intended development project. A project ref is the identifier in your Supabase URL, not the entire URL. Do not run both installation methods against the same fresh schema. If you install through SQL Editor, track that manual setup before adopting CLI migrations later.

### 2. Configure authentication

In Supabase Authentication settings:

- Disable public sign-ups. Driver accounts are provisioned by an administrator.
- Set Site URL to your frontend origin (for local development, `http://localhost:5173`).
- Add recovery redirect URLs for the URLs you actually use, for example `http://localhost:5173/reset-password.html`, `http://localhost:4173/reset-password.html`, and the production HTTPS equivalent. Add `127.0.0.1` versions if you use that hostname instead of `localhost`.
- Configure your email/SMTP delivery for password recovery. Test actual email delivery before sharing the app.

Create the first identity using **Authentication → Users → Add user** with an email and a strong password. Confirm the email through the trusted dashboard workflow. Copy its UUID. Open `scripts/first-admin.sql`, replace the UUID and name, and run it in SQL Editor. This links the existing Auth user to a trusted administrator profile. It does not overwrite an existing profile or promote public self-registration.

Sign in, then create driver accounts in **Settings → Driver Accounts**. The driver creation function creates an Auth account and transactionally inserts the application profile/license record. If profile provisioning fails, it attempts to delete the new unlinked Auth account. The UI reports a cleanup failure explicitly if that compensation fails. Account creation and the Auth service cannot share one PostgreSQL transaction.

### 3. Deploy the Edge Functions

Three functions are supplied:

| Function | Purpose |
| --- | --- |
| `driver-admin` | Validate an active administrator and provision a driver account. |
| `maintenance-photo` | Validate a driver and the size/signature/type of an uploaded image; save it privately. |
| `route` | Validate an administrator and proxy OpenRouteService geocoding/routing without exposing its secret key. |

Copy `supabase/functions/.env.example` to `supabase/functions/.env.local`. Set `ALLOWED_ORIGINS` to comma-separated exact frontend origins. Set `ORS_API_KEY` for embedded routing. Supabase normally injects its own project URL and key maps. If those maps are unavailable, set the documented `CENTRITRUCK_PUBLISHABLE_KEY` and server-only `CENTRITRUCK_SECRET_KEY` aliases.

```sh
npx supabase secrets set --env-file supabase/functions/.env.local
npx supabase functions deploy driver-admin
npx supabase functions deploy maintenance-photo
npx supabase functions deploy route
```

`config.toml` sets gateway `verify_jwt = false` for modern key compatibility. **This does not make the handlers anonymous:** every handler validates the Bearer access token with `auth.getUser()` and checks the active database role before accessing a secret key or privileged operation. Do not remove those checks. Both hosted injected key maps and legacy injected names are supported, with current publishable/secret keys preferred.

Never place `sb_secret_...`, a service-role key, a database password, or `ORS_API_KEY` in any `VITE_` variable. Vite embeds `VITE_` values in public browser files.

### 4. Storage and Realtime

The second migration creates the **private** `maintenance-images` bucket (5 MB limit, JPEG/PNG/WebP). Browser clients cannot upload, replace, or delete bucket objects directly. The photo Edge Function checks the session, role, file signature/MIME and size, then saves a unique object under the driver's UUID. The browser also decodes and validates the image before upload. Authorized viewers request a 60-second signed URL. Operational images are not stored in the source ZIP.

The same migration adds the operational tables to `supabase_realtime`. The UI subscribes with the logged-in user's session and existing RLS policies. It refetches after subscription/reconnection and when returning to the tab. A failed connection is labeled **Disconnected · retrying**, not “Live.” Use the refresh icon for manual reconciliation. Verify live behavior using separate administrator and driver browser sessions after deployment.

### 5. Routing

Create an OpenRouteService API key using the provider's dashboard and set it only as the Edge Function secret `ORS_API_KEY`. See https://openrouteservice.org/dev/ and https://openrouteservice.org/restrictions/ for current account requirements and request limits; this package does not assume a particular plan or price.

Leaflet renders OpenStreetMap tiles. OpenRouteService provides Philippine-address geocoding and the road route (`driving-hgv`), distance, and estimated duration. Choose matching address results before drawing a route, or provide exact coordinates in the dispatch form. Provider failure does not block dispatch records; the map displays the error and provides an external directions link. Estimates contain no fabricated traffic or live GPS. Truck dimensions/weight restrictions are not individually modeled, so the result is planning assistance, not vehicle-specific route clearance. Respect OpenStreetMap tile usage policy when choosing production traffic/caching arrangements.

## HTML and PHP: which files should I edit?

Edit **the HTML files** for page structure/text, **CSS** for styling, and **the matching JavaScript page controller** for behavior.

For example:

- `admin/trucks.html` — truck heading, filters, table headings, and form fields.
- `assets/js/pages/admin/trucks.js` — what the Trucks page loads and what its buttons do.
- `assets/js/services/trucks.js` — calls to Supabase operations.
- `assets/css/` — shared appearance.
- `supabase/migrations/` — authoritative permissions and business rules.

The `.php` files are optional compatibility entry points. They **do not implement a second backend, MySQL, PHP sessions, or Laravel**. Supabase remains authoritative. Root/source `.php` files redirect to their built counterparts in `dist/`. The production `.php` files serve their fixed, same-directory built HTML file; there is no user-controlled include path. Links use the canonical HTML pages.

For PHP hosting/XAMPP, first run `npm run build`, then serve **the contents of `dist/`** as the website root or a configured subfolder. If PHP is installed locally:

```sh
php -S localhost:8080 -t dist
```

Open `/login.php` or `/login.html`. Add the matching origin/recovery URL to Supabase settings. Do not open `file://` URLs. The PHP wrappers were inspected but not executed in the delivery environment because PHP is not installed there.

If your school requires substantive PHP backend logic rather than PHP page entry points, that is a different architecture requirement; these wrappers do not claim to satisfy it.

## Development, build, and deployment

```sh
npm run dev       # local source server
npm run build     # all 15 HTML entries + 15 production PHP entry points
npm run preview   # preview dist/ on http://localhost:4173
npm test          # calculations, date boundaries, report filters, CSV safety
npm run test:db   # local PostgreSQL/RLS/workflow tests in PGlite
```

For browser tests:

```sh
npx playwright install chromium
npm run test:browser
```

Browser tests build to `test-results/browser-build/`, use disposable data, and save screenshots under `test-results/screenshots/`. They never call your real Supabase project. The mock Auth/REST transport exists only in `tests/browser.mjs`; the application itself has no demo-data fallback.

Deploy `dist/` to an HTTPS static host, or a PHP-capable HTTPS host if using `.php` entry points. Build again after changing environment values. Every page is a real HTML build input; no SPA catch-all rewrite is required. `VITE_APP_BASE` can be left blank to infer the current installation prefix, or set to a prefix such as `/centritruck/`. Use matching Auth recovery URLs and allowed origins. Deploying the frontend does not deploy the database or Edge Functions.

Only publish `dist/`, not `.env.local`, the whole source tree, or test fixtures. The included prebuilt `dist/` is intentionally built without credentials and displays setup guidance. Rebuild with your own public values before deployment.

## Operational rules and limitations

See `docs/BUSINESS_RULES.md` for complete definitions of statuses, intervals, coding, locks, attendance attribution, and reports. In particular:

- Dispatch intervals are half-open `[start,end)`; touching intervals may share a resource.
- Overdue unfinished dispatches remain blocking. On-the-way / failed-delivery trips are conservatively treated as occupied until resolved.
- High/urgent unresolved issue reports immediately lock a truck. Canceling a service job does not resolve its report. Completing one job cannot release another active lock.
- Coding is **configurable**. No active legal policy is assumed. Optional examples in `scripts/seed-example-rules.sql` are disabled.
- A driver can have multiple completed shifts per Manila date but only one active shift. Server timestamps are authoritative, including overnight shifts.
- Referenced trucks cannot be deleted. Archive only after resolving active work; history remains.

This package is not asserted to be production-ready. `docs/VERIFICATION.md` distinguishes executed checks from the hosted integration/concurrency checks still needed. No live project, SMTP, routing account, or operational credentials were supplied.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Setup-required message | Copy `.env.example`, enter public values, restart Vite or rebuild. |
| Correct login but no portal | The Auth UUID needs an active row in `profiles`; roles come from the database. |
| Table/permission error | Both migrations must have run in order; check grants and RLS. Do not disable RLS. |
| Edge Function error | Deploy all three functions, configure secrets/origins, and check Supabase function logs. |
| Driver photo rejected | JPEG/PNG/WebP, <=5 MB, valid content, active driver, deployed photo function. |
| Realtime disconnected | Confirm publication, WebSocket access, project availability, and authenticated session. |
| Cannot delete truck | It has references. Resolve active work, then archive instead. |
| Cannot depart | Eligibility is rechecked against actual departure time; review coding, service locks, unfinished trips, and driver license. |
| Email recovery link missing | Check SMTP delivery, redirect allowlist, spam, and provider limits. |
| Map cannot show route | Configure ORS key/function; correct addresses/coordinates; check quota. |
| PHP route fails | Serve built `dist/` with PHP, not source files with unresolved npm imports. |

No earlier PHP/MySQL source or live database was supplied, so this is a fresh implementation. Existing MySQL records/password hashes were not migrated. A future migration should preserve source backups, map statuses and Manila timestamps explicitly, and use Auth invitations/password resets rather than assuming hash compatibility.

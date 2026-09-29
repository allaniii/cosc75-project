# Where to edit CentriTruck

**The frontend is in the `.html` files and `assets/` folder.** You do not need to edit SQL to change a heading or button color. You do need to change the database when introducing a new stored field or a new business rule.

For the Trucks screen, open `admin/trucks.html` first. You will see the actual heading, filter fields, table headers, and the Add/Edit dialog. Then open `assets/js/pages/admin/trucks.js` to see the record loading and button handlers. There is no React component or hidden one-file screen renderer.

## Every page and its matching controller

All controllers below are under `assets/js/pages/`. All pages use `assets/css/app.css`, which imports the smaller stylesheets described below.

| HTML file | Controller | What you edit here |
| --- | --- | --- |
| `index.html` | `index.js` | Entry/loading screen; routes a signed-in user to the appropriate portal. |
| `login.html` | `login.js` | Sign-in form, login text, email/password submission. |
| `reset-password.html` | `reset-password.js` | Recovery email form and new-password form. |
| `admin/dashboard.html` | `admin/dashboard.js` | KPIs, weekly line chart, recent dispatch, attendance/delivery/report monitoring. |
| `admin/trucks.html` | `admin/trucks.js` | Fleet table, search/filters, truck dialog, assignment, view/delete/archive actions. |
| `admin/dispatch.html` | `admin/dispatch.js` | Schedule/history tables, route panel, dispatch form, eligibility preview/cancellation. |
| `admin/maintenance.html` | `admin/maintenance.js` | Four tabs, work schedules, report reviews, linked repair dialog, photos and alerts. |
| `admin/attendance.html` | `admin/attendance.js` | All-driver attendance table, date/driver filters, count cards. |
| `admin/reports.html` | `admin/reports.js` | Report filter form, charts/tables, CSV and print actions. |
| `admin/settings.html` | `admin/settings.js` | Profile/company forms, driver creation/activation, coding areas/rules. |
| `driver/dashboard.html` | `driver/dashboard.js` | Driver identity, current trip, coding, attendance controls and weekly report. |
| `driver/attendance.html` | `driver/attendance.js` | Time-in/out buttons and own shift history. |
| `driver/my-truck.html` | `driver/my-truck.js` | Regular assigned truck, coding, details, temporary dispatch vehicles. |
| `driver/delivery-status.html` | `driver/delivery-status.js` | Current delivery, status choice/confirmation, event timeline. |
| `driver/maintenance.html` | `driver/maintenance.js` | Issue form, photo selection, owner contact, own report history. |

Each HTML file also has a same-named `.php` entry point. Source PHP redirects to the built version. `npm run build` generates production PHP wrappers that serve the neighboring built HTML. Edit the HTML/controller rather than copying the page into PHP. The wrappers have no independent database, login, or UI.

## CSS files, one by one

| File under `assets/css/` | Responsibility |
| --- | --- |
| `app.css` | Imports all stylesheets in the intended order. Each page links this one file. |
| `tokens.css` | Theme values: gold, ink, muted text, backgrounds, borders, sidebar width, radius and gaps. Start here for a global theme adjustment. |
| `base.css` | Font defaults, headings, input styles, labels, focus outlines and basic semantic elements. |
| `layout.css` | Sidebar/header/main placement, grids, login columns, chart/map sizes and notification panel. |
| `components.css` | Cards, buttons, badges, tables, tabs, dialogs, forms, empty states, timeline, and feedback messages. |
| `responsive.css` | Mobile layouts/navigation, smaller-screen breakpoints and print styling. |

For example, change `--gold` in `tokens.css` to adjust the shared gold accent. Change `.page-header` or `.main` in `layout.css` to adjust page spacing. Change `.button` in `components.css` to adjust buttons everywhere. Avoid copying slightly different styles into every page.

## Change the entry/sign-in image

`index.html` has no image: it checks the session and routes the visitor. The large
truck picture on the sign-in screen belongs to `login.html`, in the `.login-art`
section. Its image is set in `assets/css/layout.css`, not in `index.html`.

To use your own photo:

1. Put the image in `assets/images/`, for example `login-hero.jpg`.
2. Find `.login-art` in `assets/css/layout.css` and change these properties:

   ```css
   background-image: url("../images/login-hero.jpg");
   background-position: center;
   background-size: cover;
   ```

   The path is relative to the CSS file. Use your actual filename and extension.
   `cover` fills the panel without stretching; it may crop the photo's edges.
   Adjust `background-position` if the truck is off-center.

3. Update the `.login-art` section's `aria-label` in `login.html` if the new image
   changes what the panel communicates.
4. Preview `login.html` using `npm run dev`. The artwork is intentionally hidden
   at widths of 760px or less by `assets/css/responsive.css`.
5. Run `npm run build` for deployment or XAMPP, then serve the rebuilt `dist/`.
   Do not edit generated files in `dist/` directly.

The current `login-reference.png` is a full screenshot, including its logo and
text. Its `left top` position and `200% 120%` size frame the left half and crop
out the original text at the bottom.
Keep those values when using the existing screenshot; switch to the values above
for a standalone photo. Replacing it also removes the logo baked into that
screenshot. The bottom-left heading and description are now real HTML in
`login.html` inside `.login-art-copy`, so they remain when you change the image.
Edit that HTML to change the wording; its spacing and dark readability gradient
are in `assets/css/layout.css`. Keep the originals in `reference-screenshots/`
unchanged.

## Shared JavaScript, one by one

| File | What it does |
| --- | --- |
| `assets/js/config/supabase.js` | Reads public Vite environment settings, creates the official client, determines the installation URL prefix, and reports missing setup. Never put a secret key here. |
| `assets/js/components/shell.js` | Builds shared sidebar/header, guards the role, sets up refresh, renders notifications, and reads common fleet data. Navigation labels/order are here. |
| `assets/js/components/data.js` | Reusable safe record rendering and relationships: driver names, plate badges, attendance rows, truck/delivery details. |
| `assets/js/components/chart.js` | Creates/destroys Chart.js charts with the common gold/black visual treatment. |
| `assets/js/components/driver.js` | Shared driver data loading, attendance buttons, and authoritative coding display. |
| `assets/js/utils/dom.js` | Safe element creation, table cells, dialog open/close, form binding, feedback, options, downloads, and tabs. Record text is inserted as text, not executable HTML. |
| `assets/js/utils/format.js` | Manila date/time formatting, durations, labels, maintenance due dates, truck-state display and CSV escaping. |

## Service modules, one by one

Services keep database calls out of layout code. Page controllers import these functions when the user takes an action.

| File under `assets/js/services/` | Responsibility |
| --- | --- |
| `api.js` | Error handling, paginated record reads, snapshots, and idempotent `perform_action` calls. |
| `auth.js` | Sign-in/out, verified profile lookup, portal guard/routing, recovery email, password update. |
| `trucks.js` | Save, delete, and archive RPC actions. |
| `dispatch.js` | Save/cancel dispatch, eligibility preview, confirmed delivery update. |
| `coding.js` | Coding-rule/area writes and authoritative coding checks. |
| `attendance.js` | Time-in and time-out RPC actions. |
| `maintenance.js` | Work/review/report actions, browser image validation, photo Edge Function call, signed image URL. |
| `notifications.js` | Recipient notification list/read-state and Realtime subscription lifecycle. |
| `reports.js` | Filters stored records and computes the totals shared by charts, tables and CSV export. |
| `maps.js` | Leaflet map, address-candidate selection, route Edge Function call, real distance/ETA rendering and directions fallback. |

## Backend and configuration files

| File | Responsibility |
| --- | --- |
| `supabase/migrations/20260926131026_centritruck_core.sql` | Creates the relational model, uniqueness/FK constraints, indexes, RLS policies, role helpers, coding/eligibility logic, atomic mutations, event/notification writes and provisioning RPC. |
| `supabase/migrations/20260926132126_centritruck_storage_realtime.sql` | Private bucket and image read policy; enables the required Realtime tables. |
| `supabase/functions/_shared/auth.ts` | Shared CORS responses, verified identity/active-role checks and server-only admin client. |
| `supabase/functions/driver-admin/index.ts` | Admin-only creation of an Auth user and linked driver; compensating cleanup on provisioning failure. |
| `supabase/functions/maintenance-photo/index.ts` | Driver-only image content/signature/type/size validation and private upload. |
| `supabase/functions/route/index.ts` | Authenticated administrator access to ORS geocoding and HGV directions. |
| `supabase/config.toml` | Local Supabase ports/auth and Edge Function settings. Hosted redirect/origin settings still need configuration. |
| `supabase/functions/.env.example` | Server-secret/origin placeholders; copy locally and keep the real values private. |
| `.env.example` | Browser-safe configuration placeholders; copy to `.env.local`. |
| `package.json` | Exact dependencies and npm commands. |
| `package-lock.json` | Resolved dependency versions/integrity, used by `npm ci`. Do not manually edit. |
| `vite.config.js` | Lists every HTML production entry point; relative build assets support nested pages. |
| `.gitignore` | Keeps secrets, dependencies, output, and test scratch data out of version control. |
| `scripts/php-pages.mjs` | Generates fixed-file production PHP wrappers after Vite builds. |
| `scripts/first-admin.sql` | Trusted first administrator setup, with a UUID placeholder to replace. |
| `scripts/seed-example-rules.sql` | Optional, explicitly disabled example coding rules. |

Once a migration has been applied to a real database, add a **new migration** for future changes; do not silently edit the deployed migration's history. Create its name using `npx supabase migration new descriptive_name`, then verify it in a development project.

## Tests, screenshots, and documentation

- `tests/format.test.mjs`: date, overnight duration, CSV, status and report calculations.
- `tests/database.mjs`: executes real migration SQL in a disposable PGlite PostgreSQL engine and checks permissions/workflows; Storage/Auth tables are compatible test stubs.
- `tests/browser.mjs`: builds all real pages, runs Chromium against a disposable dataset and real local RPC SQL with fixture Auth/HTTP, captures screenshots, and checks navigation/forms/mobile layout.
- `reference-screenshots/`: all 25 original supplied images, preserved byte-for-byte and numbered so duplicate filenames remain distinct.
- `docs/screenshots/`: browser captures from explicit test fixtures; these are evidence of the implementation, not operational records.
- `assets/images/login-reference.png`: a copy of the supplied login screenshot used to frame the photographic left panel via CSS. Replace it with a clean original hero image when available.
- `docs/MASTER_PROMPT.md`: the supplied specification, unchanged.
- `docs/ARCHITECTURE.md`: explains the layers and trust boundaries.
- `docs/BUSINESS_RULES.md`: status transitions, coding/intervals, maintenance locks and metric definitions.
- `docs/VERIFICATION.md`: executed checks, limitations and remaining hosted checks.
- `docs/REFERENCE_INVENTORY.md`: identifies every supplied screenshot and corresponding page.
- `docs/FILE_MANIFEST.txt`: inventory of deliverable source/reference files.
- `docs/DEPENDENCIES.md`: dependency purpose and official integration documentation consulted.

`dist/` is generated output. Do not use it as your editing source; rebuilding overwrites it. `node_modules/` is downloaded dependencies and is intentionally absent from the ZIP. `test-results/` is temporary output created when you run tests; selected evidence is copied into `docs/` in this delivery.

## Three common changes

**Change a heading:** open its HTML page, locate the `<h1>`, change the text, and save. Vite reloads the page during development.

**Change a button's behavior:** find the button's `id` in HTML. Search for that ID in the corresponding controller. The handler calls a service, then refreshes the data. Preserve form validation and error handling.

**Add a stored truck field:** add a new database migration for the column/constraint; accept and validate it in the authorized `truck_save` action; add the field to `admin/trucks.html`; include it when filling/rendering the truck details; update relevant tests. Merely adding an HTML input does not store anything in PostgreSQL.

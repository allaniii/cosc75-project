# Architecture

## Request flow

1. Vite serves or builds a real HTML document for the requested URL.
2. That document loads plain shared CSS and its focused JavaScript controller.
3. The shared shell verifies the Supabase Auth identity, reads its trusted profile, and chooses the allowed portal/navigation.
4. Page controllers read via service modules. Supabase's Data API applies table grants and RLS.
5. Multi-record writes call `perform_action`. A private database function validates the caller and action, acquires a transaction lock, checks rules, changes records and writes events/notifications atomically.
6. Realtime informs authorized clients that committed records changed. Clients refetch authoritative data without rebuilding form markup.

Supabase Auth owns passwords/session issuance. PostgreSQL owns operational records and permissions. Storage owns private image objects. Edge Functions perform account administration, checked image uploads, and server-secret routing calls. Node/npm are frontend build tools; no separate always-running Node backend is needed in production.

## Boundaries

| Layer | Files | Trust |
| --- | --- | --- |
| Structure | 15 separate `.html` pages | User interface only |
| Appearance | `assets/css/` | No permissions |
| Controllers | `assets/js/pages/` | User input and rendering |
| Shared UI | `assets/js/components/` | Navigation, tables, charts, state |
| Services | `assets/js/services/` | API transport; no privileged keys |
| Auth | Supabase Auth + `profiles` | Identity + protected role |
| Database | `supabase/migrations/` | Final rules, RLS, transactions, history |
| Server integrations | `supabase/functions/` | Verified caller, protected secrets |
| PHP compatibility | `.php` wrappers | Fixed-file serving only |

The frontend has no framework and no monolithic page switcher. Page-specific headings, forms, sections and table headers live in HTML. DOM helpers safely use text nodes for user-controlled data. Constant shared navigation markup is reusable; changing it does not require editing every page. The `.php` files are supplemental fixed HTML entry points, not an alternative MySQL/backend implementation.

## Database entities

`profiles` references an Auth UUID and stores the trusted role/active flag. `drivers` holds license data. `trucks` holds vehicle identity/base state. `driver_truck_assignments` retains regular assignment history. `dispatches` records timed reservations and delivery state; `delivery_status_logs` preserves immutable events. `attendance` stores server-recorded shifts. `maintenance_reports` and `maintenance_schedules` separate reported problems from repair work. `coding_areas`/`coding_rules` define operational coding configuration. `company_settings` stores a single validated configuration. `notifications` is per recipient. `private.requests` stores idempotent mutation results.

Indexes cover ownership lookups, active reservations, open shifts and notification ordering. UUID primary keys are separate from display truck/dispatch codes. Foreign-key restrictions preserve history. No exposed view bypasses RLS. Helper functions with definer privileges are in `private`, check `auth.uid()` where externally reachable, set a safe search path, and have restricted execution. The public wrapper remains security invoker. `private` must never be added to the Data API's exposed schemas.

## Realtime and client state

Page refreshes read complete authorized datasets in 500-row batches so the Data API's default response cap does not silently truncate statistics. This is appropriate for a school/small-fleet implementation; a large operational database should add server-side filtered/paginated reports and targeted aggregates rather than fetching its entire authorized history on every update.

Initial fetch is followed by subscription and a fresh read on SUBSCRIBED, closing the initial-load race. Visibility/reconnect events trigger reconciliation. Subscriptions are removed on page exit. Realtime does not carry untrusted role decisions and does not replace transaction/RLS enforcement.

## External dependencies

Exact versions and integrity information are in `package-lock.json`. Runtime libraries: Supabase JS for managed services, Chart.js for charts, and Leaflet for map display. OpenRouteService provides routing/geocoding through the server function; OpenStreetMap provides map tiles. Development dependencies: Vite, Supabase CLI, Playwright, PGlite and Prettier. See README for installation and provider setup.

## Original-reference adaptations

The layout follows the provided dark sidebar, gold active navigation, white cards, gray canvas, plate badges, tables, tabs and modal hierarchy. Reference screenshots are retained unchanged under `reference-screenshots/`. Their example numbers are not used as live operational metrics. A clean standalone brand/hero asset was not supplied: the login's photographic panel is displayed by CSS framing the supplied login reference; sidebar branding is accessible text. Replace these with official original assets when available. Screens are an implementation of the reference language, not a claimed pixel-exact replica.

Security/consistency changes from the pictures include email-based Supabase sign-in, explicit dispatch end time, verified-role routing, confirmed status changes, no invented metrics, and archive-first handling of referenced trucks. Additional settings support company information and stable area identifiers. The same supplied reference is used for differently named/cropped screenshots where their visual content overlaps.

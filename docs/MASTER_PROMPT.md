# CentriTruck — Master Implementation Prompt

Implement **CentriTruck**, a fleet management web application for **Owens Trucking Services**, using the requirements below. Deliver working source files, database migrations, configuration examples, setup instructions, and verification results. Build the application, rather than stopping at a design proposal.

## 1. Goal and source of truth

CentriTruck manages trucks, drivers, dispatch assignments, deliveries, configurable number coding restrictions, attendance, maintenance, operational reports, and notifications. It has exactly two application roles: **Administrator** and **Driver**.

Use the attached screenshots as the **primary visual and interaction reference**. Preserve their layout, hierarchy, spacing, typography, cards, tables, badges, forms, navigation, and black-and-gold identity. Do not replace them with a generic dashboard or an unrelated component-library theme.

Use this prompt as the functional and technical specification. Screenshot numbers and names are examples, not permanent operational data. When a screenshot omits a required feature, extend the same visual language. Where an apparent screenshot behavior would conflict with backend authorization or data integrity, enforce the rules and explain the difference.

Before claiming visual fidelity, open and inspect the available images. Inventory the admin, driver, login, and modal references, including similarly named files. If an attachment cannot be opened, state which reference is missing, continue with accessible references and specified requirements, and request its reattachment when needed for final visual comparison. Do not claim to have inspected missing images.

## 2. Required technology stack and PHP's role

Use this target stack:

| Layer | Technology | Responsibility |
|---|---|---|
| Page structure | Semantic HTML5 | Separate, editable HTML documents for each page |
| Styling | Plain CSS3 | Shared design tokens, components, layouts, and responsive rules |
| Browser behavior | Vanilla JavaScript with ES modules | Forms, tables, filters, charts, page interactions, and service calls |
| Development/build | Vite, configured for a multi-page application | Local development and production builds of all HTML entry points |
| Backend platform | Supabase | Managed backend services |
| Database | Supabase PostgreSQL with SQL migrations | Relational records, constraints, indexes, transactions, and database functions |
| Authentication | Supabase Auth | Sign-in, session lifecycle, and password recovery |
| Authorization | Database grants, Row Level Security, and authorized backend functions | Admin/driver access and ownership rules |
| Files | Supabase Storage | Private maintenance images and other required uploads |
| Live updates | Supabase Realtime | Authorized attendance, delivery, maintenance, and notification updates |
| Custom backend operations | PostgreSQL functions/RPC and Supabase Edge Functions where needed | Atomic workflows, privileged account administration, and external integrations |
| Frontend deployment | An HTTPS-capable static website host | Serve the generated HTML, CSS, JavaScript, and assets |

Keep frontend code in ordinary `.html`, `.css`, and `.js` files. TypeScript may be used for Supabase Edge Functions if required by the supported tooling; this does not require a TypeScript frontend.

Use the official `@supabase/supabase-js` client. Use a chart library such as Chart.js where it improves the implementation, and a mapping/routing provider for actual route information. Keep dependencies limited, document their purpose, pin compatible versions, and commit the lockfile. Verify current official documentation before implementing version-dependent integrations.

Do not add React, Next.js, Vue, Angular, Laravel, Express, or another application framework by default. Plain CSS is the default; a CSS framework is not required to reproduce the screenshots.

**PHP is a server-side language. It is optional and is not part of this target architecture.** Supabase and custom database/Edge Functions supply the backend responsibilities here. Do not add PHP merely to make separate pages work. Do not install MySQL alongside Supabase as a second authoritative database.

If a later explicit school requirement mandates PHP, explain its proposed backend role and the implications before changing the stack. HTML pages can call PHP endpoints in such an alternative architecture; they do not inherently need to become PHP templates. That alternative requires PHP-capable hosting.

Node.js and npm are development/build dependencies for Vite. They do not imply that a separately hosted Node.js backend is required. Supabase hosts backend services; deploy the frontend separately. A custom domain is optional, while HTTPS is required for deployment.

## 3. Inspect existing code before changing it

1. Inspect the current directory structure, configuration, dependencies, database schema, authentication, and rendering approach.
2. Identify the current framework or absence of one. State what actually exists rather than assuming the recommended stack is already installed.
3. Identify reusable visual assets, CSS, validation concepts, and business rules.
4. Summarize which files will be added, changed, or retired and why.
5. Implement in small, testable stages and preserve unrelated work.

An earlier CentriTruck source package may use PHP/MySQL with `public/api.php`, `public/index.php`, and one large `public/assets/app.js`. If that is the starting point, inspect it and deliberately migrate its backend responsibilities to Supabase. Renaming `index.php` to `dashboard.html` does not migrate authentication, the database, or business logic.

Preserve useful existing work while satisfying the target architecture. Document any MySQL-to-PostgreSQL field/status mappings, account migration limitations, and configuration changes. Do not drop or overwrite existing operational data, silently keep two competing backends, or claim legacy PHP password hashes are automatically compatible with Supabase Auth. Provide a safe migration or account-reset path if existing users must be transferred.

## 4. Real HTML pages and understandable file organization

Build a **multi-page application**. Each screen must have a real HTML file and URL, normal link navigation, direct access, and reliable refresh/back/forward behavior.

Required pages:

| File | Screen |
|---|---|
| `index.html` | Entry point that directs the user according to authentication |
| `login.html` | Shared sign-in page |
| `reset-password.html` | Password recovery/update flow |
| `admin/dashboard.html` | Administrator dashboard |
| `admin/trucks.html` | Truck management |
| `admin/dispatch.html` | Dispatch schedule and trip history |
| `admin/maintenance.html` | Maintenance management |
| `admin/attendance.html` | All authorized driver attendance records |
| `admin/reports.html` | Reports and analytics |
| `admin/settings.html` | Company, driver-account, coding, and operational configuration |
| `driver/dashboard.html` | Driver dashboard |
| `driver/attendance.html` | Driver time in/out and attendance history |
| `driver/my-truck.html` | Assigned vehicle and coding eligibility |
| `driver/delivery-status.html` | Assigned delivery and status confirmation |
| `driver/maintenance.html` | Issue reporting and the driver's report history |

Use these supporting directories:

| Location | Contents |
|---|---|
| `assets/css/` | Tokens, base styles, shared components, layouts, and responsive CSS |
| `assets/images/` | Logos, login imagery, and other image assets |
| `assets/js/config/` | Public environment configuration and Supabase client initialization |
| `assets/js/components/` | Reusable sidebar, header, badges, modals, fields, tables, and other UI helpers |
| `assets/js/services/` | Auth, trucks, dispatch, coding, attendance, maintenance, reports, maps, and notification service modules |
| `assets/js/pages/admin/` | One focused controller per administrator page |
| `assets/js/pages/driver/` | One focused controller per driver page |
| `assets/js/utils/` | Formatting, validation, time, and reusable DOM utilities |
| `supabase/migrations/` | Versioned schema, permissions, policies, constraints, and function migrations |
| `supabase/functions/` | Edge Functions that the implemented workflows require |
| `scripts/` | Safe development-only setup/seed utilities where needed |
| `tests/` | Meaningful authorization, workflow, and navigation tests |
| `docs/` | Architecture, editing guide, setup, and verification documentation |

Keep page-specific semantic markup in the corresponding HTML file: headings, sections, form structure, table headers, and component mount points. JavaScript populates records and handles behavior. Do not put every page's entire HTML inside one enormous JavaScript string, or create nominal HTML pages that all load the same monolithic screen switcher.

Reuse common components through ES modules, native HTML templates, or lightweight Web Components. Shared components do not require React. Separate pages must not become seven independently copied implementations of the sidebar or modal system.

For example, editing the Trucks screen should normally involve `admin/trucks.html`, `assets/js/pages/admin/trucks.js`, and shared CSS as appropriate. Database access belongs in `assets/js/services/trucks.js`, with authoritative rules in the backend/database.

Configure Vite to include every HTML entry point in the production build. Verify nested-page asset paths and direct navigation on the deployed/static build. Do not rely on a development-server SPA fallback that hides missing production pages.

## 5. Authentication, authorization, and data boundaries

Use one login page. Determine the portal from the authenticated user's trusted role; do not let a role dropdown grant access. Support sign-in, sign-out, session expiration, password recovery, and useful invalid-login errors.

Use Supabase Auth identities linked to application profiles. Store driver-specific information separately where useful. Do not store plaintext passwords in application tables. Provide a documented, trusted first-administrator setup and administrator-only driver-account creation/deactivation. Do not allow public self-registration to create administrators.

Frontend route guards improve navigation, but backend enforcement is mandatory:

- Enable RLS on exposed application tables and grant only necessary table/function privileges.
- Administrators can manage the fleet and operational configuration according to their role.
- Drivers can access their own profile, assignments, delivery history, attendance, maintenance submissions, and intended notifications.
- Drivers can read relevant assigned-truck information but cannot modify fleet administration fields.
- Drivers cannot change their role, another user's records, dispatch assignments, maintenance decisions, coding rules, or company settings.
- Roles must not come from user-editable metadata. Protect role and ownership columns from unauthorized updates.
- Derive the acting user from the verified authentication context. Never trust a submitted user ID or `isAdmin` flag as authorization.
- Use a browser publishable key with correctly configured policies. Never expose secret/service-role keys or database credentials in HTML, frontend JavaScript, browser-bundled environment variables, source control, or logs.
- Validate Edge Function callers and permissions, especially before using privileged server-side credentials.
- Protect Storage objects and Realtime access using the same ownership model.
- Ensure aggregate queries/views do not bypass the intended access model.

Do not solve authorization errors by disabling RLS. Use database functions with caller privileges where practical; if a privileged function is necessary, explicitly restrict execution, validate authorization, and use a safe implementation.

Read-only data and simple permitted operations can use the Supabase Data API. Multi-record business actions require an atomic database operation. Multiple independent browser requests are not a transaction, and merely placing them in an Edge Function does not make them atomic.

## 6. Data model and operational consistency

Use relational tables with foreign keys, indexes for actual queries, uniqueness rules, valid status constraints, and timestamps. Suggested entities:

| Entity | Minimum responsibility |
|---|---|
| Auth User | Supabase-managed identity and authentication |
| Profile | Auth user link, trusted application role, name, contact information, active status |
| Driver | Profile link, license details, and driver-specific records |
| Truck | Unique truck code/plate, vehicle details, operational status, maintenance dates |
| DriverTruckAssignment | Driver/truck relationship with effective dates if assignment history is needed |
| Dispatch | Unique display ID, driver/truck, coding area, planned interval, route/client details, lifecycle and delivery status |
| DeliveryStatusLog | Immutable status event, dispatch, previous/new status, actor, timestamp |
| Attendance | Driver, server-recorded time in/out, shift information |
| MaintenanceReport | Driver-submitted issue, truck, category, description, priority, photo reference, review state |
| MaintenanceSchedule | Service work, truck, dates, mechanic, priority, workflow status, optional originating report |
| CodingRule | Area, weekday, restricted digits, time window, enabled state |
| Notification | Intended recipient, event/reference, created/read timestamps |
| CompanySettings | Company information and configurable operational settings |

Additional supporting entities are allowed when justified. Use database-generated primary keys; keep human-readable truck/dispatch IDs separate where appropriate. Enforce uniqueness of user-specified display IDs and normalized plate numbers.

Store operational instants as timezone-aware timestamps and display business dates/times in **Asia/Manila**. Compute "today," weekday coding checks, date filters, and shift boundaries consistently. Use server timestamps for attendance and status logs.

Define status transitions explicitly. Distinguish truck operational status, service due status, coding eligibility, dispatch lifecycle, delivery progress, and maintenance-report review state. These are different concepts and must not overwrite each other.

Use transactions for dispatch creation, delivery status plus log insertion, attendance state changes, and linked maintenance actions. Make important mutations safe against duplicate submissions and concurrent requests. Do not rely on disabled buttons as the only duplicate protection.

Keep operational history. Block destructive deletion where referenced history would be lost; use clearly labeled archival/deactivation where appropriate. Document this behavior in the UI and README.

## 7. Administrator portal

Navigation, in order: **Dashboard, Trucks, Dispatch, Maintenance, Attendance, Reports, Settings**.

### Dashboard

Match the supplied dashboard layout and include:

- Total Trucks KPI.
- Active Dispatch KPI.
- Maintenance Alert KPI.
- Truck Information card.
- Weekly Operations Activity **line chart**.
- Recent Dispatch table/card.
- Maintenance Alert card.
- Realtime Driver Attendance Monitoring.
- Realtime Delivery Monitoring.
- Driver Maintenance Queue.

All numbers, charts, queues, and tables must derive from stored records. Define what each metric counts, including which dispatch statuses are active and which dates are included. Use honest empty states for zero records. Do not display screenshot sample values as if they were live data.

### Truck Management

Implement listing, Add Truck, View Truck, Edit Truck, Delete Truck, search, maintenance filters, loading/empty states, and confirmed destructive actions.

Table columns: **Truck ID, Plate Number, Truck Type, Assigned Driver, Maintenance Status, Coding Today, Next Maintenance, Actions**.

Truck operational statuses: **Available, On Delivery, Under Maintenance, Out of Service**.

Maintenance due statuses: **Up to date, Due Soon, Overdue**. Derive them from maintenance schedules and a documented/configurable due-soon threshold.

Coding statuses: **Allowed, Coding Restriction**. Clearly identify the area/time context used for today's result.

Support driver assignment and validate referenced accounts. Preserve assignment/delivery history when a truck's regular driver changes. A truck's status must reflect active deliveries and maintenance locks consistently.

Implement deletion for eligible unused records. If a truck has historical references or active work, explain why deletion is blocked and provide an archive/deactivation workflow that preserves history.

### Dispatch Management

Reproduce the screenshot layout, including top cards **On Route, Available, Coding Restricted Today**, a Philippine route map, and tabs **Dispatch Schedule** and **Trip History**.

The map must display pickup, destination, a real road route, distance, and estimated travel time from the configured provider.

Table columns: **Dispatch ID, Date, Driver, Plate Number, Destination, Schedule, Status, Actions**.

Provide create, view, allowed edits, cancellation, and history. Define which terminal records move to Trip History, and retain their status logs.

### New Dispatch modal

Fields:

- Dispatch ID, automatically generated if blank.
- Date.
- Coding Area.
- Driver.
- Truck.
- Plate Number, derived/read-only when a truck is selected.
- Schedule.
- Expected completion/end time, or a documented duration that determines the interval.
- Client / Delivery.
- Pickup Location.
- Delivery Location.
- Delivery Status, with only valid creation-state choices.
- Notes.

When a truck is selected, show its plate number, truck ID, truck type, assigned driver, and eligibility. Show **Available, Coding Restriction, Under Maintenance, Out of Service**, and a clear conflict explanation when already assigned.

Block dispatch creation if the truck is under maintenance, out of service, coding-restricted for the selected area/date/time, or already has an overlapping active reservation. Also prevent overlapping driver assignments and assignments to inactive drivers.

Validate client-side for immediate feedback and backend-side as the authority. Recheck when relevant fields change and again during the atomic save. Concurrent requests must not create two conflicting dispatches. Recheck eligibility on relevant edits and departure transitions.

Overlap checks must use a real start/end interval. Document interval boundaries and the handling of overdue trips that remain in progress beyond their planned completion.

### Number coding engine

Do not hardcode one permanent Philippine coding policy or claim example rules are current law.

Create configurable CodingRule records with **area, weekday, restricted plate digits, start time, end time, and active status**. Administrators can add, edit, enable, and disable rules. Support multiple windows per area/day. Use stable area identifiers rather than ambiguous free-text comparisons where practical.

Evaluate the selected plate number, date, schedule, and coding area using Manila time. For a dispatch interval, check all relevant local dates and restricted windows it overlaps. Correctly handle boundary times and overnight windows, or explicitly reject unsupported configurations rather than silently computing a wrong result.

The same authoritative coding engine must inform Truck Management, Dispatch, Driver My Truck, and Driver Delivery Status. A frontend preview can assist users, but server validation determines whether an assignment is allowed.

Display the evaluated context. When an area lacks configured policy, make that clear rather than implying legal verification. Seed examples disabled unless the user supplies validated active rules. Do not imply this module provides legal compliance certification.

### Maintenance

Tabs: **Schedule, Maintenance History, Alerts, Driver Reports**.

Summary cards: **Scheduled Maintenance, Open Repairs, Urgent Reports**.

Service table columns: **ID, Truck, Service Type, Scheduled Date, Priority, Status, Assigned Mechanic, Actions**.

Priorities: **Low, Medium, High, Urgent**.

Maintenance work statuses: **Scheduled, In Progress, Completed, Cancelled**.

Driver issue reports appear automatically in Driver Reports and the dashboard queue. Keep report review state separate from service-work status. Define a clear process for reviewing a report, creating/linking repair work, assigning a mechanic, resolving the issue, and retaining history.

Apply a documented maintenance-lock policy. Completing one job must not release a truck if another blocking issue remains. Cancelling a job must not automatically imply that the underlying vehicle issue was repaired.

### Attendance

Summary cards: **Total Records, Drivers Tracked, Showing**. Define how each changes with filters.

Filters: **Date, Driver, Reset**.

Table columns: **Driver Name, Date, Time In, Time Out, Shift Duration, Status**.

Records originate from driver time-in/time-out actions. Show active shifts and completed shifts, with automatic duration calculation and realtime updates.

### Reports

Provide reports for **fleet activity, dispatch activity, deliveries, maintenance, truck availability, and attendance**.

Follow the supplied report screenshots using cards, bar charts, line charts, and tables. Support start/end date-range filtering and relevant truck/driver/status filters where useful. Keep labels, table totals, chart series, and exports consistent with the active filters.

Provide CSV export and printable reports/browser Save as PDF. Use a PDF library only if the required report design cannot be met with print CSS. Distinguish current truck availability from historical availability; reconstruct historical metrics from recorded events if needed rather than guessing from current state.

### Settings

Implement company information, dispatch configuration, number coding rules, driver-account management, and other operational settings shown in the screenshots.

Include company/contact information and the owner emergency contact used by the driver portal. Centralize configurable operational values rather than scattering them through JavaScript. Validate settings and enforce administrator-only writes.

## 8. Driver portal

Navigation, in order: **Dashboard, Attendance, My Truck, Delivery Status, Maintenance**.

Do not expose administrator-only fleet controls. Driver pages must only fetch authorized records. Show meaningful states when no truck or delivery is assigned.

### Driver Dashboard

Follow the driver dashboard screenshots. Include the driver's identity, assigned truck, current route/delivery, coding eligibility, current delivery status, attendance controls/summary, and relevant maintenance information. Every shortcut must open the appropriate separate HTML page.

### My Truck

Display these screenshot sections:

**Assigned Vehicle:** truck name, truck ID, plate number, truck status.

**Number Coding Status:** truck ID, plate number, today's status, and **Allowed to Travel** or **Coding Restricted**, with the evaluated area/time context.

**Vehicle Details:** make, model, truck ID, plate number, and status.

Clearly distinguish a regularly assigned truck from a temporary dispatch vehicle if the system allows both. Drivers cannot select arbitrary fleet trucks to gain access to their records.

### Delivery Status

Display current delivery driver, assigned truck, route, current status, and last-updated time. Display the assigned truck's coding eligibility for the relevant dispatch context.

Allow the driver to select **On the Way, Delivered, Not Yet Delivered**, then press **Confirm Status Update**. Selecting an option alone must not save it.

Each confirmed update must atomically:

1. Verify the caller owns the active assignment and the transition is valid.
2. Update the dispatch's delivery status.
3. Insert a DeliveryStatusLog with actor, previous/new state, and server timestamp.
4. Update relevant truck/dispatch lifecycle state consistently.
5. Make the committed result available to administrator monitoring and notifications.

Retain immutable event history and prevent duplicate logs from repeated submissions. Define terminal-state behavior and how Not Yet Delivered can resume or be resolved. Do not let a driver silently reopen a completed trip.

Display a **Departure → In Transit → Destination** route-progress component based on stored status/events. It represents workflow milestones, not live GPS position. Include the owner's contact action where shown.

### Attendance

Allow **Time In, Time Out, active shift viewing, and attendance history**.

Prevent duplicate active time-ins and time-out without an active shift, including concurrent requests. Calculate completed shift duration from timestamps and display an elapsed duration for an active shift. Use server time as the recorded authority.

Handle shifts crossing midnight. Define the business-date attribution and any limit on multiple completed shifts per day; do not confuse a one-active-shift constraint with a one-record-per-calendar-day constraint.

### Maintenance

Let drivers submit an issue for their authorized assigned truck.

Fields: **truck (automatically assigned), issue category, description, priority, optional image, timestamp**.

If multiple valid assignments exist, limit selection to those authorized trucks. Derive reporter identity server-side. Validate image content/type and size; store images privately and provide authorized access. Handle upload failures without claiming the report or attachment was saved when it was not.

Reports must appear in the administrator's Maintenance module and dashboard queue through authorized realtime updates. Drivers can view the status of their own reports. Administrative repair decisions remain administrator-only.

## 9. Realtime updates and notifications

Use Supabase Realtime for committed attendance changes, delivery updates, maintenance submissions/status changes, and notifications. Configure the required publications or authorized channels explicitly; do not assume subscriptions work without backend setup.

Load initial authoritative data, establish subscriptions, and reconcile/refetch after reconnecting or returning to the page. Avoid duplicate subscriptions and clean them up on navigation/sign-out. Update affected sections without erasing an unsaved form or resetting filters unnecessarily.

Do not permanently display a "Live" indicator while disconnected. Show connection/retry state and a manual refresh path. If a polling fallback is used, label it honestly.

Implement a notification bell, unread count, readable event list, relevant destination links, and mark-as-read behavior. Persist notification read state per recipient. Drivers must not receive another driver's confidential events. Deduplicate notifications arising from retries. Email/SMS/push delivery is optional unless explicitly requested; in-app notifications are required.

## 10. Route and map integration

Match the Dispatch screenshot's map placement and route-summary presentation. Provide selected pickup and destination markers, a road-following route, distance, and estimated travel time from a real routing service.

Choose one supported provider and document its credentials, setup, usage limits, and any billing requirements without inventing pricing. A map renderer alone does not calculate routes; provide the needed routing/geocoding integration too. Keep private credentials server-side and restrict browser keys according to provider guidance.

Validate address/coordinate input, allow ambiguous-location correction, and handle no-route/API errors. Identify estimates as estimates. Do not fabricate route distance, duration, traffic data, or GPS movement.

If credentials are unavailable, implement the provider adapter and an honest setup/error state with an external directions link as a fallback. Mark the embedded route integration as pending configuration rather than claiming it is complete. Other dispatch functionality should remain usable.

Live GPS, OBD hardware, native mobile apps, automated route optimization, payroll, and full accounting are outside this scope. Realtime delivery-status updates do not require GPS tracking.

## 11. Visual system, components, and accessibility

Preserve:

- Fixed dark/black desktop sidebar.
- Gold selected navigation treatment and primary accent.
- White/light-gray application background.
- Rounded cards and subtle gray borders.
- Black primary text and muted gray supporting text.
- Green success/allowed badges.
- Orange/yellow warning badges.
- Red error/urgent/restricted badges.

Extract consistent design tokens from the images: sidebar width, content gutters, card radii, grid gaps, typography sizes/weights, row spacing, borders, and status colors. Use supplied logos/images when available and suitable; do not invent a replacement brand.

Reusable components: **AppSidebar, AppHeader, Breadcrumb, PageHeader, StatCard, StatusBadge, DataTable, SearchInput, FilterSelect, Modal, FormField, EmptyState, RouteMap, DeliveryTimeline, NotificationBell**.

Keep desktop composition close to the reference. On smaller screens, collapse the sidebar into an accessible drawer, stack KPI cards, allow table horizontal scrolling, resize charts/maps, and keep forms/modals usable without clipped controls.

Use semantic headings, table headers, labeled fields, keyboard-accessible controls, visible focus, accessible names for icon buttons, dialog focus management, and text alongside status colors. Preserve the visual style while keeping text legible.

Every feature needs loading, empty, error, success, and submitting states. Display useful validation messages and preserve entered values after recoverable errors. Escape or safely render user-controlled text. Avoid injecting unsanitized records into HTML.

## 12. Implementation sequence

Implement in this order, introducing only the shared components needed at each stage:

1. Database schema and authentication.
2. Role authorization, RLS, and policy tests.
3. Shared layouts and real HTML page navigation.
4. Truck CRUD.
5. Driver accounts and assignment.
6. Configurable number coding engine.
7. Dispatch creation, editing, validation, and history.
8. Driver delivery status, immutable logs, and monitoring.
9. Attendance.
10. Maintenance reports, schedules, uploads, and locks.
11. Dashboard aggregation and live sections.
12. Reports and exports.
13. Notifications.
14. Settings.
15. Route/map integration.
16. Responsive refinement.
17. Screenshot-level visual polishing.

For each major feature: implement the data model/backend first, then validation and service logic, then UI states and interactions, then verify its critical workflow and permissions. Do not leave the complete backend until after building mock screens.

Use documented development seed data only for setup/testing. Once a backend exists, load real stored records. Do not use localStorage as the authoritative database or as an authorization mechanism. Do not silently substitute mock data when a request fails.

Proceed with routine implementation decisions and state assumptions. If credentials or an unavailable service block a step, complete the code and configuration instructions that can be prepared, identify the exact missing dependency, and continue independent work. Never claim an unrun migration, undeployed function, or disconnected feature is working.

## 13. Verification and acceptance criteria

Verify with meaningful tests and browser checks, using a disposable test dataset rather than destructive operations on real records.

At minimum verify:

- Every HTML page exists in the production build and opens by direct URL and refresh.
- Normal links, back/forward navigation, sign-in routing, sign-out, and expired-session handling work.
- Anonymous callers cannot access operational data.
- A driver cannot read or modify another driver's records through direct API calls, forged IDs, or role changes.
- Administrator workflows work with the intended privileges.
- Truck CRUD, driver assignment, and history-preserving deletion behavior work.
- Coding checks cover configured areas, digits, weekdays, boundary times, disabled rules, multiple windows, and overnight intervals.
- Maintenance, out-of-service, truck overlap, and driver overlap restrictions are enforced by the backend.
- Competing dispatch requests cannot reserve the same resource for overlapping periods.
- Delivery confirmation writes the current status and exactly one corresponding event atomically; failures do not leave partial state.
- Repeated/concurrent time-ins do not create multiple active shifts; time-out requires an active shift; overnight duration is correct.
- A driver's maintenance report and authorized attachment reach the administrator, with correct permissions.
- Admin and driver browser sessions reflect committed updates without manual reload under a working Realtime connection; reconnecting reconciles missed changes.
- Dashboard counts, charts, filters, reports, and exports agree with known database records.
- Forms, modals, charts, tables, and sidebar work on desktop and phone-sized viewports.
- Empty databases and unavailable APIs produce honest UI states, not fake success or fabricated data.

Capture browser screenshots and compare each screen against its provided reference. Correct visible differences in spacing, layout, typography, card sizes, tables, and modal behavior. Distinguish tests actually run from suggested manual checks and blocked checks. Do not label the application production-ready based only on a successful build.

## 14. Required deliverables

Deliver:

1. Complete runnable source with the separate HTML pages and organized CSS/JavaScript modules.
2. Supabase migrations containing schema, constraints, indexes, permissions, RLS policies, and atomic workflow functions.
3. Required Edge Function source and explicit deployment/configuration instructions.
4. Storage bucket/policy and Realtime setup instructions or reproducible configuration.
5. `.env.example` with clearly named placeholders and a distinction between public frontend values and server-only secrets; no real secrets.
6. `package.json`, lockfile, multi-page Vite configuration, and working documented development/build/preview commands.
7. Safe first-admin and optional development-seed instructions; no permanently embedded production credentials.
8. `README.md` covering prerequisites, installation, Supabase setup, migrations, authentication redirects, local running, build, frontend deployment, and troubleshooting.
9. `docs/EDITING_GUIDE.md` explaining the files one by one in beginner-friendly language, with a page-to-HTML/CSS/JavaScript mapping. Clearly show where to edit frontend text/layout, styling, behaviors, data calls, and backend rules.
10. `docs/ARCHITECTURE.md` explaining how HTML/CSS/JS, Supabase Auth, PostgreSQL, RLS, Storage, Realtime, and custom functions work together, including why PHP is not required for this chosen stack.
11. A verification report listing tests performed, outcomes, remaining limitations, external configuration still needed, and visual comparison status.
12. A downloadable source ZIP if the environment supports file delivery, containing the project and instructions without credentials or dependency folders.

Do not substitute a single giant HTML file, a static screenshot imitation, a monolithic JavaScript renderer, or incomplete pseudocode for the requested application. The result must be understandable to a student who wants to open `dashboard.html` or `trucks.html` and know where to edit that screen.

Start by inspecting the available project and screenshots, briefly report the current structure and planned changes, then implement the stages above.

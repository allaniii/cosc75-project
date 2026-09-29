# Business rules and data definitions

## Permissions

There are exactly two application roles: `administrator` and `driver`. An active `profiles` row, tied to `auth.users.id`, is the authority. User metadata, a browser selector, submitted driver IDs, or localStorage values cannot grant permissions. Supabase Auth may persist a session token in browser storage; that token is not a fleet database or a trusted role flag.

All exposed application tables have RLS. Clients receive SELECT grants only. Writes use `perform_action`, an invoker wrapper around a checked function in the non-exposed `private` schema. Its caller comes from `auth.uid()`. Each action validates role, ownership, status, and constraints. Definer helpers use an empty search path and schema-qualified references. Browser roles cannot provision users or mutate tables directly. Admins read fleet-wide data; drivers read their own profile, dispatches, attendance, reports, intended notifications, and relevant truck/service records. Historical truck access follows stored assignment/dispatch history; submitting a new issue requires a current assignment.

Deactivation checks for active trips/shifts first, ends current regular assignments, and immediately invalidates operational permissions through live database role checks, even while an old JWT exists. It does not delete historical identity records. Privileged database maintenance tools and the project owner can bypass normal application constraints and must be used deliberately.

## Transactions, retries, and concurrency

Each application mutation holds one PostgreSQL transaction-level advisory lock shared across resource mutations. In the database function, eligibility checks and writes happen in the same transaction after acquiring that lock. This conservative design fits a small fleet. For larger throughput, replace it with sorted per-resource locks while preserving cross-resource checks.

`private.requests` stores `(actor_id, request_id)`, action, payload, and result. The browser reuses the request ID on a recoverable retry. A successful identical retry returns the stored result. Reusing an ID with changed payload is rejected. Errors roll back writes and the idempotency record together. Reconfirming an unchanged delivery state does not create another status log/notification. Repeated time-in returns the existing active shift. An independent unique partial index also guarantees one open shift per driver.

The local tests exercise sequential conflicting requests and rollback. Genuine competing PostgreSQL sessions must still be verified on a disposable hosted/local Supabase instance; PGlite does not establish multi-session lock behavior.

## Truck state and maintenance due status

Truck `base_status` is Available or Out of Service. On Delivery and Under Maintenance are derived from dispatch/service/report state and cannot be independently edited into contradictions. `truck_state` computes the authoritative derived state, including relevant locks from reports the driver cannot otherwise read. Precedence: archived → out of service → maintenance lock → active delivery → available. Scheduled reservations remain separately subject to interval conflict checks. “Available Now” in fleet cards means this operational state; it is not a promise that any proposed future interval passes coding and reservation checks.

Maintenance due date is the earliest of the truck's configured next-maintenance date and open service schedule dates. No date gives **Not scheduled**, rather than falsely “Up to date.” Before today is Overdue; today through the configured due-soon threshold is Due Soon; later is Up to date. The setting defaults to seven days. Truck display IDs and normalized plates are unique. Regular truck/driver assignments have effective dates and are never rewritten to alter old dispatches.

## Dispatch and delivery

Creation status is Scheduled. The modal uses explicit start/end Manila times, with an editable default duration from company settings. Intervals must be positive and <=31 days. A selected active driver must have an unexpired license for the start date. Backend eligibility also checks truck archive/base status, locks, coding and reservations.

Intervals use `[start,end)` overlap semantics. Scheduled overlapping reservations block the truck and driver. On the Way / Not Yet Delivered records are conservatively blocking even beyond planned completion; overdue unfinished scheduled records also block until edited/canceled/resolved. This can require an administrator to clear an old reservation before arranging another trip. No silent auto-completion occurs.

| Current state | Allowed next state |
| --- | --- |
| Scheduled | On the Way; administrator cancellation |
| On the Way | Delivered; Not Yet Delivered; administrator cancellation |
| Not Yet Delivered | On the Way; administrator cancellation |
| Delivered | Terminal |
| Cancelled | Terminal |

Only scheduled records can be edited. An assigned driver can confirm status for their own trip. Selecting a radio button alone does not save. Departure rechecks eligibility using the earlier of planned/actual start and the later of planned end / one hour from now. If that resulting window exceeds 31 days, the administrator must resolve the old schedule first. Every changed state and its immutable event are committed atomically. Trip History holds Delivered and Cancelled records. Route progress reflects recorded events, not GPS. The departure entry marks the scheduled assignment event; the On the Way event records actual departure.

## Number coding

An area has a stable key and display name. Rules contain weekday (Sunday=0), digit string, start/end local times, and enabled flag. The final numeric character of the normalized plate is evaluated. Multiple windows per weekday are supported. A start later than end is an overnight window; equal start/end is rejected to avoid ambiguity. Checks iterate all relevant Manila dates, including the previous day for an overnight window. Touching the end of a restriction does not overlap it.

No active policy is seeded. **Policy not configured** is displayed separately from verified rules reporting Allowed. The module applies administrator configuration and makes no legal-compliance claim. Truck Management evaluates the current minute; Dispatch's “restricted today” card evaluates the local day; dispatch forms/departure and driver deliveries evaluate the trip interval. Labels identify this context.

## Maintenance

Report review state (Submitted / Reviewed / Resolved / Dismissed) is distinct from service status (Scheduled / In Progress / Completed / Cancelled). A high/urgent unresolved report immediately locks its truck. An in-progress job locks it; a scheduled job blocks a proposed trip that reaches its scheduled start, and remains a blocker after its expected end until someone records completion/cancellation. This conservative policy never assumes a repair finished on schedule.

The administrator can inspect the report/photo, create linked service work, assign a mechanic, and record notes/cost. Starting/scheduling work that conflicts with an active dispatch is rejected; resolve/cancel that trip first. Completing work sets completion time, records last maintenance, optionally sets the next date, and resolves its linked report in one transaction. A second blocking job/report still keeps the truck unavailable. Canceling work does not resolve the report. A direct report resolution/dismissal requires a reason and no open linked work. History and event logs remain.

Private image upload happens before report creation. A successful upload followed by a failed report save is not described as a saved report. The same form retains the uploaded path for retry. Abandoned uploads may remain; a project owner can periodically remove objects not referenced by a report. Evidence cannot be deleted/replaced by ordinary browser clients.

## Attendance and dates

Instants are `timestamptz`; the business zone is Asia/Manila. Server `now()` records time-in/out and events. A shift is attributed to its time-in Manila date. A shift crossing midnight remains one record and duration is the elapsed timestamp difference. Multiple completed shifts on a date are permitted; simultaneous open shifts are not. Active elapsed durations update in the browser; completed totals exclude still-open shifts.

## Dashboard and reporting definitions

- Total Trucks: non-archived fleet.
- Active Dispatch: Scheduled, On the Way, or Not Yet Delivered.
- Maintenance Alert: unresolved high/urgent reports plus scheduled/in-progress services within the due-soon horizon. These are alert items, not distinct trucks.
- Weekly Operations Activity: dispatch start counts on each of the last seven Manila dates, including today.
- Recent Dispatch: newest created records, up to five.
- Dashboard attendance: today's started shifts plus any currently open shifts.
- Driver weekly trips: Delivered with last-updated date within the last seven Manila dates. Weekly hours: completed shifts whose time-in date is in that period.
- Report completion rate: Delivered / all dispatches in the selected start-date range, including canceled records in the denominator.
- Average completed trip: first On the Way event to Delivered event; rows missing those events do not invent a duration.
- Maintenance costs: actual recorded costs of completed services whose scheduled start falls in the range. This is not accounting or cash-flow recognition.
- Current availability is explicitly a current snapshot; historical utilization is not inferred from current truck status.

Report filters have labeled scope: date/truck/driver/status apply to dispatches; date/truck to services; date/truck/driver to issues; date/driver to attendance. Attendance has no truck relation. Exports contain the exact filtered rows for each section. Charts use those same arrays. CSV cells are escaped and initial spreadsheet formula characters neutralized. Printing uses browser Save as PDF and print CSS; it does not claim server-generated PDF files. Operational metrics that require fuel, GPS, payroll, or a historical availability ledger are intentionally not fabricated.

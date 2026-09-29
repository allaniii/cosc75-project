# Dependencies and integration references

Dependencies are pinned in package.json and package-lock.json. Runtime packages: `@supabase/supabase-js` (Auth, Data API, Storage and Realtime), `chart.js` (charts), and `leaflet` (map rendering). Vite bundles the pages; Supabase CLI manages migrations/functions; Playwright and PGlite are test tools; Prettier formats source. None of these creates a second application backend. Node >=22.12 is required; development used Node 24.19.

Official documentation checked during implementation:

- Supabase changelog index: https://supabase.com/changelog.md
- September 25 PostgreSQL minor-release changes: https://supabase.com/changelog/postgres-15-19-17-11-breaking-changes
- New key and Edge Function handling: https://supabase.com/docs/guides/getting-started/migrating-to-new-api-keys
- Password sign-in: https://supabase.com/docs/reference/javascript/auth-signinwithpassword
- Storage policies: https://supabase.com/docs/guides/storage/security/access-control
- Realtime Postgres changes: https://supabase.com/docs/guides/realtime/postgres-changes
- RLS guidance: https://supabase.com/docs/guides/database/postgres/row-level-security
- OpenRouteService API: https://openrouteservice.org/dev/
- Routing response reference: https://giscience.github.io/openrouteservice/api-reference/endpoints/directions/
- Provider restrictions: https://openrouteservice.org/restrictions/
- OpenStreetMap tile policy: https://operations.osmfoundation.org/policies/tiles/

Relevant adjustments: current Node support, explicit table grants alongside RLS, modern public/server keys, and custom validated-user authorization inside the Edge Functions. The September database notice concerns ltree, legacy pgcrypto encryption, float btree_gist indexes, and custom operators; this schema does not use those features. CLI commands used in the README were checked against installed CLI help.

The reference artwork is supplied by the user; the package does not assert ownership of third-party brand/artwork. Dependency licenses remain those of their authors and are available with installed packages. Use official company assets and appropriate routing/tile provider terms for deployment.

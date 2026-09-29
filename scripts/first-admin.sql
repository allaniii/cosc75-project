-- Trusted one-time setup, run in Supabase SQL Editor after creating the
-- first user's identity under Authentication > Users. Replace the UUID/name.
-- Do not run as a browser query. Existing roles are never overwritten.
insert into public.profiles(id,role,full_name,phone)
values ('8ec81969-4d38-480e-9afb-95c7d7cecc7a'::uuid,'administrator','Fleet Administrator','');

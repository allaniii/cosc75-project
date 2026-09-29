-- CentriTruck schema. Apply once to a fresh Supabase project.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;
create table public.profiles (
 id uuid primary key references auth.users(id) on delete restrict,
 role text not null check(role in ('administrator','driver')) default 'driver',
 full_name text not null check(length(trim(full_name)) between 2 and 120),
 phone text not null default '', active boolean not null default true,
 created_at timestamptz not null default now()
);
create table public.drivers (
 id uuid primary key references public.profiles(id) on delete restrict,
 license_number text not null unique, license_expiry date not null
);
create table public.coding_areas (id text primary key check(id ~ '^[a-z0-9-]+$'),name text not null unique);
insert into public.coding_areas values ('metro-manila','Metro Manila');
create table public.company_settings (
 id boolean primary key default true check(id), company_name text not null default 'Owens Trucking Services',
 email text not null default '', phone text not null default '', address text not null default '',
 owner_name text not null default '', owner_phone text not null default '',
 default_area text not null references public.coding_areas(id) default 'metro-manila',
 due_soon_days int not null default 7 check(due_soon_days between 0 and 90),
 default_dispatch_hours int not null default 8 check(default_dispatch_hours between 1 and 72)
);
insert into public.company_settings(id) values(true);
create table public.trucks (
 id uuid primary key default gen_random_uuid(), code text not null unique,
 plate text not null unique check(plate ~ '^[A-Z0-9]+$' and plate ~ '[0-9]'),
 truck_type text not null, make text not null default '', model text not null default '',
 year int check(year between 1950 and 2200), mileage numeric not null default 0 check(mileage>=0),
 condition text not null default 'Good', engine_number text not null default '', registration_expiry date,
 base_status text not null default 'available' check(base_status in ('available','out_of_service')),
 last_maintenance date, next_maintenance date, notes text not null default '', archived boolean not null default false,
 created_at timestamptz not null default now()
);
create table public.driver_truck_assignments (
 id uuid primary key default gen_random_uuid(), driver_id uuid not null references public.drivers(id),
 truck_id uuid not null references public.trucks(id), starts_at timestamptz not null default now(), ends_at timestamptz,
 check(ends_at is null or ends_at>=starts_at)
);
create unique index assignment_truck_active on public.driver_truck_assignments(truck_id) where ends_at is null;
create unique index assignment_driver_active on public.driver_truck_assignments(driver_id) where ends_at is null;
create index assignments_driver on public.driver_truck_assignments(driver_id);
create index assignments_truck on public.driver_truck_assignments(truck_id);
create table public.coding_rules (
 id uuid primary key default gen_random_uuid(),area_id text not null references public.coding_areas(id),
 weekday int not null check(weekday between 0 and 6), digits text not null check(digits ~ '^[0-9]+$'),
 start_time time not null, end_time time not null, enabled boolean not null default false,
 check(start_time<>end_time)
);
create index coding_rule_area on public.coding_rules(area_id,weekday) where enabled;
create table public.dispatches (
 id uuid primary key default gen_random_uuid(),code text not null unique default ('DSP-'||upper(substr(gen_random_uuid()::text,1,8))),
 driver_id uuid not null references public.drivers(id),truck_id uuid not null references public.trucks(id),
 area_id text not null references public.coding_areas(id), starts_at timestamptz not null, ends_at timestamptz not null,
 client text not null check(length(trim(client))>0), pickup text not null check(length(trim(pickup))>0),destination text not null check(length(trim(destination))>0),
 pickup_lon double precision,pickup_lat double precision,destination_lon double precision,destination_lat double precision,
 status text not null default 'scheduled' check(status in ('scheduled','on_way','not_delivered','delivered','cancelled')),
 notes text not null default '', created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 check(ends_at>starts_at and ends_at-starts_at<=interval '31 days'),
 check(pickup_lon between -180 and 180 and destination_lon between -180 and 180 and pickup_lat between -90 and 90 and destination_lat between -90 and 90)
);
create index dispatch_truck_active on public.dispatches(truck_id,starts_at,ends_at) where status not in ('delivered','cancelled');
create index dispatch_driver_active on public.dispatches(driver_id,starts_at,ends_at) where status not in ('delivered','cancelled');
create index dispatch_date on public.dispatches(starts_at);
create table public.delivery_status_logs (
 id uuid primary key default gen_random_uuid(),dispatch_id uuid not null references public.dispatches(id),
 old_status text,new_status text not null,actor_id uuid not null references public.profiles(id),created_at timestamptz not null default now()
);
create index delivery_logs_dispatch on public.delivery_status_logs(dispatch_id,created_at);
create index delivery_logs_actor on public.delivery_status_logs(actor_id);
create table public.attendance (
 id uuid primary key default gen_random_uuid(),driver_id uuid not null references public.drivers(id),
 time_in timestamptz not null default now(), time_out timestamptz, check(time_out is null or time_out>=time_in)
);
create unique index attendance_one_open_shift on public.attendance(driver_id) where time_out is null;
create index attendance_driver_date on public.attendance(driver_id,time_in);
create table public.maintenance_reports (
 id uuid primary key default gen_random_uuid(),truck_id uuid not null references public.trucks(id),
 reporter_id uuid not null references public.drivers(id),category text not null check(length(trim(category))>0),description text not null check(length(trim(description)) between 10 and 4000),
 priority text not null check(priority in ('low','medium','high','urgent')),location text not null default '',photo_path text,
 review_state text not null default 'submitted' check(review_state in ('submitted','reviewed','resolved','dismissed')),
 resolution text not null default '', created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create index reports_reporter on public.maintenance_reports(reporter_id,created_at);
create index reports_truck on public.maintenance_reports(truck_id,review_state);
create table public.maintenance_schedules (
 id uuid primary key default gen_random_uuid(),truck_id uuid not null references public.trucks(id),
 report_id uuid references public.maintenance_reports(id),service_type text not null check(length(trim(service_type))>0),
 scheduled_at timestamptz not null, ends_at timestamptz not null, priority text not null check(priority in ('low','medium','high','urgent')),
 status text not null default 'scheduled' check(status in ('scheduled','in_progress','completed','cancelled')),
 mechanic text not null default '',notes text not null default '', cost numeric not null default 0 check(cost>=0),
 completed_at timestamptz,created_at timestamptz not null default now(),check(ends_at>scheduled_at)
);
create index maintenance_truck on public.maintenance_schedules(truck_id,status);
create index maintenance_report on public.maintenance_schedules(report_id);
create table public.notifications (
 id uuid primary key default gen_random_uuid(),recipient_id uuid not null references public.profiles(id),
 title text not null, destination text not null,event_key text not null,
 created_at timestamptz not null default now(),read_at timestamptz,unique(recipient_id,event_key)
);
create index notifications_recipient on public.notifications(recipient_id,created_at desc);
create table private.requests (actor_id uuid not null references public.profiles(id),request_id uuid not null, action text not null,payload jsonb not null,result jsonb not null,created_at timestamptz not null default now(),primary key(actor_id,request_id));
alter table private.requests enable row level security;

-- Trusted lookup avoids recursive RLS. No user-editable JWT metadata is used.
create function private.role() returns text language sql stable security definer set search_path='' as $$
 select role from public.profiles where id=auth.uid() and auth.uid() is not null and active;
$$;
create function private.has_truck(t uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and private.role() is not null and (
 private.role()='administrator' or exists(select 1 from public.driver_truck_assignments where truck_id=t and driver_id=auth.uid())
 or exists(select 1 from public.dispatches where truck_id=t and driver_id=auth.uid()));
$$;
create function private.current_truck(t uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and private.role() is not null and (
 private.role()='administrator' or exists(select 1 from public.driver_truck_assignments where truck_id=t and driver_id=auth.uid() and ends_at is null)
 or exists(select 1 from public.dispatches where truck_id=t and driver_id=auth.uid() and status not in ('delivered','cancelled')));
$$;
-- All operational tables are read-only to the client. Writes go through checked RPCs.
do $$ declare t text; begin
 foreach t in array array['profiles','drivers','coding_areas','company_settings','trucks','driver_truck_assignments','coding_rules','dispatches','delivery_status_logs','attendance','maintenance_reports','maintenance_schedules','notifications'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon, authenticated',t);
 execute format('grant select on public.%I to authenticated',t);
 end loop;end $$;
create policy profiles_read on public.profiles for select to authenticated using ((select private.role())='administrator' or (id=(select auth.uid()) and (select private.role()) is not null));
create policy drivers_read on public.drivers for select to authenticated using ((select private.role())='administrator' or (id=(select auth.uid()) and (select private.role()) is not null));
create policy trucks_read on public.trucks for select to authenticated using(private.has_truck(id));
create policy assignment_read on public.driver_truck_assignments for select to authenticated using((select private.role())='administrator' or (driver_id=(select auth.uid()) and (select private.role()) is not null));
create policy dispatch_read on public.dispatches for select to authenticated using((select private.role())='administrator' or (driver_id=(select auth.uid()) and (select private.role()) is not null));
create policy logs_read on public.delivery_status_logs for select to authenticated using(exists(select 1 from public.dispatches d where d.id=dispatch_id));
create policy attendance_read on public.attendance for select to authenticated using((select private.role())='administrator' or (driver_id=(select auth.uid()) and (select private.role()) is not null));
create policy report_read on public.maintenance_reports for select to authenticated using((select private.role())='administrator' or (reporter_id=(select auth.uid()) and (select private.role()) is not null));
create policy maintenance_read on public.maintenance_schedules for select to authenticated using(private.has_truck(truck_id));
create policy notifications_read on public.notifications for select to authenticated using(recipient_id=(select auth.uid()) and (select private.role()) is not null);
create policy settings_read on public.company_settings for select to authenticated using((select private.role()) is not null);
create policy areas_read on public.coding_areas for select to authenticated using((select private.role()) is not null);
create policy rules_read on public.coding_rules for select to authenticated using((select private.role()) is not null);

-- The single coding engine handles [start,end) windows, including overnight rules.
create function private.coding_restricted(plate_text text,area text,s timestamptz,e timestamptz) returns boolean
language plpgsql stable set search_path='' as $$
declare day date; r record; ws timestamp;we timestamp;digit text;
begin
 if s is null or e is null or e<=s or e-s>interval '31 days' then raise exception 'Choose an interval greater than zero and no longer than 31 days';end if;
 digit:=right(regexp_replace(upper(plate_text),'[^0-9]','','g'),1);
 for day in select generate_series((s at time zone 'Asia/Manila')::date-1,(e at time zone 'Asia/Manila')::date,interval '1 day')::date loop
  for r in select * from public.coding_rules where area_id=area and enabled and weekday=extract(dow from day)::int and position(digit in digits)>0 loop
   ws:=day+r.start_time;we:=day+r.end_time;
   if r.end_time<r.start_time then we:=we+interval '1 day';end if;
   if s<(we at time zone 'Asia/Manila') and e>(ws at time zone 'Asia/Manila') then return true;end if;
  end loop;
 end loop;return false;
end $$;
create function private.eligibility(t uuid,d uuid,area text,s timestamptz,e timestamptz,ignore_id uuid default null) returns text
language plpgsql stable security definer set search_path='' as $$
declare v public.trucks;
begin
 if auth.uid() is null or private.role() is null or not private.has_truck(t) then raise exception 'Not authorized';end if;
 select * into v from public.trucks where id=t;
 if not found or v.archived then return 'Truck is archived or unavailable';end if;
 if v.base_status='out_of_service' then return 'Out of Service';end if;
 if s is null or e is null or e<=s or e-s>interval '31 days' then return 'Choose a valid interval (maximum 31 days)';end if;
 if not exists(select 1 from public.coding_areas where id=area) then return 'Select a configured coding area';end if;
 if d is not null and not exists(select 1 from public.drivers dr join public.profiles p on p.id=dr.id where p.id=d and p.active and p.role='driver' and dr.license_expiry>=(s at time zone 'Asia/Manila')::date) then return 'Driver inactive, missing, or license expired';end if;
 if exists(select 1 from public.maintenance_reports where truck_id=t and priority in ('high','urgent') and review_state in ('submitted','reviewed'))
 or exists(select 1 from public.maintenance_schedules where truck_id=t and (status='in_progress' or (status='scheduled' and scheduled_at<e))) then return 'Under Maintenance';end if;
 if private.coding_restricted(v.plate,area,s,e) then return 'Coding Restriction';end if;
 if exists(select 1 from public.dispatches where truck_id=t and id is distinct from ignore_id and status not in ('delivered','cancelled') and ((starts_at<e and ends_at>s) or status in ('on_way','not_delivered') or ends_at<now())) then return 'Truck has an overlapping or unfinished dispatch';end if;
 if d is not null and exists(select 1 from public.dispatches where driver_id=d and id is distinct from ignore_id and status not in ('delivered','cancelled') and ((starts_at<e and ends_at>s) or status in ('on_way','not_delivered') or ends_at<now())) then return 'Driver has an overlapping or unfinished dispatch';end if;
 return null;
end $$;
create function public.check_eligibility(truck_id uuid,driver_id uuid,area_id text,starts_at timestamptz,ends_at timestamptz,ignore_id uuid default null)
returns jsonb language sql security invoker set search_path='' as $$
 select jsonb_build_object('reason',private.eligibility(truck_id,driver_id,area_id,starts_at,ends_at,ignore_id),'policy_configured',exists(select 1 from public.coding_rules where coding_rules.area_id=$3 and enabled));
$$;
create function public.check_coding(truck_id uuid,area_id text,starts_at timestamptz,ends_at timestamptz) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare plate_text text;begin
 select plate into plate_text from public.trucks where id=truck_id;
 if not found then raise exception 'Truck not accessible';end if;
 return jsonb_build_object('restricted',private.coding_restricted(plate_text,area_id,starts_at,ends_at),'policy_configured',exists(select 1 from public.coding_rules where coding_rules.area_id=$2 and enabled));
end $$;

create function private.mutate(action text,p jsonb,request_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();r text;tid uuid;did uuid;rid uuid;v public.dispatches; j public.maintenance_schedules; old text;
 out_json jsonb;cached private.requests;s timestamptz;e timestamptz;reason text;recipient uuid;title text;dest text;truck_row public.trucks;
begin
 -- A global write lock makes eligibility checks and writes serializable across all resource workflows.
 -- Appropriate for this small fleet; scale later to sorted per-resource locks.
 perform pg_advisory_xact_lock(73429106);
 r:=private.role();
 if u is null or r is null then raise exception 'Active authenticated account required';end if;
 if request_id is null then raise exception 'Request ID required';end if;
 select * into cached from private.requests where actor_id=u and private.requests.request_id=mutate.request_id;
 if found then
  if cached.action<>action or cached.payload<>p then raise exception 'Request ID was already used for another operation';end if;
  return cached.result;
 end if;
 if action not in ('time_in','time_out','delivery_status','report_issue','notification_read','profile_update') and r<>'administrator' then raise exception 'Administrator permission required';end if;
 case action
 when 'truck_save' then
  tid:=coalesce(nullif(p->>'id','')::uuid,gen_random_uuid());
  if exists(select 1 from public.trucks where id=tid) then
   if exists(select 1 from public.dispatches where truck_id=tid and status not in ('delivered','cancelled')) then raise exception 'Resolve active dispatches before changing vehicle details';end if;
  end if;
  insert into public.trucks(id,code,plate,truck_type,make,model,year,mileage,condition,engine_number,registration_expiry,base_status,last_maintenance,next_maintenance,notes)
  values(tid,coalesce(nullif(trim(p->>'code'),''),'TRK-'||upper(substr(tid::text,1,6))),regexp_replace(upper(p->>'plate'),'[^A-Z0-9]','','g'),p->>'truck_type',coalesce(p->>'make',''),coalesce(p->>'model',''),nullif(p->>'year','')::int,coalesce(nullif(p->>'mileage','')::numeric,0),coalesce(p->>'condition','Good'),coalesce(p->>'engine_number',''),nullif(p->>'registration_expiry','')::date,coalesce(p->>'base_status','available'),nullif(p->>'last_maintenance','')::date,nullif(p->>'next_maintenance','')::date,coalesce(p->>'notes',''))
  on conflict(id) do update set code=excluded.code,plate=excluded.plate,truck_type=excluded.truck_type,make=excluded.make,model=excluded.model,year=excluded.year,mileage=excluded.mileage,condition=excluded.condition,engine_number=excluded.engine_number,registration_expiry=excluded.registration_expiry,base_status=excluded.base_status,last_maintenance=excluded.last_maintenance,next_maintenance=excluded.next_maintenance,notes=excluded.notes;
  did:=nullif(p->>'driver_id','')::uuid;
  if did is not null and not exists(select 1 from public.drivers d join public.profiles q on q.id=d.id where d.id=did and q.active and q.role='driver') then raise exception 'Select an active driver';end if;
  if did is not null and exists(select 1 from public.driver_truck_assignments where driver_id=did and ends_at is null and truck_id<>tid) then raise exception 'Driver already has a regular truck. Unassign it first';end if;
  if not exists(select 1 from public.driver_truck_assignments where truck_id=tid and driver_id=did and ends_at is null) then
   update public.driver_truck_assignments set ends_at=now() where truck_id=tid and ends_at is null;
   if did is not null then insert into public.driver_truck_assignments(driver_id,truck_id) values(did,tid);end if;
  end if;
  rid:=tid;
 when 'truck_delete' then
  rid:=(p->>'id')::uuid;
  delete from public.trucks where id=rid; -- FK restrictions preserve referenced history.
  if not found then raise exception 'Truck not found';end if;
 when 'truck_archive' then
  rid:=(p->>'id')::uuid;
  if exists(select 1 from public.dispatches where truck_id=rid and status not in ('delivered','cancelled')) or exists(select 1 from public.maintenance_schedules where truck_id=rid and status in ('scheduled','in_progress')) or exists(select 1 from public.maintenance_reports where truck_id=rid and review_state in ('submitted','reviewed')) then raise exception 'Resolve active work before archiving';end if;
  update public.trucks set archived=true where id=rid;
  if not found then raise exception 'Truck not found';end if;
  update public.driver_truck_assignments set ends_at=now() where truck_id=rid and ends_at is null;
 when 'dispatch_save' then
  rid:=coalesce(nullif(p->>'id','')::uuid,gen_random_uuid());
  select * into v from public.dispatches where id=rid;
  if found and v.status<>'scheduled' then raise exception 'Only scheduled dispatches can be edited';end if;
  tid:=(p->>'truck_id')::uuid;did:=(p->>'driver_id')::uuid;s:=(p->>'starts_at')::timestamptz;e:=(p->>'ends_at')::timestamptz;
  if did is null then raise exception 'Select a driver';end if;
  reason:=private.eligibility(tid,did,p->>'area_id',s,e,rid);
  if reason is not null then raise exception '%',reason;end if;
  insert into public.dispatches(id,code,driver_id,truck_id,area_id,starts_at,ends_at,client,pickup,destination,pickup_lon,pickup_lat,destination_lon,destination_lat,notes)
  values(rid,coalesce(nullif(trim(p->>'code'),''),'DSP-'||upper(substr(rid::text,1,8))),did,tid,p->>'area_id',s,e,p->>'client',p->>'pickup',p->>'destination',nullif(p->>'pickup_lon','')::float,nullif(p->>'pickup_lat','')::float,nullif(p->>'destination_lon','')::float,nullif(p->>'destination_lat','')::float,coalesce(p->>'notes',''))
  on conflict(id) do update set code=excluded.code,driver_id=excluded.driver_id,truck_id=excluded.truck_id,area_id=excluded.area_id,starts_at=excluded.starts_at,ends_at=excluded.ends_at,client=excluded.client,pickup=excluded.pickup,destination=excluded.destination,pickup_lon=excluded.pickup_lon,pickup_lat=excluded.pickup_lat,destination_lon=excluded.destination_lon,destination_lat=excluded.destination_lat,notes=excluded.notes,updated_at=now();
  if v.id is null then insert into public.delivery_status_logs(dispatch_id,new_status,actor_id) values(rid,'scheduled',u);end if;
  recipient:=did;title:='Dispatch assignment updated';dest:='delivery-status';
 when 'dispatch_cancel' then
  rid:=(p->>'id')::uuid;select * into v from public.dispatches where id=rid for update;
  if not found then raise exception 'Dispatch not found';end if;
  if v.status='delivered' then raise exception 'Delivered trips cannot be cancelled';end if;
  if v.status<>'cancelled' then
   update public.dispatches set status='cancelled',updated_at=now() where id=rid;
   insert into public.delivery_status_logs(dispatch_id,old_status,new_status,actor_id) values(rid,v.status,'cancelled',u);
  end if;
  recipient:=v.driver_id;title:='Dispatch cancelled';dest:='delivery-status';
 when 'delivery_status' then
  rid:=(p->>'id')::uuid;select * into v from public.dispatches where id=rid for update;
  if not found or (r<>'administrator' and v.driver_id<>u) then raise exception 'Assignment not accessible';end if;
  old:=p->>'status';
  if old not in ('on_way','delivered','not_delivered') or old is null then raise exception 'Invalid delivery status';end if;
  if v.status=old then
   out_json:=jsonb_build_object('id',rid,'ok',true);
   insert into private.requests(actor_id,request_id,action,payload,result) values(u,request_id,action,p,out_json);
   return out_json;
  elsif (v.status in ('scheduled','not_delivered') and old='on_way') or (v.status='on_way' and old in ('delivered','not_delivered')) then
   if old='on_way' then
    s:=least(v.starts_at,now());e:=greatest(v.ends_at,now()+interval '1 hour');
    reason:=private.eligibility(v.truck_id,v.driver_id,v.area_id,s,e,v.id);
    if reason is not null then raise exception '%',reason;end if;
   end if;
   update public.dispatches set status=old,updated_at=now() where id=rid;
   insert into public.delivery_status_logs(dispatch_id,old_status,new_status,actor_id) values(rid,v.status,old,u);
  else raise exception 'Invalid transition: % to %',v.status,old;
  end if;
  recipient:=v.driver_id;title:='Delivery: '||replace(old,'_',' ');dest:='delivery-status';
 when 'time_in' then
  if r<>'driver' then raise exception 'Driver account required';end if;
  select id into rid from public.attendance where driver_id=u and time_out is null;
  if rid is null then insert into public.attendance(driver_id) values(u) returning id into rid;title:='Driver timed in';dest:='attendance';end if;
 when 'time_out' then
  if r<>'driver' then raise exception 'Driver account required';end if;
  update public.attendance set time_out=now() where driver_id=u and time_out is null returning id into rid;
  if rid is null then raise exception 'No active shift';end if;
  title:='Driver timed out';dest:='attendance';
 when 'report_issue' then
  if r<>'driver' then raise exception 'Driver account required';end if;
  tid:=(p->>'truck_id')::uuid;
  if not private.current_truck(tid) or not exists(select 1 from public.trucks where id=tid and not archived) then raise exception 'Current assigned truck required';end if;
  if nullif(p->>'photo_path','') is not null and (split_part(p->>'photo_path','/',1)<>u::text or not exists(select 1 from storage.objects where bucket_id='maintenance-images' and name=p->>'photo_path')) then raise exception 'Upload the private attachment first';end if;
  insert into public.maintenance_reports(truck_id,reporter_id,category,description,priority,location,photo_path)
  values(tid,u,p->>'category',p->>'description',p->>'priority',coalesce(p->>'location',''),nullif(p->>'photo_path','')) returning id into rid;
  title:='New maintenance report';dest:='maintenance';
 when 'report_review' then
  rid:=(p->>'id')::uuid;
  if p->>'review_state' not in ('reviewed','resolved','dismissed') then raise exception 'Invalid review state';end if;
  if p->>'review_state' in ('resolved','dismissed') and length(trim(coalesce(p->>'resolution','')))<5 then raise exception 'Provide a resolution or dismissal reason';end if;
  if p->>'review_state' in ('resolved','dismissed') and exists(select 1 from public.maintenance_schedules where report_id=rid and status in ('scheduled','in_progress')) then raise exception 'Complete or cancel linked service work first';end if;
  update public.maintenance_reports set review_state=p->>'review_state',resolution=coalesce(p->>'resolution',''),updated_at=now() where id=rid returning reporter_id into recipient;
  if not found then raise exception 'Report not found';end if;
  title:='Maintenance report reviewed';dest:='maintenance';
 when 'maintenance_save' then
  rid:=coalesce(nullif(p->>'id','')::uuid,gen_random_uuid());
  select * into j from public.maintenance_schedules where id=rid;
  if found and j.status in ('completed','cancelled') then raise exception 'Completed work is immutable';end if;
  tid:=(p->>'truck_id')::uuid;
  if not exists(select 1 from public.trucks where id=tid and not archived) then raise exception 'Select an active truck';end if;
  s:=(p->>'scheduled_at')::timestamptz;e:=(p->>'ends_at')::timestamptz;
  if p->>'status' not in ('scheduled','in_progress','completed','cancelled') then raise exception 'Invalid service status';end if;
  if p->>'status' in ('scheduled','in_progress') and exists(select 1 from public.dispatches where truck_id=tid and status not in ('delivered','cancelled') and (ends_at>s or status in ('on_way','not_delivered'))) then raise exception 'Cancel or complete conflicting dispatches first';end if;
  if nullif(p->>'report_id','') is not null and not exists(select 1 from public.maintenance_reports where id=(p->>'report_id')::uuid and truck_id=tid and review_state in ('submitted','reviewed')) then raise exception 'Select an open report for this truck';end if;
  if p->>'status'='completed' and length(trim(coalesce(p->>'notes','')))<5 then raise exception 'Describe completed repairs';end if;
  insert into public.maintenance_schedules(id,truck_id,report_id,service_type,scheduled_at,ends_at,priority,status,mechanic,notes,cost,completed_at)
  values(rid,tid,nullif(p->>'report_id','')::uuid,p->>'service_type',s,e,p->>'priority',p->>'status',coalesce(p->>'mechanic',''),coalesce(p->>'notes',''),coalesce(nullif(p->>'cost','')::numeric,0),case when p->>'status'='completed' then now() end)
  on conflict(id) do update set truck_id=excluded.truck_id,report_id=excluded.report_id,service_type=excluded.service_type,scheduled_at=excluded.scheduled_at,ends_at=excluded.ends_at,priority=excluded.priority,status=excluded.status,mechanic=excluded.mechanic,notes=excluded.notes,cost=excluded.cost,completed_at=excluded.completed_at;
  if p->>'status'='completed' then
   update public.trucks set last_maintenance=(now() at time zone 'Asia/Manila')::date,next_maintenance=coalesce(nullif(p->>'next_maintenance','')::date,next_maintenance) where id=tid;
   update public.maintenance_reports set review_state='resolved',resolution=p->>'notes',updated_at=now() where id=nullif(p->>'report_id','')::uuid returning reporter_id into recipient;
  elsif p->>'status' in ('scheduled','in_progress') then
   update public.maintenance_reports set review_state='reviewed',updated_at=now() where id=nullif(p->>'report_id','')::uuid returning reporter_id into recipient;
  end if;
  title:='Maintenance work updated';dest:='maintenance';
 when 'coding_save' then
  rid:=coalesce(nullif(p->>'id','')::uuid,gen_random_uuid());
  insert into public.coding_rules(id,area_id,weekday,digits,start_time,end_time,enabled) values(rid,p->>'area_id',(p->>'weekday')::int,regexp_replace(p->>'digits','[^0-9]','','g'),(p->>'start_time')::time,(p->>'end_time')::time,coalesce((p->>'enabled')::boolean,false))
  on conflict(id) do update set area_id=excluded.area_id,weekday=excluded.weekday,digits=excluded.digits,start_time=excluded.start_time,end_time=excluded.end_time,enabled=excluded.enabled;
 when 'area_save' then
  insert into public.coding_areas(id,name) values(p->>'id',p->>'name') on conflict(id) do update set name=excluded.name;
 when 'settings_save' then
  update public.company_settings set company_name=p->>'company_name',email=coalesce(p->>'email',''),phone=coalesce(p->>'phone',''),address=coalesce(p->>'address',''),owner_name=coalesce(p->>'owner_name',''),owner_phone=coalesce(p->>'owner_phone',''),default_area=p->>'default_area',due_soon_days=(p->>'due_soon_days')::int,default_dispatch_hours=(p->>'default_dispatch_hours')::int where id;
 when 'driver_active' then
  rid:=(p->>'id')::uuid;
  if exists(select 1 from public.dispatches where driver_id=rid and status not in ('delivered','cancelled')) or exists(select 1 from public.attendance where driver_id=rid and time_out is null) then raise exception 'Resolve active dispatches and attendance before deactivation';end if;
  update public.profiles set active=(p->>'active')::boolean where id=rid and role='driver';
  if not found then raise exception 'Driver not found';end if;
  if not (p->>'active')::boolean then update public.driver_truck_assignments set ends_at=now() where driver_id=rid and ends_at is null;end if;
 when 'profile_update' then
  update public.profiles set full_name=p->>'full_name',phone=coalesce(p->>'phone','') where id=u;rid:=u;
 when 'notification_read' then
  rid:=(p->>'id')::uuid;update public.notifications set read_at=coalesce(read_at,now()) where id=rid and recipient_id=u;
 else raise exception 'Unknown operation';
 end case;
 if title is not null then
  insert into public.notifications(recipient_id,title,destination,event_key)
  select id,title,'/admin/'||case when dest='delivery-status' then 'dispatch' else dest end||'.html',request_id::text from public.profiles where role='administrator' and active
  on conflict(recipient_id,event_key) do nothing;
  if recipient is not null then
   insert into public.notifications(recipient_id,title,destination,event_key) values(recipient,title,'/driver/'||dest||'.html',request_id::text) on conflict(recipient_id,event_key) do nothing;
  end if;
 end if;
 out_json:=jsonb_build_object('id',rid,'ok',true);
 insert into private.requests(actor_id,request_id,action,payload,result) values(u,request_id,action,p,out_json);
 return out_json;
end $$;
create function public.perform_action(action text,payload jsonb,request_id uuid) returns jsonb
language sql security invoker set search_path='' as $$ select private.mutate(action,payload,request_id); $$;
-- Only the account Edge Function/service role can provision a profile. Caller verified there.
create function public.provision_driver(user_id uuid,full_name text,phone text,license_number text,license_expiry date)
returns void language plpgsql security invoker set search_path='' as $$ begin
 insert into public.profiles(id,role,full_name,phone) values(user_id,'driver',full_name,coalesce(phone,''));
 insert into public.drivers(id,license_number,license_expiry) values(user_id,license_number,license_expiry);
end $$;
revoke all on all functions in schema private from public,anon,authenticated;
grant execute on function private.role(),private.has_truck(uuid),private.current_truck(uuid),private.coding_restricted(text,text,timestamptz,timestamptz),private.eligibility(uuid,uuid,text,timestamptz,timestamptz,uuid),private.mutate(text,jsonb,uuid) to authenticated;
revoke all on function public.perform_action(text,jsonb,uuid),public.check_eligibility(uuid,uuid,text,timestamptz,timestamptz,uuid),public.check_coding(uuid,text,timestamptz,timestamptz),public.provision_driver(uuid,text,text,text,date) from public,anon,authenticated;
grant execute on function public.perform_action(text,jsonb,uuid),public.check_eligibility(uuid,uuid,text,timestamptz,timestamptz,uuid),public.check_coding(uuid,text,timestamptz,timestamptz) to authenticated;
grant execute on function public.provision_driver(uuid,text,text,text,date) to service_role;
grant all on all tables in schema public to service_role;

-- Aggregate only the operational state, without disclosing other drivers' reports.
create function private.truck_state(t uuid) returns text language plpgsql stable security definer set search_path='' as $$
declare v public.trucks;begin
 if auth.uid() is null or not private.has_truck(t) then raise exception 'Truck not accessible';end if;
 select * into v from public.trucks where id=t;
 if v.archived then return 'archived';end if;
 if v.base_status='out_of_service' then return 'out_of_service';end if;
 if exists(select 1 from public.maintenance_reports where truck_id=t and priority in ('high','urgent') and review_state in ('submitted','reviewed')) or exists(select 1 from public.maintenance_schedules where truck_id=t and (status='in_progress' or (status='scheduled' and scheduled_at<=now()))) then return 'under_maintenance';end if;
 if exists(select 1 from public.dispatches where truck_id=t and status in ('on_way','not_delivered')) then return 'on_delivery';end if;
 return 'available';end $$;
create function public.truck_state(truck_id uuid) returns text language sql stable security invoker set search_path='' as $$ select private.truck_state(truck_id); $$;
revoke all on function private.truck_state(uuid),public.truck_state(uuid) from public,anon,authenticated;
grant execute on function private.truck_state(uuid),public.truck_state(uuid) to authenticated;

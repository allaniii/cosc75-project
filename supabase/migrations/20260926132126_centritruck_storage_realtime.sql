insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('maintenance-images','maintenance-images',false,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create policy maintenance_image_read on storage.objects for select to authenticated using(bucket_id='maintenance-images' and (select private.role()) is not null and ((select private.role())='administrator' or (storage.foldername(name))[1]=(select auth.uid())::text));
-- Uploads go through the authenticated maintenance-photo Edge Function, which validates content.
-- Clients cannot replace an uploaded object or delete report evidence.
-- An abandoned upload can be removed by a trusted project owner after checking report references.
do $$ declare t text; begin
 foreach t in array array['profiles','trucks','driver_truck_assignments','dispatches','delivery_status_logs','attendance','maintenance_reports','maintenance_schedules','notifications','company_settings','coding_rules','coding_areas'] loop
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=t) then
   execute format('alter publication supabase_realtime add table public.%I',t);
  end if;
 end loop;
end $$;

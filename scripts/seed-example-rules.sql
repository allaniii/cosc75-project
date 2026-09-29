-- Optional illustrative data ONLY. Disabled until independently verified.
-- No claim is made that these times are current law.
insert into public.coding_rules(area_id,weekday,digits,start_time,end_time,enabled)
select 'metro-manila',v.day,v.digits,'07:00'::time,'10:00'::time,false
from (values (1,'12'),(2,'34'),(3,'56'),(4,'78'),(5,'90')) v(day,digits);

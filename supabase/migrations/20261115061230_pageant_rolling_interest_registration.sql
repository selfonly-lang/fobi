-- An explicitly configured, free interest campaign can accept entries while it
-- is open, without inventing an event day or signup deadline. Normal event
-- registration retains its existing closing-time rules and row lock.
create or replace function public.pageant_register_free(p_actor uuid,p_activity uuid,p_profile jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.pageant_activities;p public.pageant_projects;r public.pageant_registrations;n integer;
begin
 select * into a from public.pageant_activities where id=p_activity for update;
 if not found then raise exception 'activity_not_found';end if;
 select * into p from public.pageant_projects where id=a.project_id;
 if a.status<>'open' or a.amount<>0 or p.review_status<>'approved' or not p.public
   or p.status in('closed','archived') or a.starts_at is null then
   raise exception 'activity_not_on_sale';
 end if;
 if coalesce(a.config->>'registration_mode','')='interest' then
   if a.starts_at>now() or (a.ends_at is not null and a.ends_at<=now()) then
     raise exception 'activity_not_on_sale';
   end if;
 elsif coalesce(a.ends_at,a.starts_at)<=now() then
   raise exception 'activity_not_on_sale';
 end if;
 select * into r from public.pageant_registrations where activity_id=a.id and user_id=p_actor;
 if found then return to_jsonb(r);end if;
 select ((select count(*) from public.pageant_registrations where activity_id=a.id and status in('pending','approved','attended'))+
 (select count(*) from public.pageant_admissions t join public.pageant_commerce_orders o on o.id=t.order_id where o.activity_id=a.id and t.status in('valid','held','used'))+
 coalesce((select sum(quantity)from public.pageant_commerce_orders where activity_id=a.id and status='pending' and expires_at>now()),0))::integer into n;
 if a.capacity>0 and n>=a.capacity then raise exception 'sold_out';end if;
 insert into public.pageant_registrations(activity_id,user_id,profile)values(a.id,p_actor,p_profile)returning *into r;
 return to_jsonb(r);
end;$$;
revoke all on function public.pageant_register_free(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.pageant_register_free(uuid,uuid,jsonb) to service_role;

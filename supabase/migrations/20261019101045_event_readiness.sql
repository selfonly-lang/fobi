-- Preserve existing venue and members. MAIN and VIP share admission; AFTERPARTY is separate.
revoke all on function public.fobi_mark_order_paid(text,text,text,timestamptz,text,jsonb) from public,anon,authenticated;
grant execute on function public.fobi_mark_order_paid(text,text,text,timestamptz,text,jsonb) to service_role;
create or replace function public.fobi_checkin_ticket(p_qr uuid,p_gate text default 'MAIN',p_note text default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare t public.fobi_tickets%rowtype; g text:=upper(trim(coalesce(p_gate,''))); grp text;
begin
 if g not in ('MAIN','VIP','AFTERPARTY') then return jsonb_build_object('ok',false,'error','invalid_gate'); end if;
 select * into t from public.fobi_tickets where qr_token=p_qr for update;
 if not found then return jsonb_build_object('ok',false,'error','ticket_not_found'); end if;
 if t.status='void' then return jsonb_build_object('ok',false,'error','ticket_void'); end if;
 if not exists(select 1 from public.fobi_orders where id=t.order_id and payment_status='paid') then return jsonb_build_object('ok',false,'error','order_not_paid'); end if;
 if g='VIP' and replace(upper(t.ticket_type),' ','') not in ('VIP1','VIP2','VIP3') then return jsonb_build_object('ok',false,'error','vip_not_entitled'); end if;
 if g='AFTERPARTY' and not t.afterparty_entitlement then return jsonb_build_object('ok',false,'error','afterparty_not_entitled'); end if;
 grp:=case when g='AFTERPARTY' then 'AFTERPARTY' else 'ADMISSION' end;
 if exists(select 1 from public.fobi_checkins where ticket_id=t.id and
   (case when gate='AFTERPARTY' then 'AFTERPARTY' else 'ADMISSION' end)=grp)
   or (grp='ADMISSION' and t.status='checked_in') then
   return jsonb_build_object('ok',false,'error','already_checked_in','ticket_no',t.ticket_no,'gate',g);
 end if;
 if grp='ADMISSION' then update public.fobi_tickets set status='checked_in',checked_in_at=now(),updated_at=now() where id=t.id; end if;
 insert into public.fobi_checkins(order_id,ticket_id,gate,staff_note) values(t.order_id,t.id,g,left(coalesce(p_note,''),300));
 return jsonb_build_object('ok',true,'ticket_no',t.ticket_no,'holder_name',t.holder_name,'ticket_type',t.ticket_type,'gate',g,'afterparty',t.afterparty_entitlement);
end $$;
revoke all on function public.fobi_checkin_ticket(uuid,text,text) from public,anon,authenticated;
grant execute on function public.fobi_checkin_ticket(uuid,text,text) to service_role;
-- Normalize sponsor tier during issuance; keep the existing trigger and serial sequence.
CREATE OR REPLACE FUNCTION public.fobi_issue_tickets_on_paid_order()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare i public.fobi_interests%rowtype; n int; s bigint; j int; t text; ap boolean; tt text;
begin
 if new.payment_status='paid' and old.payment_status is distinct from 'paid' then
   select * into i from public.fobi_interests where id=new.interest_id;
   if found and not exists(select 1 from public.fobi_tickets where order_id=new.id) then
     if new.type='sponsor' then
       tt:=replace(upper(coalesce(i.tier,'VIP3')),' ','');
       select included_count,afterparty_enabled into n,ap from public.fobi_ticket_settings where event_code='FB26-01' and ticket_type=tt and active=true;
       n:=coalesce(n,10); ap:=coalesce(ap,false);
     elsif new.type='member' then
       tt:='MEMBER'; n:=greatest(1,least(coalesce(i.member_count,1),20));
       select afterparty_enabled into ap from public.fobi_ticket_settings where event_code='FB26-01' and ticket_type='MEMBER' and active=true;
       ap:=coalesce(ap,true);
     else return new;
     end if;
     for j in 1..n loop
       s:=nextval('public.fobi_ticket_serial_seq');
       t:='FB26-01-'||lpad(s::text,6,'0');
       insert into public.fobi_tickets(order_id,interest_id,ticket_no,serial_no,holder_name,ticket_type,sponsor_tier,company,country_code,afterparty_entitlement)
       values(new.id,new.interest_id,t,s,i.contact_name,tt,case when new.type='sponsor' then tt end,i.company,i.country_code,ap);
       if j=1 then new.ticket_serial_start:=s; end if; new.ticket_serial_end:=s;
     end loop;
     new.ticket_count:=n;
   end if;
 end if;
 return new;
end $function$

;

-- Settings are administered through fobi-admin, never directly by public clients.
alter table public.fobi_ticket_settings enable row level security;
revoke all on public.fobi_ticket_settings from anon,authenticated;
grant all on public.fobi_ticket_settings to service_role;

-- Replace legacy one-checkin-per-ticket index with one-checkin-per-entitlement.
drop index if exists public.fobi_checkins_ticket_once;
create unique index if not exists fobi_checkins_ticket_gate_once on public.fobi_checkins
(ticket_id,(case when gate='AFTERPARTY' then 'AFTERPARTY' else 'ADMISSION' end))
where ticket_id is not null;

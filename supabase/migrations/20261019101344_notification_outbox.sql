-- Draft only: pending confirmed sender configuration and deployment authorization.
create table if not exists public.fobi_notification_outbox (
 id uuid primary key default gen_random_uuid(),
 order_id uuid not null references public.fobi_orders(id) on delete cascade,
 channel text not null check(channel in ('email','line')),
 event text not null default 'payment_ticket',
 status text not null default 'pending' check(status in ('pending','sending','sent','failed','blocked')),
 attempts integer not null default 0,
 provider_id text,
 last_error text,
 created_at timestamptz not null default now(),
 sent_at timestamptz,
 unique(order_id,channel,event)
);
alter table public.fobi_notification_outbox enable row level security;
revoke all on public.fobi_notification_outbox from anon,authenticated;
grant all on public.fobi_notification_outbox to service_role;
create or replace function public.fobi_enqueue_payment_notice()
returns trigger language plpgsql security definer set search_path=public as $$
begin
 if new.payment_status='paid' and old.payment_status is distinct from 'paid' then
  insert into public.fobi_notification_outbox(order_id,channel)
  values(new.id,'email') on conflict(order_id,channel,event) do nothing;
 end if;
 return new;
end $$;
revoke all on function public.fobi_enqueue_payment_notice() from public,anon,authenticated;
create trigger trg_fobi_notification_paid after update on public.fobi_orders
for each row execute function public.fobi_enqueue_payment_notice();
-- LINE is not enqueued until a verified recipient user ID binding exists.
-- No network dispatch occurs from this trigger.

create table public.fobi_party_orders (
 id uuid primary key default gen_random_uuid(),
 order_no text unique not null,
 idempotency_key uuid unique not null,
 event_id text not null default 'halloween-20261031' check(event_id='halloween-20261031'),
 contact_name text not null,
 phone text not null,
 email text not null,
 quantity integer not null check(quantity between 1 and 10),
 amount integer not null check(amount=quantity*2500),
 currency text not null default 'TWD' check(currency='TWD'),
 payment_status text not null default 'pending' check(payment_status in ('pending','paid','refunded')),
 ecpay_trade_no text unique not null,
 payment_meta jsonb,
 paid_at timestamptz,
 created_at timestamptz not null default now()
);
alter table public.fobi_party_orders enable row level security;
revoke all on public.fobi_party_orders from public,anon,authenticated;
grant select,insert,update on public.fobi_party_orders to service_role;
comment on table public.fobi_party_orders is 'FOBI Halloween party 2026-10-31, independent from grand-final tickets; server-only access.';

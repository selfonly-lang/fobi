create table if not exists public.pageant_project_requests (
 id uuid primary key default gen_random_uuid(),
 reference text unique not null,
 idempotency_key uuid unique not null,
 role text not null check(role in ('organizer','participant','sponsor','media')),
 kind text not null check(kind in ('recruitment','training','exposure','tickets','sponsors','media')),
 event_name text not null,
 contact_name text not null,
 phone text not null,
 email text not null,
 event_date date,
 location text,
 budget text not null,
 scale text,
 services text[] not null check(services <@ array['recruitment','training','exposure','tickets','sponsors','media']::text[]),
 message text not null,
 consent boolean not null check(consent),
 status text not null default 'received' check(status in ('received','contacted','confirmed','closed')),
 admin_note text,
 updated_by uuid,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.pageant_project_requests enable row level security;
revoke all on public.pageant_project_requests from public,anon,authenticated;
grant select,insert,update on public.pageant_project_requests to service_role;
create index if not exists pageant_project_requests_email_created on public.pageant_project_requests(email,created_at desc);
create index if not exists pageant_project_requests_created on public.pageant_project_requests(created_at desc);
comment on table public.pageant_project_requests is 'Private project intake; public submission and authenticated admin handling through Edge Functions only.';
update public.pageant_events set status='archived',applications_enabled=false,updated_at=now() where slug='fobi-2026';
create policy "service role private project access" on public.pageant_project_requests for all to service_role using(true) with check(true);

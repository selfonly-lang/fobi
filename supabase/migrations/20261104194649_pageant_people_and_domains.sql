alter table public.pageant_brands add column domain_status text not null default 'pending' check(domain_status in('pending','verified'));
update public.pageant_brands set domain_status='verified' where slug='fobi';
alter table public.pageant_projects add column country_code text not null default 'TW' check(country_code ~ '^[A-Z]{2}$');
alter table public.pageant_project_members drop constraint pageant_project_members_role_check;
alter table public.pageant_project_members add constraint pageant_project_members_role_check check(role in('manager','editor','reviewer','viewer','judge','finance','checkin'));
alter table public.pageant_staff drop constraint pageant_staff_role_check;
alter table public.pageant_staff add constraint pageant_staff_role_check check(role in('owner','manager','editor','reviewer','viewer','finance'));
create table public.pageant_invites (
 id uuid primary key default gen_random_uuid(),project_id uuid not null references public.pageant_projects(id),role text not null check(role in('manager','editor','reviewer','viewer','judge','finance','checkin')),token_hash text not null unique,
 created_by uuid not null references auth.users(id),accepted_by uuid references auth.users(id),expires_at timestamptz not null default now()+interval '7 days',revoked_at timestamptz,created_at timestamptz not null default now()
);
create index pageant_invites_project on public.pageant_invites(project_id);create index pageant_invites_creator on public.pageant_invites(created_by);create index pageant_invites_acceptor on public.pageant_invites(accepted_by);
create table public.pageant_contestants (
 id uuid primary key default gen_random_uuid(),project_id uuid not null references public.pageant_projects(id),user_id uuid references auth.users(id),source_registration uuid references public.pageant_registrations(id),name text not null,country text not null default '',bio text not null default '',photo text not null default '',public_consent boolean not null default false,status text not null default 'draft' check(status in('draft','approved','rejected')),version integer not null default 1,created_by uuid references auth.users(id),created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create index pageant_contestants_project on public.pageant_contestants(project_id);create index pageant_contestants_user on public.pageant_contestants(user_id);create index pageant_contestants_registration on public.pageant_contestants(source_registration);create index pageant_contestants_creator on public.pageant_contestants(created_by);
create table public.pageant_judge_assignments (
 activity_id uuid not null references public.pageant_activities(id),user_id uuid not null references auth.users(id),created_at timestamptz not null default now(),primary key(activity_id,user_id)
);
create index pageant_judge_user on public.pageant_judge_assignments(user_id);
create table public.pageant_scores (
 id uuid primary key default gen_random_uuid(),activity_id uuid not null references public.pageant_activities(id),contestant_id uuid not null references public.pageant_contestants(id),judge_id uuid not null references auth.users(id),scores jsonb not null,total numeric(6,2)not null check(total between 0 and 100),note text not null default '',submitted boolean not null default false,version integer not null default 1,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(activity_id,contestant_id,judge_id)
);
create index pageant_scores_contestant on public.pageant_scores(contestant_id);create index pageant_scores_judge on public.pageant_scores(judge_id);
create table public.pageant_results (
 activity_id uuid primary key references public.pageant_activities(id),project_id uuid not null references public.pageant_projects(id),snapshot jsonb not null,published_by uuid not null references auth.users(id),published_at timestamptz not null default now()
);
create index pageant_results_project on public.pageant_results(project_id);create index pageant_results_publisher on public.pageant_results(published_by);
create table public.pageant_invoice_records (
 id uuid primary key default gen_random_uuid(),order_id uuid not null unique references public.pageant_commerce_orders(id),status text not null default 'pending'check(status in('pending','issued','void')),invoice_no text,proof_asset_id uuid references public.pageant_assets(id),source text not null default 'manual',created_by uuid references auth.users(id),updated_at timestamptz not null default now()
);
create index pageant_invoice_proof on public.pageant_invoice_records(proof_asset_id);create index pageant_invoice_creator on public.pageant_invoice_records(created_by);
alter table public.pageant_commerce_orders add column buyer_info jsonb not null default '{}';
do $$declare t text;begin foreach t in array array['pageant_invites','pageant_contestants','pageant_judge_assignments','pageant_scores','pageant_results','pageant_invoice_records']loop execute format('alter table public.%I enable row level security',t);execute format('revoke all on public.%I from anon,authenticated',t);end loop;end$$;
create function public.pageant_accept_invite(p_hash text,p_actor uuid)returns uuid language plpgsql security definer set search_path='' as $$
declare i public.pageant_invites;begin
 select*into i from public.pageant_invites where token_hash=p_hash for update;
 if not found or i.expires_at<=now()or i.revoked_at is not null or i.accepted_by is not null then raise exception 'invite_unavailable';end if;
 insert into public.pageant_project_members(project_id,user_id,role)values(i.project_id,p_actor,i.role)on conflict(project_id,user_id)do nothing;
 update public.pageant_invites set accepted_by=p_actor where id=i.id;return i.project_id;
end;$$;
revoke all on function public.pageant_accept_invite(text,uuid)from public,anon,authenticated;grant execute on function public.pageant_accept_invite(text,uuid)to service_role;

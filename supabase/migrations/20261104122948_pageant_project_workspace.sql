-- Pageant workspaces: private operational data; publications are immutable snapshots.
create table public.pageant_staff (
 user_id uuid primary key references auth.users(id) on delete cascade,
 role text not null check(role in ('owner','manager','editor','reviewer','viewer')),
 display_name text not null default '', created_at timestamptz not null default now()
);
insert into public.pageant_staff(user_id,role,display_name)
 select user_id,'owner','SELF 管理員' from public.she_staff_roles where role='super_admin';
create table public.pageant_projects (
 id uuid primary key default gen_random_uuid(), slug text not null unique check(slug ~ '^[a-z0-9][a-z0-9-]{1,79}$'),
 title text not null check(length(title) between 1 and 200), status text not null default 'planning' check(status in ('planning','recruiting','active','closed','archived')),
 event_id uuid references public.pageant_events(id), event_date date, venue text not null default '', domain text not null default '', summary text not null default '',
 public boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),version integer not null default 1
);
create table public.pageant_project_members (
 project_id uuid not null references public.pageant_projects(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 role text not null check(role in ('manager','editor','reviewer','viewer')), primary key(project_id,user_id)
);
create table public.pageant_work_items (
 id uuid primary key default gen_random_uuid(), project_id uuid not null references public.pageant_projects(id) on delete cascade,
 kind text not null check(kind in ('task','recruitment','training','sponsor','media','schedule','closeout')),
 stage text not null default 'planning', title text not null check(length(title) between 1 and 200),
 status text not null default 'todo' check(status in ('todo','doing','blocked','done','cancelled')),
 owner_id uuid references auth.users(id), due_at timestamptz, payload jsonb not null default '{}',
 created_by uuid references auth.users(id),version integer not null default 1,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create index pageant_work_project_kind on public.pageant_work_items(project_id,kind,stage);
create table public.pageant_articles (
 id uuid primary key default gen_random_uuid(), project_id uuid not null references public.pageant_projects(id),
 slug text not null unique check(slug ~ '^[a-z0-9][a-z0-9-]{1,119}$'),
 title text not null check(length(title) between 1 and 240),
 status text not null default 'draft' check(status in ('draft','review','approved','scheduled','published','withdrawn')),
 content jsonb not null default '{}', publication jsonb, publish_at timestamptz,
 version integer not null default 1, created_by uuid references auth.users(id), updated_by uuid references auth.users(id),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create index pageant_articles_project on public.pageant_articles(project_id,status,publish_at);
create table public.pageant_article_versions (
 id bigint generated always as identity primary key, article_id uuid not null references public.pageant_articles(id),
 version integer not null, snapshot jsonb not null, actor_id uuid references auth.users(id), created_at timestamptz not null default now(),unique(article_id,version)
);
create table public.pageant_workspace_audit (
 id bigint generated always as identity primary key, project_id uuid references public.pageant_projects(id),
 actor_id uuid references auth.users(id), action text not null, entity_id uuid, detail jsonb not null default '{}', created_at timestamptz not null default now()
);
create index pageant_audit_project_time on public.pageant_workspace_audit(project_id,created_at desc);
create table public.pageant_assets (
 id uuid primary key default gen_random_uuid(), project_id uuid not null references public.pageant_projects(id),
 object_path text not null unique, filename text not null, mime text not null, bytes integer not null check(bytes between 1 and 12582912),
 caption text not null default '', source text not null default '', created_by uuid references auth.users(id),created_at timestamptz not null default now()
);
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('pageant-editorial','pageant-editorial',false,12582912,array['image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
-- All access is mediated by pageant-workspace, with verified users and per-project roles.
alter table public.pageant_staff enable row level security;
alter table public.pageant_projects enable row level security;
alter table public.pageant_project_members enable row level security;
alter table public.pageant_work_items enable row level security;
alter table public.pageant_articles enable row level security;
alter table public.pageant_article_versions enable row level security;
alter table public.pageant_workspace_audit enable row level security;
alter table public.pageant_assets enable row level security;
revoke all on public.pageant_staff,public.pageant_projects,public.pageant_project_members,public.pageant_work_items,public.pageant_articles,public.pageant_article_versions,public.pageant_workspace_audit,public.pageant_assets from anon,authenticated;
-- Version snapshots and audit share the write's transaction.
create function public.pageant_record_change() returns trigger language plpgsql security definer set search_path = '' as $$
begin
 if tg_table_name='pageant_articles' then
 insert into public.pageant_article_versions(article_id,version,snapshot,actor_id) values(new.id,new.version,to_jsonb(new),new.updated_by);
 end if;
 insert into public.pageant_workspace_audit(project_id,actor_id,action,entity_id,detail)
 values(case when tg_table_name='pageant_projects' then new.id else (to_jsonb(new)->>'project_id')::uuid end,
 coalesce((to_jsonb(new)->>'updated_by')::uuid,(to_jsonb(new)->>'created_by')::uuid),
 lower(tg_op)||':'||tg_table_name,new.id,jsonb_build_object('version',new.version,'title',new.title));
 return new;
end; $$;
revoke all on function public.pageant_record_change() from public,anon,authenticated;
create function public.pageant_increment_version() returns trigger language plpgsql set search_path='' as $$
begin new.version=old.version+1;new.updated_at=now();return new;end;$$;
revoke all on function public.pageant_increment_version() from public,anon,authenticated;
create trigger pageant_projects_version before update on public.pageant_projects for each row execute function public.pageant_increment_version();
create trigger pageant_items_version before update on public.pageant_work_items for each row execute function public.pageant_increment_version();
create trigger pageant_articles_version before update on public.pageant_articles for each row execute function public.pageant_increment_version();
create trigger pageant_projects_change after insert or update on public.pageant_projects for each row execute function public.pageant_record_change();
create trigger pageant_items_change after insert or update on public.pageant_work_items for each row execute function public.pageant_record_change();
create trigger pageant_articles_change after insert or update on public.pageant_articles for each row execute function public.pageant_record_change();
insert into public.pageant_projects(slug,title,status,event_id,event_date,venue,domain,summary,public)
select 'fobi-2026','FOBI 2026 世界美顏小姐','archived',id,event_date,venue,'https://fobi.self.com.tw','2026 世界美顏小姐選美總決賽：賽後新聞、合作成果與活動紀錄。',true from public.pageant_events where slug='fobi-2026';


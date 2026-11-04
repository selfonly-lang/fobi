-- Pageant v2: platform + branded annual projects. No legacy payment records are changed.
create table public.pageant_organizations (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id),
 name text not null check(length(name) between 1 and 160), status text not null default 'pending' check(status in ('pending','verified','rejected')),
 contact jsonb not null default '{}', created_at timestamptz not null default now()
);
create index pageant_org_owner on public.pageant_organizations(owner_id);
create table public.pageant_brands (
 id uuid primary key default gen_random_uuid(),slug text not null unique,name text not null, domain text unique,
 organization_id uuid references public.pageant_organizations(id),primary_project_id uuid,
 theme jsonb not null default '{}',status text not null default 'draft' check(status in ('draft','approved')),created_at timestamptz not null default now()
);
alter table public.pageant_projects add column brand_id uuid references public.pageant_brands(id),add column organization_id uuid references public.pageant_organizations(id),add column year integer check(year between 1900 and 2200),add column review_status text not null default 'draft' check(review_status in ('draft','pending','approved','rejected')),add column config jsonb not null default '{}',add column created_by uuid references auth.users(id),add column sort_order integer not null default 100;
create index pageant_projects_brand on public.pageant_projects(brand_id);
create index pageant_projects_org on public.pageant_projects(organization_id);
create index pageant_projects_creator on public.pageant_projects(created_by);
alter table public.pageant_brands add constraint pageant_brand_primary_project foreign key(primary_project_id) references public.pageant_projects(id);
insert into public.pageant_brands(slug,name,domain,status,theme) values('fobi','世界美顏小姐','fobi.self.com.tw','approved','{"accent":"#aa8856","wordmark":"FACE OF BEAUTY INTERNATIONAL"}'),('miss-taiwan','台灣小姐 Miss Taiwan','misstaiwan.self.com.tw','approved','{"accent":"#967044","wordmark":"MISS TAIWAN"}');
update public.pageant_projects set brand_id=(select id from pageant_brands where slug='fobi'),year=2026,review_status='approved',sort_order=0 where slug='fobi-2026';
insert into public.pageant_projects(slug,title,status,year,brand_id,domain,summary,public,review_status,sort_order)
 values('miss-taiwan-2027','2027 台灣小姐選美','planning',2027,(select id from public.pageant_brands where slug='miss-taiwan'),'https://misstaiwan.self.com.tw','2027 台灣小姐賽事籌備專案。正式日期、場地、招募資格及活動資訊確認後公告。',true,'approved',1);
update public.pageant_brands b set primary_project_id=p.id from public.pageant_projects p where p.brand_id=b.id;
-- A platform article may be independent of a competition.
alter table public.pageant_articles alter column project_id drop not null;
create table public.pageant_activities (
 id uuid primary key default gen_random_uuid(),project_id uuid not null references public.pageant_projects(id),
 kind text not null check(kind in ('pageant','course','training','press','segment','final','party')),
 title text not null,description text not null default '',status text not null default 'draft' check(status in ('draft','pending','open','closed','cancelled','archived')),
 starts_at timestamptz,ends_at timestamptz,timezone text not null default 'Asia/Taipei',venue text not null default '',
 capacity integer not null default 0 check(capacity>=0),fee_kind text not null default 'ticket' check(fee_kind in ('ticket','course','sponsor')),
 amount integer not null default 0 check(amount>=0), currency text not null default 'TWD' check(currency='TWD'),
 terms text not null default '',refund_policy text not null default '',config jsonb not null default '{}',version integer not null default 1,
 created_by uuid references auth.users(id),created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create index pageant_activities_project on public.pageant_activities(project_id);
create index pageant_activities_creator on public.pageant_activities(created_by);
create table public.pageant_registrations (
 id uuid primary key default gen_random_uuid(),activity_id uuid not null references public.pageant_activities(id),user_id uuid not null references auth.users(id),
 status text not null default 'pending' check(status in ('pending','approved','rejected','cancelled','attended')),profile jsonb not null default '{}',consent_at timestamptz not null default now(),created_at timestamptz not null default now(),unique(activity_id,user_id)
);
create index pageant_registrations_user on public.pageant_registrations(user_id);
create table public.pageant_fee_rules (
 id uuid primary key default gen_random_uuid(),project_id uuid references public.pageant_projects(id),kind text not null check(kind in ('ticket','course','sponsor')),
 rate_bps integer check(rate_bps between 0 and 10000),gateway_fee_bearer text check(gateway_fee_bearer in ('platform','organizer')),
 terms text not null default '',enabled boolean not null default false,updated_at timestamptz not null default now()
);
create unique index pageant_fee_global_kind on public.pageant_fee_rules(kind) where project_id is null;
create unique index pageant_fee_project_kind on public.pageant_fee_rules(project_id,kind) where project_id is not null;
insert into public.pageant_fee_rules(kind) values('ticket'),('course'),('sponsor');
create table public.pageant_commerce_orders (
 id uuid primary key default gen_random_uuid(),order_no text not null unique,project_id uuid not null references public.pageant_projects(id),activity_id uuid not null references public.pageant_activities(id),user_id uuid not null references auth.users(id),
 quantity integer not null check(quantity between 1 and 10),unit_amount integer not null check(unit_amount>=0),amount integer not null check(amount>=0),currency text not null default 'TWD',
 fee_kind text not null,rate_bps integer not null,gateway_fee_bearer text not null,terms_snapshot jsonb not null,
 status text not null default 'pending' check(status in ('pending','paid','expired','cancelled','refund_pending','partially_refunded','refunded')),
 expires_at timestamptz not null default now()+interval '20 minutes',paid_at timestamptz,refunded_amount integer not null default 0 check(refunded_amount>=0 and refunded_amount<=amount),
 idempotency_key uuid not null,ecpay_trade_no text unique,created_at timestamptz not null default now(),unique(user_id,idempotency_key)
);
create index pageant_orders_project on public.pageant_commerce_orders(project_id);
create index pageant_orders_activity on public.pageant_commerce_orders(activity_id);
create index pageant_orders_user on public.pageant_commerce_orders(user_id);
create table public.pageant_admissions (
 id uuid primary key default gen_random_uuid(),order_id uuid not null references public.pageant_commerce_orders(id),user_id uuid not null references auth.users(id),ticket_no text not null unique,
 token_hash text not null unique,status text not null default 'valid' check(status in ('valid','used','void')),checked_in_at timestamptz,created_at timestamptz not null default now()
);
create index pageant_admissions_order on public.pageant_admissions(order_id);create index pageant_admissions_user on public.pageant_admissions(user_id);
create table public.pageant_payment_events (
 id bigint generated always as identity primary key,order_id uuid not null references public.pageant_commerce_orders(id),provider_event text not null unique,kind text not null,payload jsonb not null default '{}',created_at timestamptz not null default now()
);
create index pageant_payment_events_order on public.pageant_payment_events(order_id);
create table public.pageant_refunds (
 id uuid primary key default gen_random_uuid(),order_id uuid not null references public.pageant_commerce_orders(id),amount integer not null check(amount>0),reason text not null,status text not null default 'requested' check(status in ('requested','approved','rejected','processing','completed','failed')),provider_reference text,created_by uuid not null references auth.users(id),created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create index pageant_refunds_order on public.pageant_refunds(order_id);create index pageant_refunds_creator on public.pageant_refunds(created_by);
create table public.pageant_finance_entries (
 id uuid primary key default gen_random_uuid(),project_id uuid not null references public.pageant_projects(id),order_id uuid references public.pageant_commerce_orders(id),kind text not null check(kind in ('sale','refund','commission','gateway_fee','expense','payout')),
 amount integer not null,description text not null,proof_asset_id uuid references public.pageant_assets(id),created_by uuid references auth.users(id),created_at timestamptz not null default now(),source_key text unique
);
create index pageant_finance_project on public.pageant_finance_entries(project_id);create index pageant_finance_order on public.pageant_finance_entries(order_id);create index pageant_finance_proof on public.pageant_finance_entries(proof_asset_id);create index pageant_finance_creator on public.pageant_finance_entries(created_by);
create table public.pageant_settlements (
 id uuid primary key default gen_random_uuid(),project_id uuid not null references public.pageant_projects(id),status text not null default 'requested' check(status in ('requested','review','approved','paid','rejected')),
 amount integer not null check(amount>=0),snapshot jsonb not null,bank_reference text,created_by uuid not null references auth.users(id),created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create index pageant_settlements_project on public.pageant_settlements(project_id);create index pageant_settlements_creator on public.pageant_settlements(created_by);
create table public.pageant_proposals (
 id uuid primary key default gen_random_uuid(),project_id uuid not null references public.pageant_projects(id),title text not null,kind text not null default 'proposal' check(kind in ('proposal','sponsor','report')),status text not null default 'draft' check(status in ('draft','review','approved','accepted','delivered')),content jsonb not null default '{}',version integer not null default 1,created_by uuid references auth.users(id),created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create index pageant_proposals_project on public.pageant_proposals(project_id);create index pageant_proposals_creator on public.pageant_proposals(created_by);
create table public.pageant_media (
 id uuid primary key default gen_random_uuid(),project_id uuid references public.pageant_projects(id),title text not null,description text not null default '',kind text not null check(kind in ('short','interview','highlight','show')),
 provider text not null check(provider in ('youtube','vimeo','cloudflare')),external_id text not null,poster text not null default '',caption text not null default '',source text not null,rights_confirmed boolean not null default false,
 processing_status text not null default 'ready' check(processing_status in ('pending','processing','ready','failed')),status text not null default 'draft' check(status in ('draft','review','published','withdrawn')),created_by uuid references auth.users(id),created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create index pageant_media_project on public.pageant_media(project_id);create index pageant_media_creator on public.pageant_media(created_by);
create table public.pageant_publications (
 id uuid primary key default gen_random_uuid(),project_id uuid not null references public.pageant_projects(id),slug text not null unique,title text not null,description text not null default '',chapters jsonb not null default '[]',publication jsonb,
 status text not null default 'draft' check(status in ('draft','review','published','withdrawn')),version integer not null default 1,created_by uuid references auth.users(id),created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create index pageant_publications_project on public.pageant_publications(project_id);create index pageant_publications_creator on public.pageant_publications(created_by);
create table public.pageant_member_profiles (
 user_id uuid primary key references auth.users(id) on delete cascade,display_name text not null default '',country text not null default '',bio text not null default '',links jsonb not null default '{}',updated_at timestamptz not null default now()
);
create table public.pageant_bookmarks (
 user_id uuid not null references auth.users(id) on delete cascade,resource_type text not null check(resource_type in ('article','project','media')),resource_id uuid not null,created_at timestamptz not null default now(),primary key(user_id,resource_type,resource_id)
);
create table public.pageant_notifications (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,title text not null,body text not null default '',url text not null default '/account',read_at timestamptz,created_at timestamptz not null default now()
);
create index pageant_notifications_user on public.pageant_notifications(user_id);
create table public.pageant_auth_grants (
 token_hash text primary key,user_id uuid not null references auth.users(id) on delete cascade,challenge text not null,expires_at timestamptz not null default now()+interval '5 minutes',created_at timestamptz not null default now()
);
create index pageant_auth_grants_user on public.pageant_auth_grants(user_id);
create table public.pageant_ai_runs (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id),project_id uuid references public.pageant_projects(id),status text not null default 'pending',input jsonb not null,output jsonb,error_code text,created_at timestamptz not null default now()
);
create index pageant_ai_runs_user on public.pageant_ai_runs(user_id);create index pageant_ai_runs_project on public.pageant_ai_runs(project_id);
create table public.pageant_channel_jobs (
 id uuid primary key default gen_random_uuid(),article_id uuid not null references public.pageant_articles(id),channel text not null check(channel in ('facebook','line')),status text not null default 'pending' check(status in ('pending','sent','failed')),public_url text,provider_ref text,error_code text,attempts integer not null default 0,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(article_id,channel)
);
create table public.pageant_settings (
 key text primary key,value jsonb not null default '{}',updated_at timestamptz not null default now()
);
insert into public.pageant_settings(key,value)values('commerce','{"enabled":false,"merchant_reviewed":false,"payouts_enabled":false}');
-- Private-by-default service gateway; no operational records are directly exposed.
do $$ declare t text;begin foreach t in array array['pageant_organizations','pageant_brands','pageant_activities','pageant_registrations','pageant_fee_rules','pageant_commerce_orders','pageant_admissions','pageant_payment_events','pageant_refunds','pageant_finance_entries','pageant_settlements','pageant_proposals','pageant_media','pageant_publications','pageant_member_profiles','pageant_bookmarks','pageant_notifications','pageant_auth_grants','pageant_ai_runs','pageant_channel_jobs','pageant_settings'] loop execute format('alter table public.%I enable row level security',t);execute format('revoke all on public.%I from anon,authenticated',t);end loop;end $$;
create function public.pageant_start_project(p_actor uuid,p_org uuid,p_data jsonb,p_tasks jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare p public.pageant_projects;begin
 if not exists(select 1 from public.pageant_organizations where id=p_org and owner_id=p_actor) then raise exception 'organization_forbidden';end if;
 insert into public.pageant_projects(slug,title,status,year,organization_id,summary,venue,event_date,created_by)
 values(p_data->>'slug',p_data->>'title','planning',(p_data->>'year')::integer,p_org,coalesce(p_data->>'summary',''),coalesce(p_data->>'venue',''),nullif(p_data->>'event_date','')::date,p_actor) returning * into p;
 insert into public.pageant_project_members(project_id,user_id,role)values(p.id,p_actor,'manager');
 insert into public.pageant_work_items(project_id,kind,stage,title,payload,created_by)
 select p.id,'task',t->>'stage',t->>'title',coalesce(t->'payload','{}'::jsonb),p_actor from jsonb_array_elements(p_tasks)t;
 return to_jsonb(p);
end;$$;
create function public.pageant_reserve_order(p_actor uuid,p_activity uuid,p_quantity integer,p_key uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.pageant_activities;p public.pageant_projects;f public.pageant_fee_rules;o public.pageant_commerce_orders;used integer;cfg jsonb;begin
 if p_quantity<1 or p_quantity>10 then raise exception 'invalid_quantity';end if;
 select * into o from public.pageant_commerce_orders where user_id=p_actor and idempotency_key=p_key;
 if found then return to_jsonb(o);end if;
 select * into a from public.pageant_activities where id=p_activity for update;
 if not found then raise exception 'activity_not_found';end if;
 select * into p from public.pageant_projects where id=a.project_id;
 if p.review_status<>'approved' or not p.public or p.status in('closed','archived') or a.status<>'open' or a.starts_at is null or coalesce(a.ends_at,a.starts_at)<=now() then raise exception 'activity_not_on_sale';end if;
 select value into cfg from public.pageant_settings where key='commerce';
 if not coalesce((cfg->>'enabled')::boolean,false) or not coalesce((cfg->>'merchant_reviewed')::boolean,false) then raise exception 'commerce_not_enabled';end if;
 select * into f from public.pageant_fee_rules where kind=a.fee_kind and (project_id=p.id or project_id is null) order by project_id nulls last limit 1;
 if not found or not f.enabled or f.rate_bps is null or f.gateway_fee_bearer is null or length(f.terms)=0 or length(a.terms)=0 or length(a.refund_policy)=0 then raise exception 'terms_or_fee_not_ready';end if;
 if a.amount<=0 then raise exception 'use_free_registration';end if;
 select coalesce(sum(quantity),0)::integer into used from public.pageant_commerce_orders where activity_id=a.id and (status in('paid','refund_pending','partially_refunded') or status='pending' and expires_at>now());
 if a.capacity>0 and used+p_quantity>a.capacity then raise exception 'sold_out';end if;
 insert into public.pageant_commerce_orders(order_no,project_id,activity_id,user_id,quantity,unit_amount,amount,fee_kind,rate_bps,gateway_fee_bearer,terms_snapshot,idempotency_key,ecpay_trade_no)
 values('PG'||to_char(now(),'YYMMDDHH24MISS')||upper(substr(replace(gen_random_uuid()::text,'-',''),1,6)),p.id,a.id,p_actor,p_quantity,a.amount,a.amount*p_quantity,a.fee_kind,f.rate_bps,f.gateway_fee_bearer,jsonb_build_object('activity_terms',a.terms,'refund_policy',a.refund_policy,'fee_terms',f.terms),p_key,'PG'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,18))) returning * into o;
 return to_jsonb(o);
end;$$;
create function public.pageant_confirm_payment(p_order uuid,p_reference text,p_amount integer,p_event text,p_payload jsonb,p_tickets jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare o public.pageant_commerce_orders;t jsonb;begin
 select * into o from public.pageant_commerce_orders where id=p_order for update;
 if not found or o.amount<>p_amount then raise exception 'payment_mismatch';end if;
 if o.status in('paid','refund_pending','partially_refunded','refunded') then return jsonb_build_object('duplicate',true,'order_id',o.id);end if;
 if o.status<>'pending' then raise exception 'order_not_payable';end if;
 if jsonb_array_length(p_tickets)<>o.quantity then raise exception 'ticket_count_mismatch';end if;
 insert into public.pageant_payment_events(order_id,provider_event,kind,payload)values(o.id,p_event,'payment',p_payload) on conflict(provider_event) do nothing;
 if not found then return jsonb_build_object('duplicate',true,'order_id',o.id);end if;
 update public.pageant_commerce_orders set status='paid',paid_at=now() where id=o.id;
 insert into public.pageant_finance_entries(project_id,order_id,kind,amount,description,source_key)values(o.project_id,o.id,'sale',o.amount,'綠界付款 '||p_reference,'sale:'||o.id),(o.project_id,o.id,'commission',-floor(o.amount::numeric*o.rate_bps/10000)::integer,'平台成交服務費','commission:'||o.id);
 for t in select * from jsonb_array_elements(p_tickets) loop
 insert into public.pageant_admissions(id,order_id,user_id,ticket_no,token_hash)values((t->>'id')::uuid,o.id,o.user_id,t->>'ticket_no',t->>'token_hash');end loop;
 insert into public.pageant_notifications(user_id,title,body,url)values(o.user_id,'付款完成，票券已建立',o.order_no,'/account?tab=tickets');
 return jsonb_build_object('duplicate',false,'order_id',o.id);
end;$$;
create function public.pageant_complete_refund(p_refund uuid,p_reference text,p_actor uuid)returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.pageant_refunds;o public.pageant_commerce_orders;total integer;old_comm integer;new_comm integer;begin
 select * into r from public.pageant_refunds where id=p_refund for update;
 if r.status='completed' then return to_jsonb(r);end if;
 if r.status not in('approved','processing')or length(p_reference)<3 then raise exception 'refund_not_approved';end if;
 select * into o from public.pageant_commerce_orders where id=r.order_id for update;
 total=o.refunded_amount+r.amount;if total>o.amount then raise exception 'refund_exceeds_payment';end if;
 old_comm=floor((o.amount-o.refunded_amount)::numeric*o.rate_bps/10000)::integer;new_comm=floor((o.amount-total)::numeric*o.rate_bps/10000)::integer;
 update public.pageant_commerce_orders set refunded_amount=total,status=case when total=amount then 'refunded' else 'partially_refunded' end where id=o.id;
 update public.pageant_refunds set status='completed',provider_reference=p_reference,updated_at=now() where id=r.id;
 insert into public.pageant_finance_entries(project_id,order_id,kind,amount,description,source_key,created_by)values(o.project_id,o.id,'refund',-r.amount,'退款 '||p_reference,'refund:'||r.id,p_actor),(o.project_id,o.id,'commission',old_comm-new_comm,'退款後服務費沖銷','refund-fee:'||r.id,p_actor);
 -- Partial refunds void that many complete admissions; uneven amounts are held for staff review.
 if total=o.amount then update public.pageant_admissions set status='void' where order_id=o.id;end if;
 return jsonb_build_object('order_id',o.id,'refunded',total);
end;$$;
create function public.pageant_redeem_ticket(p_hash text,p_actor uuid)returns jsonb language plpgsql security definer set search_path='' as $$
declare t public.pageant_admissions;begin
 select * into t from public.pageant_admissions where token_hash=p_hash for update;
 if not found then raise exception 'invalid_ticket';end if;
 if t.status<>'valid' then raise exception 'ticket_already_used_or_void';end if;
 if exists(select 1 from public.pageant_commerce_orders where id=t.order_id and status not in('paid','partially_refunded'))then raise exception 'order_not_valid';end if;
 update public.pageant_admissions set status='used',checked_in_at=now() where id=t.id;
 return jsonb_build_object('ticket_no',t.ticket_no,'checked_in_at',now());
end;$$;
create function public.pageant_consume_grant(p_hash text,p_challenge text) returns uuid language plpgsql security definer set search_path='' as $$
declare uid uuid;begin delete from public.pageant_auth_grants where token_hash=p_hash and challenge=p_challenge and expires_at>now() returning user_id into uid;return uid;end;$$;
create function public.pageant_confirm_payout(p_id uuid,p_actor uuid,p_reference text)returns jsonb language plpgsql security definer set search_path='' as $$
declare s public.pageant_settlements;balance integer;begin
 select * into s from public.pageant_settlements where id=p_id for update;
 if s.status='paid' then return to_jsonb(s);end if;
 if s.status<>'approved' or length(p_reference)<3 then raise exception 'settlement_not_approved';end if;
 perform pg_advisory_xact_lock(hashtext(s.project_id::text));
 select coalesce(sum(amount),0)::integer into balance from public.pageant_finance_entries where project_id=s.project_id;
 if balance<>s.amount then raise exception 'settlement_balance_changed';end if;
 if exists(select 1 from public.pageant_refunds r join public.pageant_commerce_orders o on o.id=r.order_id where o.project_id=s.project_id and r.status in('requested','approved','processing'))then raise exception 'refunds_pending';end if;
 insert into public.pageant_finance_entries(project_id,kind,amount,description,source_key,created_by)values(s.project_id,'payout',-s.amount,'主辦結算 '||p_reference,'payout:'||s.id,p_actor);
 update public.pageant_settlements set status='paid',bank_reference=p_reference,updated_at=now() where id=s.id;
 return jsonb_build_object('paid',true,'amount',s.amount);
end;$$;
do $$ declare f regprocedure;begin foreach f in array array['public.pageant_start_project(uuid,uuid,jsonb,jsonb)'::regprocedure,'public.pageant_reserve_order(uuid,uuid,integer,uuid)'::regprocedure,'public.pageant_confirm_payment(uuid,text,integer,text,jsonb,jsonb)'::regprocedure,'public.pageant_complete_refund(uuid,text,uuid)'::regprocedure,'public.pageant_redeem_ticket(text,uuid)'::regprocedure,'public.pageant_consume_grant(text,text)'::regprocedure,'public.pageant_confirm_payout(uuid,uuid,text)'::regprocedure] loop execute format('revoke all on function %s from public,anon,authenticated',f);execute format('grant execute on function %s to service_role',f);end loop;end $$;
-- This new edition has no dates, contestants, prices or invented sponsors.
insert into public.pageant_work_items(project_id,kind,stage,title,payload)
select p.id,'task',s.stage,s.title,'{"note":"籌備專案：待主辦確認資料與執行時程。","checklist":[],"dependencies":[]}'::jsonb from public.pageant_projects p cross join(values('planning','確認主辦單位與賽事目標'),('planning','確認日期、場地及活動預算'),('recruitment','確認招募資格與資料同意'),('training','規劃培訓課程與教練'),('sponsors','製作贊助方案與權益表'),('tickets','確認售票、退款條款與抽成'),('media','建立新聞與人物採訪計畫'),('onsite','安排記者會、單項賽與總決賽'),('closeout','規劃電子會刊與結案交付'))s(stage,title) where p.slug='miss-taiwan-2027';

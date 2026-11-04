-- Purpose-scoped publishing worker. Credentials stay inside Vault and never reach the browser.
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;
alter table public.pageant_channel_jobs drop constraint pageant_channel_jobs_status_check;
alter table public.pageant_channel_jobs add constraint pageant_channel_jobs_status_check check(status in ('review','pending','processing','sent','failed','unknown','cancelled'));
alter table public.pageant_channel_jobs add column scheduled_at timestamptz not null default now(),add column payload jsonb not null default '{}',add column content_hash text,add column approved_by uuid references auth.users(id),add column locked_at timestamptz;
create index pageant_channel_jobs_due on public.pageant_channel_jobs(scheduled_at) where status='pending';
create table public.pageant_service_tokens(token_hash text primary key,purpose text not null check(purpose='channel_dispatch'),created_at timestamptz not null default now());
alter table public.pageant_service_tokens enable row level security;
revoke all on public.pageant_service_tokens from anon,authenticated;
create or replace function public.pageant_claim_channel_jobs() returns setof public.pageant_channel_jobs language plpgsql security definer set search_path=public,pg_temp as $$
begin
 update pageant_channel_jobs set status='unknown',error_code='worker_response_unknown',updated_at=now() where status='processing' and locked_at<now()-interval '5 minutes';
 return query with due as(select id from pageant_channel_jobs where status='pending' and scheduled_at<=now() and approved_by is not null order by scheduled_at for update skip locked limit 8)
 update pageant_channel_jobs j set status='processing',locked_at=now(),attempts=attempts+1,updated_at=now() from due where j.id=due.id returning j.*;
end $$;
revoke all on function public.pageant_claim_channel_jobs() from public,anon,authenticated;
grant execute on function public.pageant_claim_channel_jobs() to service_role;
do $$ declare raw text;begin
 if not exists(select 1 from vault.secrets where name='pageant_channel_dispatch_token') then
 raw:=gen_random_uuid()::text||gen_random_uuid()::text;
 perform vault.create_secret(raw,'pageant_channel_dispatch_token','Purpose-scoped channel job dispatcher');
 insert into public.pageant_service_tokens(token_hash,purpose) values(encode(sha256(convert_to(raw,'UTF8')),'hex'),'channel_dispatch');
 end if;
end $$;
select cron.schedule('pageant-channel-dispatch','*/5 * * * *',
 $job$select net.http_post(url:='https://tlpsqaywjcgowprhauod.supabase.co/functions/v1/pageant-core?action=dispatch-channel-jobs',headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||(select decrypted_secret from vault.decrypted_secrets where name='pageant_channel_dispatch_token')),body:='{}'::jsonb,timeout_milliseconds:=60000);$job$);

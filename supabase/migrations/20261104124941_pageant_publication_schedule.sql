alter table public.pageant_articles add column scheduled_publication jsonb, add column scheduled_at timestamptz;
create index pageant_articles_scheduled on public.pageant_articles(scheduled_at) where scheduled_publication is not null;

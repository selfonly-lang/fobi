create extension if not exists pgcrypto;

create table if not exists public.fobi_countries (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name_en text not null,
  name_zh text,
  table_no integer unique,
  status text not null default 'available' check (status in ('available','reserved','sponsored','blocked')),
  contestant_name text,
  contestant_photo_url text,
  sponsor_name text,
  reserved_until timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.fobi_interests (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('sponsor','member')),
  country_code text,
  tier text,
  member_count integer not null default 1,
  company text,
  contact_name text not null,
  phone text not null,
  email text not null,
  note text,
  source text default 'fobi.self.com.tw',
  status text not null default 'new' check (status in ('new','contacted','qualified','reserved','paid','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.fobi_orders (
  id uuid primary key default gen_random_uuid(),
  order_no text unique not null,
  interest_id uuid references public.fobi_interests(id),
  type text not null check (type in ('sponsor','member')),
  amount integer not null,
  currency text not null default 'TWD',
  payment_provider text default 'ecpay',
  payment_status text not null default 'pending' check (payment_status in ('pending','paid','failed','refunded')),
  payment_ref text,
  qr_token uuid unique default gen_random_uuid(),
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create table if not exists public.fobi_checkins (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.fobi_orders(id) on delete cascade,
  checked_in_at timestamptz not null default now(),
  gate text,
  staff_note text
);

alter table public.fobi_countries enable row level security;
alter table public.fobi_interests enable row level security;
alter table public.fobi_orders enable row level security;
alter table public.fobi_checkins enable row level security;

create policy "public read country inventory" on public.fobi_countries for select using (true);
create policy "public submit interest" on public.fobi_interests for insert with check (true);

insert into public.fobi_countries(code,name_en,table_no)
select x.code,x.name_en,x.table_no from (values
('TW','Taiwan',1),('JP','Japan',2),('KR','Korea',3),('TH','Thailand',4),('PH','Philippines',5),('VN','Vietnam',6),('SG','Singapore',7),('MY','Malaysia',8),('ID','Indonesia',9),('IN','India',10),
('AU','Australia',11),('NZ','New Zealand',12),('US','USA',13),('CA','Canada',14),('MX','Mexico',15),('BR','Brazil',16),('AR','Argentina',17),('FR','France',18),('IT','Italy',19),('ES','Spain',20),
('PT','Portugal',21),('DE','Germany',22),('GB','UK',23),('NL','Netherlands',24),('SE','Sweden',25),('PL','Poland',26),('UA','Ukraine',27),('TR','Turkey',28),('AE','UAE',29),('ZA','South Africa',30),
('EG','Egypt',31),('MA','Morocco',32),('MN','Mongolia',33),('KZ','Kazakhstan',34),('HK','Hong Kong',35),('MO','Macau',36),('CN','China',37),('KH','Cambodia',38),('MM','Myanmar',39),('NP','Nepal',40)
) as x(code,name_en,table_no)
on conflict (code) do nothing;

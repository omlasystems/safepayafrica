create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  email text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.scans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  input_type text not null check (input_type in ('message', 'website', 'investment', 'payment')),
  submitted_content text not null check (char_length(submitted_content) <= 10000),
  risk_score integer not null check (risk_score between 0 and 100),
  risk_level text not null check (risk_level in ('low', 'moderate', 'high', 'very_high')),
  ai_analysis jsonb not null default '{}'::jsonb,
  verification_status text not null default 'unverified'
    check (verification_status in ('unverified', 'evidence_supported', 'independently_verified')),
  created_at timestamptz not null default now()
);

create table if not exists public.scam_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  category text not null check (char_length(category) <= 80),
  description text not null check (char_length(description) between 10 and 10000),
  reported_business_name text check (reported_business_name is null or char_length(reported_business_name) <= 120),
  suspicious_url text check (suspicious_url is null or char_length(suspicious_url) <= 2048),
  suspicious_phone text check (suspicious_phone is null or char_length(suspicious_phone) <= 40),
  evidence_url text check (evidence_url is null or char_length(evidence_url) <= 2048),
  verification_status text not null default 'unverified'
    check (verification_status in ('unverified', 'evidence_supported', 'independently_verified')),
  created_at timestamptz not null default now()
);

create table if not exists public.scam_indicators (
  id uuid primary key default gen_random_uuid(),
  indicator_type text not null check (indicator_type in ('url', 'phone', 'business')),
  indicator_value text not null check (char_length(indicator_value) between 1 and 2048),
  source_report_id uuid references public.scam_reports (id) on delete set null,
  verification_status text not null default 'unverified'
    check (verification_status in ('unverified', 'evidence_supported', 'independently_verified')),
  created_at timestamptz not null default now()
);

create table if not exists public.scam_keywords (
  id uuid primary key default gen_random_uuid(),
  keyword text not null unique check (char_length(keyword) between 2 and 100),
  indicator text not null check (char_length(indicator) between 2 and 180),
  risk_points smallint not null check (risk_points between 0 and 40),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.scam_keywords (keyword, indicator, risk_points)
values
  ('guaranteed returns', 'Guaranteed or risk-free return claims', 24),
  ('no risk', 'Guaranteed or risk-free return claims', 24),
  ('act fast', 'Urgency or pressure tactics', 15),
  ('limited slots', 'Urgency or pressure tactics', 15),
  ('share your otp', 'Request for sensitive authentication information', 30),
  ('send your pin', 'Request for sensitive authentication information', 30),
  ('pay an activation fee', 'Upfront activation fee requested before a promised benefit', 18),
  ('pay a withdrawal fee', 'Fee requested to access funds', 20),
  ('account will be suspended', 'Threat of account suspension used to prompt action', 18)
on conflict (keyword) do update set
  indicator = excluded.indicator,
  risk_points = excluded.risk_points,
  active = true;

create index if not exists scans_user_created_idx on public.scans (user_id, created_at desc);
create index if not exists scam_reports_user_created_idx on public.scam_reports (user_id, created_at desc);
create index if not exists scam_indicators_lookup_idx on public.scam_indicators (indicator_type, verification_status);
create index if not exists scam_keywords_active_idx on public.scam_keywords (active);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.users (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.email, '')
  )
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

alter table public.users enable row level security;
alter table public.scans enable row level security;
alter table public.scam_reports enable row level security;
alter table public.scam_indicators enable row level security;
alter table public.scam_keywords enable row level security;

drop policy if exists "Users can read their own profile" on public.users;
create policy "Users can read their own profile" on public.users
  for select to authenticated using ((select auth.uid()) = id);
drop policy if exists "Users can update their own profile" on public.users;
create policy "Users can update their own profile" on public.users
  for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

drop policy if exists "Users can read their own scans" on public.scans;
create policy "Users can read their own scans" on public.scans
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Users can create their own scans" on public.scans;
create policy "Users can create their own scans" on public.scans
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "Users can read their own reports" on public.scam_reports;
create policy "Users can read their own reports" on public.scam_reports
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Users can create their own reports" on public.scam_reports;
create policy "Users can create their own reports" on public.scam_reports
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "Authenticated users can check reviewed indicators" on public.scam_indicators;
create policy "Authenticated users can check reviewed indicators" on public.scam_indicators
  for select to authenticated
  using (verification_status in ('evidence_supported', 'independently_verified'));
drop policy if exists "Public can check reviewed indicators" on public.scam_indicators;
create policy "Public can check reviewed indicators" on public.scam_indicators
  for select to anon
  using (verification_status in ('evidence_supported', 'independently_verified'));
drop policy if exists "Public can read active scam keywords" on public.scam_keywords;
create policy "Public can read active scam keywords" on public.scam_keywords
  for select to anon, authenticated
  using (active);

revoke all on public.users, public.scans, public.scam_reports, public.scam_indicators from anon;
revoke all on public.scam_keywords from anon, authenticated;
grant select, update on public.users to authenticated;
grant select, insert on public.scans to authenticated;
grant select, insert on public.scam_reports to authenticated;
grant select on public.scam_indicators to authenticated;
grant select on public.scam_indicators to anon;
grant select on public.scam_keywords to anon, authenticated;
grant all on public.scam_keywords to service_role;

revoke execute on function public.handle_new_user() from public;

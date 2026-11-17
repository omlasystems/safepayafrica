-- Add keyword detection rules to an existing SAFEPAI schema.
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

create index if not exists scam_keywords_active_idx on public.scam_keywords (active);

alter table public.scam_keywords enable row level security;

drop policy if exists "Public can read active scam keywords" on public.scam_keywords;
create policy "Public can read active scam keywords" on public.scam_keywords
  for select to anon, authenticated
  using (active);

revoke all on public.scam_keywords from anon, authenticated;
grant select on public.scam_keywords to anon, authenticated;
grant all on public.scam_keywords to service_role;

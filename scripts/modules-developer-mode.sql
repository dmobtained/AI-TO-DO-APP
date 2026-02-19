-- Developer Mode per module: run in Supabase SQL Editor

create table if not exists public.modules (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  is_active boolean default true,
  updated_at timestamptz default now()
);

-- Seed (skip if row exists)
insert into public.modules (name)
values
  ('dashboard'),
  ('taken'),
  ('financien'),
  ('email'),
  ('instellingen'),
  ('admin')
on conflict (name) do nothing;

-- Trigger: set updated_at on update
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists modules_updated_at on public.modules;
create trigger modules_updated_at
  before update on public.modules
  for each row execute function public.set_updated_at();

-- Enable Realtime for this table (Supabase Dashboard: Database > Replication > public.modules > Enable)
-- RLS
alter table public.modules enable row level security;

-- Select: allow all authenticated users
drop policy if exists "modules_select_authenticated" on public.modules;
create policy "modules_select_authenticated"
  on public.modules for select
  to authenticated
  using (true);

-- Update: allow only admin (user_metadata.role = 'admin' canonical)
drop policy if exists "modules_update_admin" on public.modules;
create policy "modules_update_admin"
  on public.modules for update
  to authenticated
  using (
    coalesce(
      (auth.jwt()->'user_metadata'->>'role')::text,
      ''
    ) ilike '%admin%'
  )
  with check (
    coalesce(
      (auth.jwt()->'user_metadata'->>'role')::text,
      ''
    ) ilike '%admin%'
  );

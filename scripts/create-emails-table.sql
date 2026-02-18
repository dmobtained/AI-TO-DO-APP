-- Run in Supabase SQL Editor if emails table does not exist.
create table if not exists public.emails (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  sender text,
  subject text,
  body text,
  category text,
  requires_action boolean default false,
  amount numeric,
  due_date timestamptz,
  appointment_date timestamptz,
  created_at timestamptz default now()
);

create index if not exists emails_user_id_created_at_idx on public.emails (user_id, created_at desc);

-- Optional: settings table for developer_mode_mail (run if not exists).
create table if not exists public.settings (
  key text primary key,
  value boolean default false
);

insert into public.settings (key, value) values ('developer_mode_mail', false)
on conflict (key) do nothing;

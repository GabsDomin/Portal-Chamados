create table if not exists public.portal_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  company text,
  caller_id text,
  role text not null default 'Cliente',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Legado: substituido por portal_users via Prisma migrations

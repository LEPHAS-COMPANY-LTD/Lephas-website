-- Draft database schema for Supabase (Postgres). Backend lead: review, adjust, then run in the Supabase SQL editor.

create table if not exists quotes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  project_type text not null,
  budget_range text,
  deadline date,
  details text not null,
  status text not null default 'new' check (status in ('new', 'contacted', 'won', 'lost')),
  created_at timestamptz not null default now()
);

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  description text not null,
  image_url text,
  tech text[] not null default '{}',
  live_url text,
  featured boolean not null default false,
  created_at timestamptz not null default now()
);

-- TODO (Backend): enable row-level security on both tables and add policies:
--   public can read projects; only the server (service key) can write quotes and projects.

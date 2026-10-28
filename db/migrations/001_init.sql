create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null unique,
  password_hash text not null,
  role text not null default 'staff' check (role in ('cto', 'admin', 'staff')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists users_single_cto on users ((role)) where role = 'cto';

create table if not exists media (
  id uuid primary key default gen_random_uuid(),
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  byte_size integer not null check (byte_size > 0 and byte_size <= 1500000),
  data bytea not null,
  uploaded_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists services (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  category text not null,
  summary text not null,
  description text not null default '',
  starting_price integer check (starting_price is null or starting_price >= 0),
  price_unit text not null default 'project' check (price_unit in ('project', 'hour', 'month')),
  delivery_estimate text,
  features text[] not null default '{}',
  icon text not null default 'code',
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists team_members (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  full_name text not null,
  title text not null,
  member_type text not null default 'employee' check (member_type in ('owner', 'employee')),
  headline text not null default '',
  bio text not null default '',
  photo_media_id uuid references media(id) on delete set null,
  photo_url text,
  location text,
  years_experience integer check (years_experience is null or years_experience >= 0),
  hourly_rate integer check (hourly_rate is null or hourly_rate >= 0),
  availability text not null default 'available' check (availability in ('available', 'limited', 'unavailable')),
  skills text[] not null default '{}',
  languages text[] not null default '{}',
  github_url text,
  linkedin_url text,
  portfolio_url text,
  website_url text,
  sort_order integer not null default 0,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  summary text not null,
  description text not null default '',
  client_name text,
  service_id uuid references services(id) on delete set null,
  image_media_id uuid references media(id) on delete set null,
  image_url text,
  tech text[] not null default '{}',
  live_url text,
  repo_url text,
  featured boolean not null default false,
  published boolean not null default true,
  completed_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists project_members (
  project_id uuid not null references projects(id) on delete cascade,
  member_id uuid not null references team_members(id) on delete cascade,
  primary key (project_id, member_id)
);

create sequence if not exists inquiry_number_seq;

create table if not exists inquiries (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  kind text not null check (kind in ('project', 'hire', 'contact')),
  status text not null default 'new' check (status in ('new', 'in_review', 'awaiting_client', 'proposal_sent', 'won', 'lost', 'closed')),
  full_name text not null,
  email text not null,
  phone text,
  company text,
  country text,
  preferred_contact text not null default 'email' check (preferred_contact in ('email', 'phone', 'whatsapp')),
  service_id uuid references services(id) on delete set null,
  team_member_id uuid references team_members(id) on delete set null,
  engagement text check (engagement in ('fixed', 'hourly', 'monthly', 'not_sure')),
  budget_range text,
  timeline text,
  subject text,
  details text not null,
  access_token_hash text not null,
  access_token_enc text not null,
  assigned_to uuid references users(id) on delete set null,
  client_last_seen_at timestamptz,
  team_last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists inquiries_status_idx on inquiries (status, created_at desc);
create index if not exists inquiries_email_idx on inquiries (lower(email));

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid not null references inquiries(id) on delete cascade,
  sender text not null check (sender in ('client', 'team', 'system')),
  author_user_id uuid references users(id) on delete set null,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists messages_inquiry_idx on messages (inquiry_id, created_at);

create table if not exists site_settings (
  key text primary key,
  value text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists rate_limits (
  bucket text primary key,
  window_start timestamptz not null,
  hits integer not null
);

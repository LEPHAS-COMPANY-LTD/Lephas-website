create sequence if not exists quote_number_seq;
create sequence if not exists invoice_number_seq;

create table if not exists billing_documents (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('quote', 'invoice')),
  number text unique,
  status text not null default 'draft'
    check (status in ('draft', 'sent', 'accepted', 'declined', 'paid', 'partially_paid', 'void')),
  inquiry_id uuid not null references inquiries(id) on delete restrict,
  source_quote_id uuid references billing_documents(id) on delete set null,
  title text not null,
  client_name text not null,
  client_email text not null,
  client_phone text,
  client_company text,
  client_address text,
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  issue_date date not null default current_date,
  due_date date,
  discount_cents bigint not null default 0 check (discount_cents >= 0),
  tax_label text not null default 'VAT',
  tax_rate numeric(5, 2) not null default 0 check (tax_rate >= 0 and tax_rate <= 100),
  subtotal_cents bigint not null default 0,
  tax_cents bigint not null default 0,
  total_cents bigint not null default 0,
  notes text not null default '',
  terms text not null default '',
  client_response_note text,
  sent_at timestamptz,
  responded_at timestamptz,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists billing_documents_inquiry_idx on billing_documents (inquiry_id, created_at);
create index if not exists billing_documents_status_idx on billing_documents (kind, status, created_at desc);

create table if not exists billing_items (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references billing_documents(id) on delete cascade,
  position integer not null,
  description text not null,
  quantity numeric(10, 2) not null check (quantity > 0),
  unit text not null default '',
  unit_price_cents bigint not null check (unit_price_cents >= 0),
  amount_cents bigint not null
);

create index if not exists billing_items_document_idx on billing_items (document_id, position);

create table if not exists billing_payments (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references billing_documents(id) on delete cascade,
  amount_cents bigint not null check (amount_cents > 0),
  method text not null check (method in ('bank_transfer', 'mobile_money', 'card', 'cash', 'other')),
  reference text,
  paid_on date not null default current_date,
  note text,
  recorded_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists billing_payments_document_idx on billing_payments (document_id, paid_on);

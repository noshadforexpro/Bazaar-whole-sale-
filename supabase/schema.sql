-- Run in Supabase SQL Editor only after reviewing. RLS is enabled for all user-facing tables.
create extension if not exists pgcrypto;
create type public.account_role as enum ('buyer','seller','admin');
create type public.verification_status as enum ('pending','under_review','verified','rejected','suspended');
create type public.order_status as enum ('pending_payment','paid','confirmed','processing','shipped','delivered','cancelled','disputed','refunded');
create type public.payment_status as enum ('created','pending','paid','failed','refunded','partially_refunded');

create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 full_name text not null default '', phone text unique,
 role public.account_role not null default 'buyer', city text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.seller_profiles (
 user_id uuid primary key references public.profiles(id) on delete cascade,
 business_name text not null, business_type text, description text,
 city text not null, address text not null, tax_number text,
 verification_status public.verification_status not null default 'pending',
 verified_at timestamptz, verified_by uuid references public.profiles(id),
 payout_provider text, payout_reference_last4 text,
 created_at timestamptz not null default now()
);
create table public.verification_documents (
 id uuid primary key default gen_random_uuid(), seller_id uuid not null references public.seller_profiles(user_id) on delete cascade,
 document_type text not null check (document_type in ('identity','business_registration','shop_photo','address_proof','other')),
 storage_path text not null, review_status public.verification_status not null default 'pending',
 reviewed_by uuid references public.profiles(id), reviewed_at timestamptz, reviewer_note text,
 created_at timestamptz not null default now()
);
create table public.categories (
 id uuid primary key default gen_random_uuid(), name text not null unique, slug text not null unique,
 parent_id uuid references public.categories(id), is_active boolean not null default true
);
create table public.products (
 id uuid primary key default gen_random_uuid(), seller_id uuid not null references public.seller_profiles(user_id),
 category_id uuid references public.categories(id), name text not null, slug text not null,
 description text, sku text, unit text not null default 'piece',
 price_paisa bigint not null check (price_paisa >= 0), min_order_qty integer not null default 1 check (min_order_qty > 0),
 stock_qty integer not null default 0 check (stock_qty >= 0), city text not null,
 status text not null default 'draft' check (status in ('draft','active','paused','rejected')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(seller_id,slug)
);
create table public.product_images (
 id uuid primary key default gen_random_uuid(), product_id uuid not null references public.products(id) on delete cascade,
 storage_path text not null, sort_order integer not null default 0
);
create table public.orders (
 id uuid primary key default gen_random_uuid(), order_number text not null unique,
 buyer_id uuid not null references public.profiles(id), seller_id uuid not null references public.seller_profiles(user_id),
 status public.order_status not null default 'pending_payment',
 currency char(3) not null default 'PKR', subtotal_paisa bigint not null check(subtotal_paisa >= 0),
 shipping_paisa bigint not null default 0 check(shipping_paisa >= 0),
 commission_rate numeric(5,2) not null check(commission_rate >= 0 and commission_rate <= 100),
 commission_paisa bigint not null check(commission_paisa >= 0),
 total_paisa bigint not null check(total_paisa >= 0),
 shipping_name text not null, shipping_phone text not null, shipping_address text not null, shipping_city text not null,
 buyer_note text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.order_items (
 id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id) on delete cascade,
 product_id uuid references public.products(id) on delete set null, product_name_snapshot text not null,
 unit_price_paisa bigint not null check(unit_price_paisa >= 0), quantity integer not null check(quantity > 0),
 line_total_paisa bigint not null check(line_total_paisa >= 0)
);
create table public.payments (
 id uuid primary key default gen_random_uuid(), order_id uuid not null unique references public.orders(id),
 provider text not null, provider_reference text unique, status public.payment_status not null default 'created',
 amount_paisa bigint not null check(amount_paisa >= 0), currency char(3) not null default 'PKR',
 paid_at timestamptz, webhook_event_id text unique, safe_metadata jsonb not null default '{}',
 created_at timestamptz not null default now()
);
create table public.payout_ledger (
 id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id),
 seller_id uuid not null references public.seller_profiles(user_id),
 gross_paisa bigint not null, commission_paisa bigint not null, provider_fee_paisa bigint not null default 0,
 net_paisa bigint not null, status text not null default 'pending' check(status in ('pending','approved','processing','paid','failed','held')),
 provider_reference text, created_at timestamptz not null default now(), paid_at timestamptz
);
create table public.disputes (
 id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id),
 opened_by uuid not null references public.profiles(id), reason text not null, description text not null,
 status text not null default 'open' check(status in ('open','investigating','resolved_buyer','resolved_seller','closed')),
 resolution_note text, resolved_by uuid references public.profiles(id), created_at timestamptz not null default now(), resolved_at timestamptz
);
create table public.audit_logs (
 id bigint generated always as identity primary key, actor_id uuid references public.profiles(id),
 action text not null, entity_type text not null, entity_id text, details jsonb not null default '{}', created_at timestamptz not null default now()
);

-- Security baseline: all tables are private until policies explicitly allow access.
alter table public.profiles enable row level security;
alter table public.seller_profiles enable row level security;
alter table public.verification_documents enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.payout_ledger enable row level security;
alter table public.disputes enable row level security;
alter table public.audit_logs enable row level security;

-- Public catalog can show only active products and verified sellers.
create policy "active products visible" on public.products for select using (
 status = 'active' and exists (select 1 from public.seller_profiles s where s.user_id = seller_id and s.verification_status = 'verified')
);
create policy "active categories visible" on public.categories for select using (is_active = true);
create policy "own profile read" on public.profiles for select using (auth.uid() = id);
-- Profile edits should be implemented with a narrow server-side update path; do not let clients change role.
create policy "verified seller public profile" on public.seller_profiles for select using (verification_status = 'verified' or auth.uid() = user_id);
create policy "seller sees own documents" on public.verification_documents for select using (auth.uid() = seller_id);
create policy "seller sees own products" on public.products for select using (auth.uid() = seller_id);
create policy "seller manages own products" on public.products for insert with check (auth.uid() = seller_id and exists (select 1 from public.seller_profiles s where s.user_id = auth.uid() and s.verification_status = 'verified'));
create policy "seller updates own products" on public.products for update using (auth.uid() = seller_id) with check (auth.uid() = seller_id);
create policy "buyer or seller sees order" on public.orders for select using (auth.uid() = buyer_id or auth.uid() = seller_id);
create policy "buyer sees own order items" on public.order_items for select using (exists(select 1 from public.orders o where o.id = order_id and (o.buyer_id = auth.uid() or o.seller_id = auth.uid())));
create policy "order participants see payments" on public.payments for select using (exists(select 1 from public.orders o where o.id = order_id and (o.buyer_id = auth.uid() or o.seller_id = auth.uid())));
create policy "dispute participants read" on public.disputes for select using (opened_by = auth.uid() or exists(select 1 from public.orders o where o.id = order_id and (o.buyer_id = auth.uid() or o.seller_id = auth.uid())));

-- IMPORTANT:
-- Never let clients directly update roles, verification_status, payment status, commission, or payout rows.
-- Create orders, verify payments/webhooks, approve sellers and issue payouts only through trusted server routes/RPC.
-- Do not store raw CNIC images in public buckets. Use a private storage bucket and short-lived signed URLs.

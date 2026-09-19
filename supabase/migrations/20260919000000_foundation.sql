-- MONTYSTOREE: initial multi-tenant schema.
-- Execute only in a NEW, dedicated montystoree project.
-- No client-side INSERT/UPDATE/DELETE permissions are granted on financial records.
create extension if not exists pgcrypto;

create table public.stores (
 id uuid primary key default gen_random_uuid(),
 slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{2,39}$'),
 name text not null check (char_length(name) between 2 and 120),
 owner_id uuid not null references auth.users(id),
 status text not null default 'pending' check (status in ('pending','active','suspended','expired')),
 theme jsonb not null default '{}'::jsonb,
 settings jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index stores_owner_idx on public.stores(owner_id);

create table public.store_members (
 store_id uuid not null references public.stores(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 role text not null check (role in ('owner','admin','product_manager','order_staff','finance_staff','support_staff')),
 created_at timestamptz not null default now(),
 primary key (store_id,user_id)
);
create index store_members_user_idx on public.store_members(user_id);

create table public.store_domains (
 id uuid primary key default gen_random_uuid(),
 store_id uuid not null references public.stores(id) on delete cascade,
 hostname text not null unique check (char_length(hostname) between 4 and 253),
 verified_at timestamptz,
 created_at timestamptz not null default now()
);
create index store_domains_store_idx on public.store_domains(store_id);

create table public.categories (
 id uuid primary key default gen_random_uuid(),
 store_id uuid not null references public.stores(id) on delete cascade,
 name text not null,
 slug text not null,
 sort_order integer not null default 0,
 unique (store_id,slug),
 unique (id,store_id)
);

create table public.products (
 id uuid primary key default gen_random_uuid(),
 store_id uuid not null references public.stores(id) on delete cascade,
 category_id uuid,
 slug text not null,
 name text not null,
 description text not null default '',
 image_path text,
 published boolean not null default false,
 sort_order integer not null default 0,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 foreign key (category_id,store_id) references public.categories(id,store_id),
 unique (store_id,slug),
 unique (id,store_id)
);
create index products_store_idx on public.products(store_id,published,sort_order);

create table public.product_variants (
 id uuid primary key default gen_random_uuid(),
 store_id uuid not null references public.stores(id) on delete cascade,
 product_id uuid not null,
 label text not null,
 price_satang bigint not null check (price_satang >= 0),
 cost_satang bigint not null default 0 check (cost_satang >= 0),
 duration_days integer check (duration_days > 0),
 delivery_type text not null check (delivery_type in ('manual','account','code','api')),
 published boolean not null default false,
 created_at timestamptz not null default now(),
 foreign key (product_id,store_id) references public.products(id,store_id),
 unique (id,store_id)
);
create index product_variants_product_idx on public.product_variants(product_id);

create table public.orders (
 id uuid primary key default gen_random_uuid(),
 store_id uuid not null references public.stores(id),
 customer_id uuid not null references auth.users(id),
 status text not null default 'pending' check (status in ('pending','paid','fulfilling','fulfilled','cancelled','refunded')),
 total_satang bigint not null check (total_satang >= 0),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique (id,store_id)
);
create index orders_customer_idx on public.orders(store_id,customer_id,created_at desc);
create index orders_store_status_idx on public.orders(store_id,status,created_at desc);

create table public.order_items (
 id uuid primary key default gen_random_uuid(),
 store_id uuid not null references public.stores(id),
 order_id uuid not null,
 variant_id uuid,
 product_name text not null,
 variant_label text not null,
 quantity integer not null check (quantity > 0),
 unit_price_satang bigint not null check (unit_price_satang >= 0),
 foreign key (order_id,store_id) references public.orders(id,store_id),
 foreign key (variant_id,store_id) references public.product_variants(id,store_id)
);
create index order_items_order_idx on public.order_items(order_id);

create table public.wallet_accounts (
 id uuid primary key default gen_random_uuid(),
 store_id uuid not null references public.stores(id),
 user_id uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 unique (store_id,user_id),
 unique (id,store_id)
);
create table public.wallet_entries (
 id uuid primary key default gen_random_uuid(),
 store_id uuid not null references public.stores(id),
 account_id uuid not null,
 amount_satang bigint not null check (amount_satang <> 0),
 entry_type text not null check (entry_type in ('topup','purchase','refund','adjustment')),
 external_reference text not null,
 created_at timestamptz not null default now(),
 foreign key (account_id,store_id) references public.wallet_accounts(id,store_id),
 unique (store_id,entry_type,external_reference)
);
create index wallet_entries_account_idx on public.wallet_entries(account_id,created_at desc);

create table public.rental_contracts (
 id uuid primary key default gen_random_uuid(),
 store_id uuid not null references public.stores(id) on delete cascade,
 fee_satang bigint not null check (fee_satang >= 0),
 starts_at timestamptz not null,
 ends_at timestamptz not null check (ends_at > starts_at),
 grace_ends_at timestamptz,
 status text not null default 'pending' check (status in ('pending','active','overdue','expired','cancelled')),
 created_at timestamptz not null default now()
);
create index rental_contracts_store_idx on public.rental_contracts(store_id,ends_at desc);

-- Security: clients can read their own membership and their own financial history.
-- All writes (including store creation, orders, wallet entries, staff and billing)
-- must go via separately implemented and audited server-side workflows.
alter table public.stores enable row level security;
alter table public.store_members enable row level security;
alter table public.store_domains enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.wallet_accounts enable row level security;
alter table public.wallet_entries enable row level security;
alter table public.rental_contracts enable row level security;

-- Revoke broad defaults: only selectively grant read to the Data API roles.
revoke all on public.stores,public.store_members,public.store_domains,public.categories,public.products,public.product_variants,public.orders,public.order_items,public.wallet_accounts,public.wallet_entries,public.rental_contracts from anon,authenticated;
grant select on public.stores,public.categories,public.products,public.product_variants to anon,authenticated;
grant select on public.store_members,public.orders,public.order_items,public.wallet_accounts,public.wallet_entries to authenticated;

create policy stores_public_active_or_owner on public.stores
for select to anon,authenticated using (status='active' or (select auth.uid())=owner_id);
create policy categories_public_active on public.categories
for select to anon,authenticated using (exists (
 select 1 from public.stores s where s.id=categories.store_id and s.status='active'
));
create policy products_public_published on public.products
for select to anon,authenticated using (published and exists (
 select 1 from public.stores s where s.id=products.store_id and s.status='active'
));
create policy variants_public_published on public.product_variants
for select to anon,authenticated using (published and exists (
 select 1 from public.products p where p.id=product_variants.product_id and p.store_id=product_variants.store_id and p.published
));
create policy members_self on public.store_members
for select to authenticated using (user_id=(select auth.uid()));
create policy orders_customer on public.orders
for select to authenticated using (customer_id=(select auth.uid()));
create policy order_items_customer on public.order_items
for select to authenticated using (exists (
 select 1 from public.orders o where o.id=order_items.order_id and o.store_id=order_items.store_id and o.customer_id=(select auth.uid())
));
create policy wallet_accounts_self on public.wallet_accounts
for select to authenticated using (user_id=(select auth.uid()));
create policy wallet_entries_self on public.wallet_entries
for select to authenticated using (exists (
 select 1 from public.wallet_accounts a where a.id=wallet_entries.account_id and a.store_id=wallet_entries.store_id and a.user_id=(select auth.uid())
));

-- Important: inventory secrets and provider credentials belong in a non-exposed
-- private schema, with application-side encryption and strictly scoped backend access.
-- Never place account passwords or service-role keys in these public tables.

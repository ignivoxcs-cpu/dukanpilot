-- DukaanPilot — initial schema
-- Money is stored as integer PAISE (₹1 = 100) to avoid rounding errors.
-- Every business-owned row carries business_id and is protected by RLS.

create extension if not exists pgcrypto;

-- ───────────────────────── Businesses ─────────────────────────
create table public.businesses (
  id                  uuid primary key default gen_random_uuid(),
  owner_id            uuid not null unique references auth.users (id) on delete cascade,
  name                text not null check (char_length(name) between 2 and 80),
  owner_name          text not null check (char_length(owner_name) between 1 and 80),
  slug                text not null unique check (slug ~ '^[a-z0-9-]{3,40}$'),
  category            text not null default 'General',
  phone               text not null check (phone ~ '^\+?[0-9 ]{10,16}$'),
  email               text,
  city                text,
  timezone            text not null default 'Asia/Kolkata',
  currency            text not null default 'INR' check (currency = 'INR'),
  low_stock_threshold int  not null default 3 check (low_stock_threshold between 0 and 1000),
  next_order_number   int  not null default 1001,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- Is the signed-in user the owner of this business?
create or replace function public.owns_business(bid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.businesses where id = bid and owner_id = auth.uid());
$$;

-- ───────────────────────── Products ─────────────────────────
create table public.products (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references public.businesses (id) on delete cascade,
  name         text not null check (char_length(name) between 1 and 120),
  description  text check (char_length(description) <= 2000),
  category     text,
  price_paise  int  not null check (price_paise between 0 and 100000000),
  stock        int  not null default 0 check (stock between 0 and 1000000),
  image_path   text,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index products_business_idx on public.products (business_id, is_active);

-- ───────────────────────── Customers ─────────────────────────
create table public.customers (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references public.businesses (id) on delete cascade,
  name         text not null check (char_length(name) between 1 and 80),
  phone        text not null check (phone ~ '^\+?[0-9 ]{10,16}$'),
  email        text,
  city         text,
  created_at   timestamptz not null default now(),
  unique (business_id, phone)
);
create index customers_business_idx on public.customers (business_id);

-- ───────────────────────── Orders ─────────────────────────
create table public.orders (
  id             uuid primary key default gen_random_uuid(),
  business_id    uuid not null references public.businesses (id) on delete cascade,
  number         int  not null,
  customer_id    uuid not null references public.customers (id) on delete restrict,
  status         text not null default 'pending'
                 check (status in ('pending','confirmed','processing','shipped','delivered','cancelled')),
  subtotal_paise int  not null check (subtotal_paise >= 0),
  discount_paise int  not null default 0 check (discount_paise >= 0),
  total_paise    int  not null,
  stock_deducted boolean not null default false, -- guards against double deduction
  notes          text check (char_length(notes) <= 1000),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (business_id, number),
  check (discount_paise <= subtotal_paise),
  check (total_paise = subtotal_paise - discount_paise)
);
create index orders_business_created_idx on public.orders (business_id, created_at desc);
create index orders_business_status_idx on public.orders (business_id, status);

create table public.order_items (
  id               uuid primary key default gen_random_uuid(),
  order_id         uuid not null references public.orders (id) on delete cascade,
  business_id      uuid not null references public.businesses (id) on delete cascade,
  product_id       uuid references public.products (id) on delete set null,
  product_name     text not null,  -- snapshot at time of order
  unit_price_paise int  not null check (unit_price_paise >= 0),
  quantity         int  not null check (quantity between 1 and 10000)
);
create index order_items_order_idx on public.order_items (order_id);

-- ───────────────────────── Payments (records, not a gateway) ─────────────────────────
create table public.payments (
  id            uuid primary key default gen_random_uuid(),
  business_id   uuid not null references public.businesses (id) on delete cascade,
  order_id      uuid not null references public.orders (id) on delete cascade,
  kind          text not null default 'payment' check (kind in ('payment','refund')),
  amount_paise  int  not null check (amount_paise > 0),
  method        text not null check (method in ('upi','cash','bank_transfer','card','other')),
  reference     text check (char_length(reference) <= 80),
  paid_at       timestamptz not null default now(),
  voided        boolean not null default false,
  void_reason   text,
  recorded_by   uuid references auth.users (id),
  created_at    timestamptz not null default now()
);
create index payments_business_paid_idx on public.payments (business_id, paid_at desc);
create index payments_order_idx on public.payments (order_id);
-- The same transaction reference can't be recorded twice for one business.
create unique index payments_unique_reference
  on public.payments (business_id, lower(reference))
  where reference is not null and not voided;

-- Business rule enforced in the database: no overpayment, no over-refund,
-- no payments on cancelled orders, payment must belong to the order's business.
create or replace function public.check_payment() returns trigger
language plpgsql as $$
declare
  o public.orders;
  net int;
begin
  select * into o from public.orders where id = new.order_id for update;
  if o.business_id <> new.business_id then
    raise exception 'Payment does not belong to this business';
  end if;
  if new.voided then return new; end if;
  if new.kind = 'payment' and o.status = 'cancelled' then
    raise exception 'Cannot record a payment on a cancelled order';
  end if;
  select coalesce(sum(case when kind = 'refund' then -amount_paise else amount_paise end), 0)
    into net from public.payments
    where order_id = new.order_id and not voided and id <> new.id;
  if new.kind = 'payment' and net + new.amount_paise > o.total_paise then
    raise exception 'Payment would exceed the order total';
  end if;
  if new.kind = 'refund' and new.amount_paise > net then
    raise exception 'Refund cannot exceed the amount paid';
  end if;
  return new;
end $$;
create trigger payments_check before insert or update on public.payments
  for each row execute function public.check_payment();

-- ───────────────────────── Storefront order requests ─────────────────────────
-- Customers' requests from the public store. Always "new" — never auto-confirmed.
create table public.order_requests (
  id             uuid primary key default gen_random_uuid(),
  business_id    uuid not null references public.businesses (id) on delete cascade,
  customer_name  text not null check (char_length(customer_name) between 1 and 80),
  customer_phone text not null check (customer_phone ~ '^\+?[0-9 ]{10,16}$'),
  items          jsonb not null,
  message        text check (char_length(message) <= 500),
  status         text not null default 'new' check (status in ('new','converted','dismissed')),
  created_at     timestamptz not null default now()
);
create index order_requests_business_idx on public.order_requests (business_id, created_at desc);

-- ───────────────────────── Activity log ─────────────────────────
create table public.activity_log (
  id           bigint generated always as identity primary key,
  business_id  uuid not null references public.businesses (id) on delete cascade,
  actor_id     uuid references auth.users (id),
  action       text not null,      -- e.g. 'payment.recorded', 'order.cancelled'
  entity       text not null,
  entity_id    uuid,
  details      jsonb,
  created_at   timestamptz not null default now()
);
create index activity_business_idx on public.activity_log (business_id, created_at desc);

-- ───────────────────────── Row Level Security ─────────────────────────
alter table public.businesses     enable row level security;
alter table public.products       enable row level security;
alter table public.customers      enable row level security;
alter table public.orders         enable row level security;
alter table public.order_items    enable row level security;
alter table public.payments       enable row level security;
alter table public.order_requests enable row level security;
alter table public.activity_log   enable row level security;

create policy "owner reads business"   on public.businesses for select using (owner_id = auth.uid());
create policy "owner creates business" on public.businesses for insert with check (owner_id = auth.uid());
create policy "owner updates business" on public.businesses for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Owner-only full access for business data tables. No DELETE on money tables:
-- payments are voided (audit trail), orders are cancelled.
do $$
declare t text;
begin
  foreach t in array array['products','customers','orders','order_items'] loop
    execute format('create policy "owner select" on public.%I for select using (public.owns_business(business_id))', t);
    execute format('create policy "owner insert" on public.%I for insert with check (public.owns_business(business_id))', t);
    execute format('create policy "owner update" on public.%I for update using (public.owns_business(business_id)) with check (public.owns_business(business_id))', t);
  end loop;
end $$;
create policy "owner delete items" on public.order_items for delete using (public.owns_business(business_id));

create policy "owner select" on public.payments for select using (public.owns_business(business_id));
create policy "owner insert" on public.payments for insert with check (public.owns_business(business_id) and recorded_by = auth.uid());
create policy "owner void"   on public.payments for update using (public.owns_business(business_id)) with check (public.owns_business(business_id));

create policy "owner select" on public.order_requests for select using (public.owns_business(business_id));
create policy "owner update" on public.order_requests for update using (public.owns_business(business_id)) with check (public.owns_business(business_id));
-- No anon insert policy: requests are inserted only via submit_order_request().

create policy "owner select" on public.activity_log for select using (public.owns_business(business_id));
create policy "owner insert" on public.activity_log for insert with check (public.owns_business(business_id));

-- ───────────────────────── Public storefront (read-only, safe fields) ─────────────────────────
create or replace function public.public_storefront(p_slug text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'name', b.name, 'category', b.category, 'phone', b.phone, 'city', b.city,
    'products', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id, 'name', p.name, 'description', p.description, 'category', p.category,
        'pricePaise', p.price_paise, 'imagePath', p.image_path, 'available', p.stock > 0
      ) order by p.created_at desc)
      from public.products p where p.business_id = b.id and p.is_active), '[]'::jsonb)
  )
  from public.businesses b where b.slug = p_slug;
$$;

-- Validated, rate-limited order request from the public store.
create or replace function public.submit_order_request(
  p_slug text, p_name text, p_phone text, p_items jsonb, p_message text
) returns uuid language plpgsql security definer set search_path = public as $$
declare bid uuid; rid uuid;
begin
  select id into bid from public.businesses where slug = p_slug;
  if bid is null then raise exception 'Store not found'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) not between 1 and 20 then
    raise exception 'Invalid items';
  end if;
  if (select count(*) from public.order_requests
      where business_id = bid and customer_phone = p_phone and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'Too many requests. Please try again later.';
  end if;
  insert into public.order_requests (business_id, customer_name, customer_phone, items, message)
    values (bid, trim(p_name), trim(p_phone), p_items, nullif(trim(p_message), ''))
    returning id into rid;
  return rid;
end $$;

revoke all on function public.public_storefront(text) from public;
revoke all on function public.submit_order_request(text, text, text, jsonb, text) from public;
grant execute on function public.public_storefront(text) to anon, authenticated;
grant execute on function public.submit_order_request(text, text, text, jsonb, text) to anon, authenticated;

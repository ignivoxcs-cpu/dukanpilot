-- Security & business-rule tests for 0001_init.sql.
-- Run against a scratch database. Every check raises an exception on failure.
\set ON_ERROR_STOP 1

-- Supabase grants table access to these roles; RLS then restricts rows.
grant all on all tables in schema public to authenticated, anon;
grant usage on all sequences in schema public to authenticated;

insert into auth.users values ('00000000-0000-0000-0000-00000000000a'), ('00000000-0000-0000-0000-00000000000b');

-- Helper to act as a user
create or replace function pg_temp.act(uid text) returns void language plpgsql as $$
begin perform set_config('request.jwt.claim.sub', uid, false); end $$;

set role authenticated;

-- User A sets up a business with data
select pg_temp.act('00000000-0000-0000-0000-00000000000a');
insert into businesses (id, owner_id, name, owner_name, slug, phone)
  values ('aaaaaaaa-0000-0000-0000-000000000001', auth.uid(), 'Shop A', 'Asha', 'shop-a', '+91 9876543210');
insert into products (business_id, name, price_paise, stock) values ('aaaaaaaa-0000-0000-0000-000000000001', 'Kurti', 89900, 5);
insert into customers (id, business_id, name, phone) values ('cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Neha', '9876500000');
insert into orders (id, business_id, number, customer_id, subtotal_paise, total_paise)
  values ('dddddddd-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 1001, 'cccccccc-0000-0000-0000-000000000001', 10000, 10000);
insert into payments (business_id, order_id, amount_paise, method, reference, recorded_by)
  values ('aaaaaaaa-0000-0000-0000-000000000001', 'dddddddd-0000-0000-0000-000000000001', 4000, 'upi', 'UPI123', auth.uid());

-- 1. Overpayment is blocked
do $$ begin
  begin
    insert into payments (business_id, order_id, amount_paise, method, recorded_by)
      values ('aaaaaaaa-0000-0000-0000-000000000001', 'dddddddd-0000-0000-0000-000000000001', 7000, 'cash', auth.uid());
    raise exception 'FAIL: overpayment allowed';
  exception when raise_exception then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;
  raise notice 'PASS 1: overpayment blocked';
end $$;

-- 2. Duplicate transaction reference is blocked (case-insensitive)
do $$ begin
  begin
    insert into payments (business_id, order_id, amount_paise, method, reference, recorded_by)
      values ('aaaaaaaa-0000-0000-0000-000000000001', 'dddddddd-0000-0000-0000-000000000001', 1000, 'upi', 'upi123', auth.uid());
    raise exception 'FAIL: duplicate reference allowed';
  exception when unique_violation then null;
  end;
  raise notice 'PASS 2: duplicate payment reference blocked';
end $$;

-- 3. Over-refund is blocked
do $$ begin
  begin
    insert into payments (business_id, order_id, kind, amount_paise, method, recorded_by)
      values ('aaaaaaaa-0000-0000-0000-000000000001', 'dddddddd-0000-0000-0000-000000000001', 'refund', 5000, 'upi', auth.uid());
    raise exception 'FAIL: over-refund allowed';
  exception when raise_exception then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;
  raise notice 'PASS 3: over-refund blocked';
end $$;

-- 4. Inconsistent order totals are rejected
do $$ begin
  begin
    insert into orders (business_id, number, customer_id, subtotal_paise, discount_paise, total_paise)
      values ('aaaaaaaa-0000-0000-0000-000000000001', 1002, 'cccccccc-0000-0000-0000-000000000001', 10000, 1000, 10000);
    raise exception 'FAIL: bad total allowed';
  exception when check_violation then null;
  end;
  raise notice 'PASS 4: inconsistent order total rejected';
end $$;

-- User B: must not see or touch A's data
select pg_temp.act('00000000-0000-0000-0000-00000000000b');
insert into businesses (owner_id, name, owner_name, slug, phone) values (auth.uid(), 'Shop B', 'Bala', 'shop-b', '+91 9000000000');

do $$ begin
  if (select count(*) from businesses) <> 1 then raise exception 'FAIL: B sees other businesses'; end if;
  if (select count(*) from products) <> 0 then raise exception 'FAIL: B sees A products'; end if;
  if (select count(*) from customers) <> 0 then raise exception 'FAIL: B sees A customers'; end if;
  if (select count(*) from orders) <> 0 then raise exception 'FAIL: B sees A orders'; end if;
  if (select count(*) from payments) <> 0 then raise exception 'FAIL: B sees A payments'; end if;
  raise notice 'PASS 5: cross-business reads isolated';
end $$;

do $$ declare n int; begin
  update products set price_paise = 1 where business_id = 'aaaaaaaa-0000-0000-0000-000000000001';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: B updated A products'; end if;
  begin
    insert into products (business_id, name, price_paise) values ('aaaaaaaa-0000-0000-0000-000000000001', 'Hack', 1);
    raise exception 'FAIL: B inserted into A';
  exception when insufficient_privilege then null;
  end;
  raise notice 'PASS 6: cross-business writes blocked';
end $$;

-- 7. Anonymous visitors: no direct table access, but storefront function works
reset role;
select pg_temp.act('');
set role anon;
do $$ declare s jsonb; begin
  if (select count(*) from public.products) + (select count(*) from public.customers)
     + (select count(*) from public.orders) + (select count(*) from public.payments)
     + (select count(*) from public.businesses) <> 0 then
    raise exception 'FAIL: anon can read business tables';
  end if;
  begin
    insert into public.order_requests (business_id, customer_name, customer_phone, items)
      values ('aaaaaaaa-0000-0000-0000-000000000001', 'x', '9811111111', '[]');
    raise exception 'FAIL: anon inserted order request directly';
  exception when insufficient_privilege then null;
  end;
  s := public.public_storefront('shop-a');
  if s->>'name' <> 'Shop A' or jsonb_array_length(s->'products') <> 1 then raise exception 'FAIL: storefront %', s; end if;
  if (s->'products'->0) ? 'stock' then raise exception 'FAIL: storefront leaks stock count'; end if;
  if public.public_storefront('nope') is not null then raise exception 'FAIL: unknown store returned data'; end if;
  raise notice 'PASS 7: anon limited to safe storefront data';
end $$;

-- 8. Order requests: accepted, rate-limited, saved as "new"
do $$ declare i int; begin
  for i in 1..5 loop
    perform public.submit_order_request('shop-a', 'Ravi', '9811111111', '[{"productId":"x","qty":1}]', 'Hi');
  end loop;
  begin
    perform public.submit_order_request('shop-a', 'Ravi', '9811111111', '[{"productId":"x","qty":1}]', 'Hi');
    raise exception 'FAIL: rate limit not applied';
  exception when raise_exception then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;
  raise notice 'PASS 8: order requests rate-limited';
end $$;
reset role;
do $$ begin
  if exists (select 1 from order_requests where status <> 'new') then raise exception 'FAIL: request auto-confirmed'; end if;
  raise notice 'ALL TESTS PASSED';
end $$;

create table public.store_payment_profiles(
 store_id uuid primary key references public.stores(id) on delete cascade,
 promptpay_id text not null check(promptpay_id ~ '^([0-9]{10}|[0-9]{13})$'),
 recipient_name text not null check(char_length(trim(recipient_name)) between 2 and 120),
 enabled boolean not null default false,
 updated_at timestamptz not null default now()
);
alter table public.store_payment_profiles enable row level security;
grant select on public.store_payment_profiles to anon,authenticated;
grant insert,update on public.store_payment_profiles to authenticated;
create policy payment_public_read on public.store_payment_profiles for select to anon,authenticated using(enabled and exists(select 1 from public.stores s where s.id=store_id and s.status='active'));
create policy payment_owner_all on public.store_payment_profiles for all to authenticated using(exists(select 1 from public.stores s where s.id=store_id and s.owner_id=(select auth.uid()))) with check(exists(select 1 from public.stores s where s.id=store_id and s.owner_id=(select auth.uid())));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('payment-slips','payment-slips',false,5242880,array['image/jpeg','image/png','image/webp']) on conflict(id) do nothing;

create table public.topup_requests(
 id uuid primary key default gen_random_uuid(),
 store_id uuid not null references public.stores(id),
 user_id uuid not null references auth.users(id),
 amount_satang bigint not null check(amount_satang between 100 and 100000000),
 slip_path text not null,
 status text not null default 'pending' check(status in ('pending','approved','rejected')),
 admin_note text,
 reviewed_by uuid references auth.users(id),
 reviewed_at timestamptz,
 created_at timestamptz not null default now()
);
create index topup_user_idx on public.topup_requests(user_id,created_at desc);
create index topup_pending_idx on public.topup_requests(store_id,status,created_at);
alter table public.topup_requests enable row level security;
grant select,insert on public.topup_requests to authenticated;
create policy topup_customer_read on public.topup_requests for select to authenticated using(user_id=(select auth.uid()));
create policy topup_owner_read on public.topup_requests for select to authenticated using(exists(select 1 from public.stores s where s.id=store_id and s.owner_id=(select auth.uid())));
create policy topup_customer_insert on public.topup_requests for insert to authenticated with check(user_id=(select auth.uid()) and status='pending' and reviewed_by is null and reviewed_at is null);
create policy slip_customer_upload on storage.objects for insert to authenticated with check(bucket_id='payment-slips' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy slip_customer_read on storage.objects for select to authenticated using(bucket_id='payment-slips' and ((storage.foldername(name))[1]=(select auth.uid())::text or exists(select 1 from public.stores s where s.slug='otpthai' and s.owner_id=(select auth.uid()))));

create table public.stock_units(
 id uuid primary key default gen_random_uuid(),
 store_id uuid not null,
 variant_id uuid not null,
 secret_text text not null check(char_length(secret_text) between 1 and 2000),
 secret_hash text not null,
 status text not null default 'available' check(status in ('available','delivered','retired')),
 order_id uuid,
 created_at timestamptz not null default now(),
 delivered_at timestamptz,
 foreign key(variant_id,store_id) references public.product_variants(id,store_id),
 foreign key(order_id,store_id) references public.orders(id,store_id),
 unique(store_id,variant_id,secret_hash)
);
create index stock_available_idx on public.stock_units(store_id,variant_id,status,created_at);
alter table public.stock_units enable row level security;
grant select,insert,update on public.stock_units to authenticated;
create policy stock_owner_all on public.stock_units for all to authenticated using(exists(select 1 from public.stores s where s.id=store_id and s.owner_id=(select auth.uid()))) with check(exists(select 1 from public.stores s where s.id=store_id and s.owner_id=(select auth.uid())));
create policy stock_customer_delivered_read on public.stock_units for select to authenticated using(status='delivered' and exists(select 1 from public.orders o where o.id=order_id and o.customer_id=(select auth.uid())));

create or replace function public.approve_topup(p_request uuid,p_approve boolean,p_note text default null) returns void language plpgsql security definer set search_path='' as $$
declare r public.topup_requests; aid uuid; actor uuid:=(select auth.uid());
begin
 select * into r from public.topup_requests where id=p_request for update;
 if not found then raise exception 'Topup not found'; end if;
 if not exists(select 1 from public.stores s where s.id=r.store_id and s.owner_id=actor) then raise exception 'Admin required'; end if;
 if r.status<>'pending' then raise exception 'Already reviewed'; end if;
 if not p_approve then update public.topup_requests set status='rejected',admin_note=p_note,reviewed_by=actor,reviewed_at=now() where id=r.id; return; end if;
 insert into public.wallet_accounts(store_id,user_id) values(r.store_id,r.user_id) on conflict(store_id,user_id) do nothing;
 select id into aid from public.wallet_accounts where store_id=r.store_id and user_id=r.user_id;
 insert into public.wallet_entries(store_id,account_id,amount_satang,entry_type,external_reference) values(r.store_id,aid,r.amount_satang,'topup',r.id::text);
 update public.topup_requests set status='approved',admin_note=p_note,reviewed_by=actor,reviewed_at=now() where id=r.id;
end $$;
revoke all on function public.approve_topup(uuid,boolean,text) from public,anon;
grant execute on function public.approve_topup(uuid,boolean,text) to authenticated;

create or replace function public.purchase_with_wallet(p_variant uuid,p_request uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid()); v public.product_variants; p public.products; aid uuid; bal bigint; oid uuid; stock uuid;
begin
 if uid is null then raise exception 'Sign in required'; end if;
 select * into v from public.product_variants where id=p_variant and published=true;
 if not found then raise exception 'Product unavailable'; end if;
 select * into p from public.products where id=v.product_id and store_id=v.store_id and published=true;
 if not found or not exists(select 1 from public.stores s where s.id=v.store_id and s.slug='otpthai' and s.status='active') then raise exception 'Product unavailable'; end if;
 select id into oid from public.orders where customer_id=uid and request_id=p_request;
 if oid is not null then return oid; end if;
 insert into public.wallet_accounts(store_id,user_id) values(v.store_id,uid) on conflict(store_id,user_id) do nothing;
 select id into aid from public.wallet_accounts where store_id=v.store_id and user_id=uid for update;
 select coalesce(sum(amount_satang),0) into bal from public.wallet_entries where account_id=aid and store_id=v.store_id;
 if bal<v.price_satang then raise exception 'Insufficient balance'; end if;
 select id into stock from public.stock_units where store_id=v.store_id and variant_id=v.id and status='available' order by created_at for update skip locked limit 1;
 if stock is null then raise exception 'Out of stock'; end if;
 insert into public.orders(store_id,customer_id,status,total_satang,request_id) values(v.store_id,uid,'fulfilled',v.price_satang,p_request) returning id into oid;
 insert into public.order_items(store_id,order_id,variant_id,product_name,variant_label,quantity,unit_price_satang) values(v.store_id,oid,v.id,p.name,v.label,1,v.price_satang);
 insert into public.wallet_entries(store_id,account_id,amount_satang,entry_type,external_reference) values(v.store_id,aid,-v.price_satang,'purchase',oid::text);
 update public.stock_units set status='delivered',order_id=oid,delivered_at=now() where id=stock;
 return oid;
end $$;
revoke all on function public.purchase_with_wallet(uuid,uuid) from public,anon;
grant execute on function public.purchase_with_wallet(uuid,uuid) to authenticated;

-- Tenant self-service onboarding and secure product management.
-- A new store is a pending draft, never automatically billable or publicly active.
create or replace function public.create_draft_store(p_slug text, p_name text)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare v_user uuid := (select auth.uid()); v_store uuid; v_slug text := lower(trim(p_slug)); v_name text := trim(p_name);
begin
 if v_user is null then raise exception 'Sign in required'; end if;
 if not exists (select 1 from auth.users where id=v_user and email_confirmed_at is not null) then
  raise exception 'Verify your email first';
 end if;
 if v_slug !~ '^[a-z0-9][a-z0-9-]{2,39}$' or v_slug in ('admin','api','www','auth','login','register','rent','support','dashboard','app','shop','montystoree') then
  raise exception 'Invalid or reserved store address';
 end if;
 if char_length(v_name) < 2 or char_length(v_name) > 120 then raise exception 'Store name must be 2-120 characters'; end if;
 if (select count(*) from public.stores where owner_id=v_user) >= 3 then raise exception 'Maximum draft stores reached'; end if;
 insert into public.stores(slug,name,owner_id,status) values(v_slug,v_name,v_user,'pending')
 returning id into v_store;
 insert into public.store_members(store_id,user_id,role) values(v_store,v_user,'owner');
 return v_store;
end $$;
revoke all on function public.create_draft_store(text,text) from public;
grant execute on function public.create_draft_store(text,text) to authenticated;

create or replace function public.update_store_design(p_store_id uuid,p_name text,p_theme jsonb)
returns void language plpgsql security definer set search_path = ''
as $$
declare v_user uuid := (select auth.uid()); v_name text := trim(p_name);
begin
 if v_user is null or not exists (select 1 from public.stores where id=p_store_id and owner_id=v_user)
 then raise exception 'Not authorized'; end if;
 if char_length(v_name) not between 2 and 120 then raise exception 'Invalid store name'; end if;
 if jsonb_typeof(p_theme) <> 'object' or pg_catalog.length(p_theme::text) > 4096
 then raise exception 'Invalid theme'; end if;
 if p_theme ?| array['status','owner_id','permissions','billing','html','script'] then raise exception 'Unsupported theme keys'; end if;
 update public.stores set name=v_name,theme=p_theme,updated_at=now() where id=p_store_id;
end $$;
revoke all on function public.update_store_design(uuid,text,jsonb) from public;
grant execute on function public.update_store_design(uuid,text,jsonb) to authenticated;

create policy stores_owner_draft_read on public.stores for select to authenticated
 using(owner_id=(select auth.uid()));
create policy categories_owner_read on public.categories for select to authenticated
 using(exists(select 1 from public.stores s where s.id=categories.store_id and s.owner_id=(select auth.uid())));
create policy products_owner_read on public.products for select to authenticated
 using(exists(select 1 from public.stores s where s.id=products.store_id and s.owner_id=(select auth.uid())));
create policy variants_owner_read on public.product_variants for select to authenticated
 using(exists(select 1 from public.stores s where s.id=product_variants.store_id and s.owner_id=(select auth.uid())));
-- Restrict direct catalog mutations to owners; staff roles get their own explicit reviewed policies later.
grant insert,update,delete on public.categories,public.products,public.product_variants to authenticated;
create policy categories_owner_insert on public.categories for insert to authenticated
 with check(exists(select 1 from public.stores s where s.id=categories.store_id and s.owner_id=(select auth.uid())));
create policy categories_owner_update on public.categories for update to authenticated
 using(exists(select 1 from public.stores s where s.id=categories.store_id and s.owner_id=(select auth.uid())))
 with check(exists(select 1 from public.stores s where s.id=categories.store_id and s.owner_id=(select auth.uid())));
create policy categories_owner_delete on public.categories for delete to authenticated
 using(exists(select 1 from public.stores s where s.id=categories.store_id and s.owner_id=(select auth.uid())));
create policy products_owner_insert on public.products for insert to authenticated
 with check(exists(select 1 from public.stores s where s.id=products.store_id and s.owner_id=(select auth.uid())));
create policy products_owner_update on public.products for update to authenticated
 using(exists(select 1 from public.stores s where s.id=products.store_id and s.owner_id=(select auth.uid())))
 with check(exists(select 1 from public.stores s where s.id=products.store_id and s.owner_id=(select auth.uid())));
create policy products_owner_delete on public.products for delete to authenticated
 using(exists(select 1 from public.stores s where s.id=products.store_id and s.owner_id=(select auth.uid())));
create policy variants_owner_insert on public.product_variants for insert to authenticated
 with check(exists(select 1 from public.stores s where s.id=product_variants.store_id and s.owner_id=(select auth.uid())));
create policy variants_owner_update on public.product_variants for update to authenticated
 using(exists(select 1 from public.stores s where s.id=product_variants.store_id and s.owner_id=(select auth.uid())))
 with check(exists(select 1 from public.stores s where s.id=product_variants.store_id and s.owner_id=(select auth.uid())));
create policy variants_owner_delete on public.product_variants for delete to authenticated
 using(exists(select 1 from public.stores s where s.id=product_variants.store_id and s.owner_id=(select auth.uid())));
-- Never grant direct clients any ability to write orders, balances, billing or staff records.

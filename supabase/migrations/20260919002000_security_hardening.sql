-- Explicitly remove Supabase default anonymous grants on privileged RPCs.
revoke execute on function public.create_draft_store(text,text) from public, anon;
revoke execute on function public.update_store_design(uuid,text,jsonb) from public, anon;
grant execute on function public.create_draft_store(text,text) to authenticated;
grant execute on function public.update_store_design(uuid,text,jsonb) to authenticated;
-- Intentional deny-by-default on rental billing and domains; no client grants.
revoke all on public.rental_contracts,public.store_domains from anon,authenticated;
create index if not exists order_items_tenant_order_idx on public.order_items(order_id,store_id);
create index if not exists order_items_tenant_variant_idx on public.order_items(variant_id,store_id);
create index if not exists variant_tenant_product_idx on public.product_variants(product_id,store_id);
create index if not exists product_tenant_category_idx on public.products(category_id,store_id);
create index if not exists wallet_entry_tenant_account_idx on public.wallet_entries(account_id,store_id);

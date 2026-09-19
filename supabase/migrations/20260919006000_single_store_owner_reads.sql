-- Shut down legacy rental onboarding while preserving historical data.
revoke execute on function public.create_draft_store(text,text) from authenticated;
revoke execute on function public.set_store_operational_status(uuid,text,text) from authenticated;
-- Store owners need audited operational visibility over their OWN customer data.
create policy wallet_accounts_store_owner_read on public.wallet_accounts
 for select to authenticated
 using(exists(select 1 from public.stores s where s.id=wallet_accounts.store_id and s.slug='otpthai' and s.owner_id=(select auth.uid())));
create policy wallet_entries_store_owner_read on public.wallet_entries
 for select to authenticated
 using(exists(select 1 from public.stores s where s.id=wallet_entries.store_id and s.slug='otpthai' and s.owner_id=(select auth.uid())));
create policy orders_store_owner_read on public.orders
 for select to authenticated
 using(exists(select 1 from public.stores s where s.id=orders.store_id and s.slug='otpthai' and s.owner_id=(select auth.uid())));
create policy order_items_store_owner_read on public.order_items
 for select to authenticated
 using(exists(select 1 from public.stores s where s.id=order_items.store_id and s.slug='otpthai' and s.owner_id=(select auth.uid())));

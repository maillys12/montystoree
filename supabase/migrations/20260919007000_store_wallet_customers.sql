-- Accurate complete balances per customer, not a truncated client-side ledger sum.
-- Only the owner of the single active OTPTHAI shop may call this operation.
create function public.store_wallet_customers()
returns table(user_id uuid,email text,balance_satang bigint,order_count bigint)
language sql security definer set search_path=''
as $$
 select a.user_id,u.email::text,
        coalesce((select sum(e.amount_satang) from public.wallet_entries e where e.store_id=a.store_id and e.account_id=a.id),0)::bigint,
        (select count(*) from public.orders o where o.store_id=a.store_id and o.customer_id=a.user_id)::bigint
 from public.wallet_accounts a
 join auth.users u on u.id=a.user_id
 join public.stores s on s.id=a.store_id
 where s.slug='otpthai' and s.owner_id=(select auth.uid());
$$;
revoke all on function public.store_wallet_customers() from public,anon;
grant execute on function public.store_wallet_customers() to authenticated;

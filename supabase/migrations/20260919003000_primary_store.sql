-- Create the operator's primary store, separated from rental tenants.
-- Resolve owner through the existing user-owned maillys draft rather than a hardcoded user UUID.
with owner_user as (
 select owner_id from public.stores where slug='maillys' and name='maillys'
), created as (
 insert into public.stores(slug,name,owner_id,status)
 select 'otpthai','OTPTHAI',owner_id,'active' from owner_user
 where not exists (select 1 from public.stores where slug='otpthai')
 returning id,owner_id
)
insert into public.store_members(store_id,user_id,role)
select id,owner_id,'owner' from created
on conflict (store_id,user_id) do nothing;

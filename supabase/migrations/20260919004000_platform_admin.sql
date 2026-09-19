-- Platform administration is distinct from tenant ownership.
-- Only a verified account which owns the platform's primary store is provisioned here.
create table public.platform_admins (
 user_id uuid primary key references auth.users(id) on delete cascade,
 role text not null default 'super_admin' check(role = 'super_admin'),
 created_at timestamptz not null default now()
);
alter table public.platform_admins enable row level security;
revoke all on public.platform_admins from anon, authenticated;
grant select on public.platform_admins to authenticated;
create policy platform_admin_self_read on public.platform_admins for select to authenticated
 using (user_id=(select auth.uid()));
insert into public.platform_admins(user_id)
select u.id from auth.users u
join public.stores s on s.owner_id=u.id and s.slug='otpthai'
where u.email='chanakanppn@gmail.com' and u.email_confirmed_at is not null
on conflict(user_id) do nothing;

-- The administration dashboard may inspect every tenant without gaining
-- direct table writes or exposing another tenant to ordinary shop owners.
create policy platform_admin_stores_read on public.stores for select to authenticated
 using (exists (
  select 1 from public.platform_admins a
  where a.user_id=(select auth.uid()) and a.role='super_admin'
 ));

create table public.store_status_events (
 id uuid primary key default gen_random_uuid(),
 store_id uuid not null references public.stores(id),
 actor_id uuid not null references auth.users(id),
 previous_status text not null,
 next_status text not null,
 note text not null check(char_length(note) between 10 and 500),
 created_at timestamptz not null default now()
);
create index store_status_events_store_idx on public.store_status_events(store_id,created_at desc);
alter table public.store_status_events enable row level security;
revoke all on public.store_status_events from anon,authenticated;
grant select on public.store_status_events to authenticated;
create policy platform_admin_events_read on public.store_status_events for select to authenticated
 using(exists(select 1 from public.platform_admins a where a.user_id=(select auth.uid()) and a.role='super_admin'));

-- An explicit manual operational approval: this does NOT represent payment
-- verification, active billing, or a collected subscription.
create function public.set_store_operational_status(
 p_store_id uuid, p_new_status text, p_note text
) returns void language plpgsql security definer set search_path=''
as $$
declare v_actor uuid := (select auth.uid()); v_previous text; v_note text := trim(coalesce(p_note,''));
begin
 if v_actor is null or not exists(
  select 1 from public.platform_admins a
  where a.user_id=v_actor and a.role='super_admin'
 ) then raise exception 'Platform administrator required'; end if;
 if p_new_status not in ('active','suspended') then raise exception 'Invalid target status'; end if;
 if char_length(v_note) not between 10 and 500 then raise exception 'Approval note must be 10-500 characters'; end if;
 select status into v_previous from public.stores
 where id=p_store_id and slug <> 'otpthai'
 for update;
 if not found then raise exception 'Tenant store not found'; end if;
 if v_previous=p_new_status then raise exception 'Store is already in that status'; end if;
 if v_previous not in ('pending','active','suspended') then raise exception 'Invalid status transition'; end if;
 update public.stores
 set status=p_new_status, updated_at=now()
 where id=p_store_id;
 insert into public.store_status_events(store_id,actor_id,previous_status,next_status,note)
 values(p_store_id,v_actor,v_previous,p_new_status,v_note);
end $$;
revoke all on function public.set_store_operational_status(uuid,text,text) from public,anon;
grant execute on function public.set_store_operational_status(uuid,text,text) to authenticated;

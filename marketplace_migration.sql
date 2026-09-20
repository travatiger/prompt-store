-- PromptHub Marketplace Upgrade
-- Safe, additive migration for the existing schema.
-- Run once in Supabase SQL Editor after taking a database backup.

begin;

-- ---------- Profiles / seller identity ----------
alter table public.profiles
  drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (role = any (array['customer','seller','admin']::text[]));

alter table public.profiles add column if not exists username text;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists bio text default '';
alter table public.profiles add column if not exists website_url text default '';
alter table public.profiles add column if not exists seller_status text default 'none';
alter table public.profiles add column if not exists seller_requested_at timestamptz;
alter table public.profiles add column if not exists seller_approved_at timestamptz;
alter table public.profiles add column if not exists seller_rejection_reason text default '';
alter table public.profiles add column if not exists payout_method text default 'Binance Pay';
alter table public.profiles add column if not exists payout_account text default '';
alter table public.profiles add column if not exists public_profile boolean default true;

alter table public.profiles drop constraint if exists profiles_seller_status_check;
alter table public.profiles add constraint profiles_seller_status_check
  check (seller_status = any (array['none','pending','approved','rejected']::text[]));

create unique index if not exists profiles_username_unique
  on public.profiles(lower(username)) where username is not null and length(trim(username)) > 0;

-- ---------- Products / ownership / moderation ----------
alter table public.products add column if not exists seller_id uuid references public.profiles(id) on delete set null;
alter table public.products add column if not exists approval_status text default 'approved';
alter table public.products add column if not exists rejection_reason text default '';
alter table public.products add column if not exists submitted_at timestamptz;
alter table public.products add column if not exists reviewed_at timestamptz;
alter table public.products add column if not exists reviewed_by uuid references public.profiles(id) on delete set null;
alter table public.products add column if not exists seller_price_locked numeric;

alter table public.products drop constraint if exists products_approval_status_check;
alter table public.products add constraint products_approval_status_check
  check (approval_status = any (array['draft','pending','approved','rejected','suspended']::text[]));

-- Existing admin-owned products remain approved and seller_id NULL.
update public.products set approval_status='approved' where approval_status is null;

create index if not exists products_seller_idx on public.products(seller_id, created_at desc);
create index if not exists products_approval_idx on public.products(approval_status, active, created_at desc);

-- ---------- Orders: seller + fee snapshot ----------
alter table public.orders add column if not exists seller_id uuid references public.profiles(id) on delete set null;
alter table public.orders add column if not exists platform_fee numeric default 0;
alter table public.orders add column if not exists seller_amount numeric default 0;
alter table public.orders add column if not exists commission_percent numeric default 0;

alter table public.orders drop constraint if exists orders_money_check;
alter table public.orders add constraint orders_money_check
  check (amount >= 0 and platform_fee >= 0 and seller_amount >= 0 and platform_fee + seller_amount = amount);

create index if not exists orders_seller_idx on public.orders(seller_id, created_at desc);

-- ---------- Platform settings ----------
create table if not exists public.marketplace_settings (
  id boolean primary key default true check (id),
  commission_percent numeric not null default 20 check (commission_percent >= 0 and commission_percent <= 100),
  min_price numeric not null default 0 check (min_price >= 0),
  max_price numeric not null default 10000 check (max_price > 0),
  seller_auto_approve boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);
insert into public.marketplace_settings(id) values(true) on conflict (id) do nothing;

-- Prevent users from self-promoting to admin/seller through direct profile UPDATEs.
create or replace function public.guard_profile_privileges()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if auth.uid() = old.id and not public.is_admin() then
    new.role := old.role;
    -- seller_status is changed by the controlled seller application/admin functions.
    if new.seller_status is distinct from old.seller_status and new.seller_status <> 'pending' then
      new.seller_status := old.seller_status;
    end if;
    new.seller_approved_at := old.seller_approved_at;
  end if;
  return new;
end; $$;
drop trigger if exists profiles_privilege_guard on public.profiles;
create trigger profiles_privilege_guard before update on public.profiles
for each row execute function public.guard_profile_privileges();

-- ---------- Seller applications / moderation audit ----------
create table if not exists public.seller_applications (
  id bigint generated by default as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check(status in ('pending','approved','rejected')),
  message text not null default '',
  admin_note text not null default '',
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null
);
create unique index if not exists seller_applications_one_open
  on public.seller_applications(user_id) where status='pending';

-- ---------- Seller payouts (manual, because existing Binance Pay receives platform payments) ----------
create table if not exists public.seller_payouts (
  id bigint generated by default as identity primary key,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric not null check(amount > 0),
  currency text not null default 'USD' check(currency ~ '^[A-Z]{3}$'),
  method text not null default 'Binance Pay',
  destination text not null default '',
  status text not null default 'requested' check(status in ('requested','approved','paid','rejected','cancelled')),
  note text not null default '',
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  paid_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null
);
create index if not exists seller_payouts_seller_idx on public.seller_payouts(seller_id, created_at desc);

-- ---------- Security helpers ----------
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path=public
as $$
  select exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin');
$$;

create or replace function public.is_seller()
returns boolean
language sql stable security definer set search_path=public
as $$
  select exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='seller' and p.seller_status='approved');
$$;

-- ---------- Public seller profile helper ----------
create or replace function public.get_public_seller(p_username text)
returns table(id uuid, username text, full_name text, avatar_url text, bio text, website_url text, created_at timestamptz)
language sql stable security definer set search_path=public
as $$
  select p.id,p.username,p.full_name,p.avatar_url,p.bio,p.website_url,p.created_at
  from public.profiles p
  where lower(p.username)=lower(trim(p_username))
    and p.role='seller' and p.seller_status='approved' and p.public_profile=true;
$$;

-- ---------- Seller application ----------
create or replace function public.apply_as_seller(p_username text, p_bio text, p_message text, p_website_url text default '')
returns bigint
language plpgsql security definer set search_path=public
as $$
declare uid uuid:=auth.uid(); aid bigint;
begin
  if uid is null then raise exception 'You must be logged in.'; end if;
  if exists(select 1 from public.profiles where id=uid and role='admin') then raise exception 'Admins do not need a seller application.'; end if;
  if exists(select 1 from public.profiles where id=uid and role='seller' and seller_status='approved') then raise exception 'You are already an approved seller.'; end if;
  if p_username is null or length(trim(p_username)) < 3 or length(trim(p_username)) > 32 or trim(p_username) !~ '^[A-Za-z0-9_]+$' then
    raise exception 'Username must be 3-32 characters and use only letters, numbers, or underscores.';
  end if;
  if exists(select 1 from public.profiles where lower(username)=lower(trim(p_username)) and id<>uid) then raise exception 'Username is already taken.'; end if;
  update public.profiles set username=trim(p_username), bio=left(coalesce(p_bio,''),1000), website_url=left(coalesce(p_website_url,''),300), seller_status='pending', seller_requested_at=now(), seller_rejection_reason='' where id=uid;
  insert into public.seller_applications(user_id,message) values(uid,left(coalesce(p_message,''),2000)) returning id into aid;
  return aid;
end;
$$;

-- ---------- Seller product CRUD ----------
create or replace function public.seller_save_product(
  p_id bigint, p_name text, p_category text, p_price numeric, p_currency text,
  p_description text, p_prompt text, p_image_url text, p_video_url text,
  p_is_free boolean, p_submit boolean
) returns bigint
language plpgsql security definer set search_path=public
as $$
declare uid uuid:=auth.uid(); pid bigint; minp numeric; maxp numeric;
begin
  if not public.is_seller() then raise exception 'Seller access required.'; end if;
  select min_price,max_price into minp,maxp from public.marketplace_settings where id=true;
  if coalesce(p_is_free,false) then p_price:=0; else if p_price is null or p_price<minp or p_price>maxp then raise exception 'Price must be between % and %.',minp,maxp; end if; end if;
  if length(trim(coalesce(p_name,''))) not between 1 and 120 then raise exception 'Product name is required.'; end if;
  if p_category not in ('image','video','youtube','business') then raise exception 'Invalid category.'; end if;
  if p_currency !~ '^[A-Z]{3}$' then raise exception 'Currency must be a 3-letter uppercase code.'; end if;
  if p_id is null then
    insert into public.products(name,category,description,price,currency,active,image_url,video_url,is_free,featured,seller_id,approval_status,submitted_at)
    values(trim(p_name),p_category,coalesce(p_description,''),p_price,p_currency,case when p_submit then false else false end,p_image_url,p_video_url,coalesce(p_is_free,false),false,uid,case when p_submit then 'pending' else 'draft' end,case when p_submit then now() else null end)
    returning id into pid;
  else
    if not exists(select 1 from public.products where id=p_id and seller_id=uid) then raise exception 'Product not found.'; end if;
    update public.products set name=trim(p_name),category=p_category,description=coalesce(p_description,''),price=p_price,currency=p_currency,image_url=p_image_url,video_url=p_video_url,is_free=coalesce(p_is_free,false),active=false,approval_status=case when p_submit then 'pending' else 'draft' end,submitted_at=case when p_submit then now() else submitted_at end,rejection_reason=case when p_submit then '' else rejection_reason end,reviewed_at=null,reviewed_by=null where id=p_id returning id into pid;
  end if;
  insert into public.product_prompts(product_id,prompt) values(pid,coalesce(p_prompt,'')) on conflict (product_id) do update set prompt=excluded.prompt;
  return pid;
end;
$$;

create or replace function public.seller_submit_product(p_id bigint)
returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.is_seller() then raise exception 'Seller access required.'; end if;
  update public.products set approval_status='pending',active=false,submitted_at=now(),rejection_reason='',reviewed_at=null,reviewed_by=null where id=p_id and seller_id=auth.uid();
  if not found then raise exception 'Product not found.'; end if;
end; $$;

create or replace function public.seller_delete_product(p_id bigint)
returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.is_seller() then raise exception 'Seller access required.'; end if;
  delete from public.products where id=p_id and seller_id=auth.uid() and not exists(select 1 from public.orders o where o.product_id=p_id and o.status='paid');
  if not found then raise exception 'Product cannot be deleted after a completed sale; deactivate it instead.'; end if;
end; $$;

-- ---------- Seller analytics ----------
create or replace function public.get_seller_dashboard()
returns table(products_count bigint,pending_count bigint,approved_count bigint,total_sales numeric,total_earnings numeric,pending_payout numeric)
language sql stable security definer set search_path=public
as $$
  select
    (select count(*) from products where seller_id=auth.uid()),
    (select count(*) from products where seller_id=auth.uid() and approval_status='pending'),
    (select count(*) from products where seller_id=auth.uid() and approval_status='approved' and active),
    coalesce((select sum(amount) from orders where seller_id=auth.uid() and status='paid'),0),
    coalesce((select sum(seller_amount) from orders where seller_id=auth.uid() and status='paid'),0),
    coalesce((select sum(o.seller_amount) from orders o where o.seller_id=auth.uid() and o.status='paid') - coalesce((select sum(sp.amount) from seller_payouts sp where sp.seller_id=auth.uid() and sp.status in ('approved','paid')),0),0);
$$;

-- ---------- Buyer order creation: preserve existing Binance Pay flow, snapshot seller/fee ----------
create or replace function public.create_order(p_product_id bigint)
returns bigint language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); p public.products%rowtype; oid bigint; fee_pct numeric; fee numeric; seller_amt numeric;
begin
  if uid is null then raise exception 'You must be logged in.'; end if;
  select * into p from public.products where id=p_product_id and active=true and approval_status='approved';
  if not found then raise exception 'This prompt is not available.'; end if;
  if p.seller_id=uid then raise exception 'You cannot purchase your own prompt.'; end if;
  select commission_percent into fee_pct from public.marketplace_settings where id=true;
  fee:=round((p.price*coalesce(fee_pct,0)/100)::numeric,2); seller_amt:=greatest(p.price-fee,0);
  insert into public.orders(customer_id,product_id,amount,currency,status,seller_id,platform_fee,seller_amount,commission_percent)
  values(uid,p.id,p.price,p.currency,case when p.is_free or p.price=0 then 'paid' else 'pending' end,p.seller_id,fee,seller_amt,coalesce(fee_pct,0)) returning id into oid;
  return oid;
end; $$;

-- ---------- Admin controls ----------
create or replace function public.admin_set_seller_status(p_user_id uuid,p_status text,p_note text default '')
returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.is_admin() then raise exception 'Admin access required.'; end if;
  if p_status not in ('approved','rejected','none') then raise exception 'Invalid seller status.'; end if;
  update public.profiles set seller_status=p_status, role=case when p_status='approved' then 'seller' when p_status='none' then 'customer' else role end, seller_approved_at=case when p_status='approved' then now() else seller_approved_at end, seller_rejection_reason=case when p_status='rejected' then left(coalesce(p_note,''),1000) else '' end where id=p_user_id;
  update public.seller_applications set status=case when p_status='approved' then 'approved' when p_status='rejected' then 'rejected' else 'rejected' end,admin_note=left(coalesce(p_note,''),2000),reviewed_at=now(),reviewed_by=auth.uid() where user_id=p_user_id and status='pending';
end; $$;

create or replace function public.admin_review_seller_product(p_id bigint,p_approved boolean,p_note text default '')
returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.is_admin() then raise exception 'Admin access required.'; end if;
  update public.products set approval_status=case when p_approved then 'approved' else 'rejected' end,active=p_approved,rejection_reason=case when p_approved then '' else left(coalesce(p_note,''),1000) end,reviewed_at=now(),reviewed_by=auth.uid() where id=p_id and seller_id is not null;
  if not found then raise exception 'Seller product not found.'; end if;
end; $$;

create or replace function public.admin_update_marketplace_settings(p_commission numeric,p_min_price numeric,p_max_price numeric,p_auto_approve boolean)
returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.is_admin() then raise exception 'Admin access required.'; end if;
  if p_commission<0 or p_commission>100 or p_min_price<0 or p_max_price<=0 or p_min_price>p_max_price then raise exception 'Invalid marketplace settings.'; end if;
  update public.marketplace_settings set commission_percent=p_commission,min_price=p_min_price,max_price=p_max_price,seller_auto_approve=coalesce(p_auto_approve,false),updated_at=now(),updated_by=auth.uid() where id=true;
end; $$;

create or replace function public.seller_request_payout(p_amount numeric,p_currency text default 'USD')
returns bigint language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); available numeric; pid bigint; dest text;
begin
  if not public.is_seller() then raise exception 'Seller access required.'; end if;
  select coalesce(sum(o.seller_amount),0)-coalesce((select sum(sp.amount) from seller_payouts sp where sp.seller_id=uid and sp.status in ('approved','paid')),0) into available from orders o where o.seller_id=uid and o.status='paid';
  if p_amount<=0 or p_amount>available then raise exception 'Requested payout exceeds your available balance.'; end if;
  select payout_account into dest from profiles where id=uid;
  if coalesce(trim(dest),'')='' then raise exception 'Add your payout account in your profile first.'; end if;
  insert into seller_payouts(seller_id,amount,currency,method,destination) values(uid,p_amount,p_currency,'Binance Pay',dest) returning id into pid;
  return pid;
end; $$;

-- ---------- RLS ----------
alter table public.marketplace_settings enable row level security;
alter table public.seller_applications enable row level security;
alter table public.seller_payouts enable row level security;

-- Keep profile SELECT compatible with the existing app while exposing approved seller storefront profiles.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated using (id=auth.uid() or public.is_admin() or (role='seller' and seller_status='approved' and public_profile=true));

-- Product visibility: approved active products publicly visible; seller can see own listings; admin sees all.
drop policy if exists products_select on public.products;
create policy products_select on public.products for select to anon,authenticated using (active and approval_status='approved' or seller_id=auth.uid() or public.is_admin());

-- Lock direct product writes; seller writes go through security-definer RPCs.
drop policy if exists products_insert on public.products;
drop policy if exists products_update on public.products;
drop policy if exists products_delete on public.products;
create policy products_admin_insert on public.products for insert to authenticated with check (public.is_admin());
create policy products_admin_update on public.products for update to authenticated using(public.is_admin()) with check(public.is_admin());
create policy products_admin_delete on public.products for delete to authenticated using(public.is_admin());

-- Seller applications
create policy seller_applications_own_select on public.seller_applications for select to authenticated using(user_id=auth.uid() or public.is_admin());
create policy seller_applications_admin_update on public.seller_applications for update to authenticated using(public.is_admin()) with check(public.is_admin());

-- Payouts
create policy seller_payouts_own_select on public.seller_payouts for select to authenticated using(seller_id=auth.uid() or public.is_admin());
create policy seller_payouts_admin_update on public.seller_payouts for update to authenticated using(public.is_admin()) with check(public.is_admin());

-- Settings are public-read, admin-write.
create policy marketplace_settings_public_select on public.marketplace_settings for select to anon,authenticated using(true);
create policy marketplace_settings_admin_update on public.marketplace_settings for update to authenticated using(public.is_admin()) with check(public.is_admin());

-- Orders: seller can see only their own sales; buyer sees own; admin sees all.
drop policy if exists orders_select on public.orders;
create policy orders_select on public.orders for select to authenticated using(customer_id=auth.uid() or seller_id=auth.uid() or public.is_admin());

-- Storage: seller media upload path is scoped to their auth uid. Existing public bucket remains public.
create policy seller_product_media_insert on storage.objects for insert to authenticated
with check(bucket_id='product-media' and (name like 'seller/' || auth.uid()::text || '/%') and not public.is_admin());
create policy seller_product_media_update on storage.objects for update to authenticated
using(bucket_id='product-media' and name like 'seller/' || auth.uid()::text || '/%')
with check(bucket_id='product-media' and name like 'seller/' || auth.uid()::text || '/%');
create policy seller_product_media_delete on storage.objects for delete to authenticated
using(bucket_id='product-media' and name like 'seller/' || auth.uid()::text || '/%');

-- Permissions: authenticated users can call RPCs; functions enforce ownership/admin.
grant execute on function public.is_seller() to anon,authenticated;
grant execute on function public.get_public_seller(text) to anon,authenticated;
grant execute on function public.apply_as_seller(text,text,text,text) to authenticated;
grant execute on function public.seller_save_product(bigint,text,text,numeric,text,text,text,text,text,boolean,boolean) to authenticated;
grant execute on function public.seller_submit_product(bigint) to authenticated;
grant execute on function public.seller_delete_product(bigint) to authenticated;
grant execute on function public.get_seller_dashboard() to authenticated;
grant execute on function public.admin_set_seller_status(uuid,text,text) to authenticated;
grant execute on function public.admin_review_seller_product(bigint,boolean,text) to authenticated;
grant execute on function public.admin_update_marketplace_settings(numeric,numeric,numeric,boolean) to authenticated;
grant execute on function public.seller_request_payout(numeric,text) to authenticated;

grant select on public.marketplace_settings to anon,authenticated;
grant select on public.seller_applications to authenticated;
grant select on public.seller_payouts to authenticated;

grant select,insert,update,delete on public.products to authenticated;
grant select on public.orders to authenticated;

commit;

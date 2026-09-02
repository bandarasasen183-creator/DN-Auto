-- =====================================================================
-- 003 — promotions, discounts and referrals
-- Run after 002. Safe to re-run.
-- =====================================================================

do $$ begin
  create type promo_trigger as enum (
    'code',           -- customer types a code
    'first_booking',  -- automatic, on someone's first ever booking
    'referral',       -- a code that belongs to an existing customer
    'always'          -- a seasonal offer applied to every booking
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type promo_kind as enum ('percent', 'fixed');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- Promotions. Admin creates and retires these; nothing is hard-coded.
-- ---------------------------------------------------------------------
create table if not exists promotions (
  id              uuid primary key default uuid_generate_v4(),
  code            text unique,          -- null for automatic promotions
  name            text not null,
  description     text,
  trigger         promo_trigger not null default 'code',
  kind            promo_kind not null default 'percent',
  -- percent: whole percent (5 = 5%). fixed: LKR cents.
  value           int not null check (value > 0),
  -- A percentage discount on a big engine job can get expensive; this caps it.
  max_discount_cents bigint,
  min_spend_cents    bigint not null default 0,
  starts_on       date,
  ends_on         date,
  usage_limit     int,                  -- total redemptions allowed, null = no cap
  per_customer_limit int not null default 1,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now()
);

-- Every promotion applied to a booking, so reporting and the per-customer
-- limit are answerable from the data rather than guessed at.
create table if not exists promotion_redemptions (
  id             uuid primary key default uuid_generate_v4(),
  promotion_id   uuid not null references promotions(id) on delete cascade,
  booking_id     uuid not null references bookings(id) on delete cascade,
  customer_id    uuid not null references profiles(id) on delete cascade,
  -- Who gets credited when this was somebody's referral code.
  referrer_id    uuid references profiles(id) on delete set null,
  discount_cents bigint not null default 0,
  created_at     timestamptz not null default now(),
  unique (booking_id, promotion_id)
);
create index if not exists redemptions_promo_idx on promotion_redemptions(promotion_id);
create index if not exists redemptions_customer_idx on promotion_redemptions(customer_id);

-- ---------------------------------------------------------------------
-- Bookings and quotes carry the discount so it survives on the paperwork.
-- ---------------------------------------------------------------------
alter table bookings add column if not exists promotion_id uuid references promotions(id) on delete set null;
alter table bookings add column if not exists discount_cents bigint not null default 0;
alter table quotes   add column if not exists discount_cents bigint not null default 0;

-- ---------------------------------------------------------------------
-- Referral codes. Every customer gets one; giving it to a friend earns both
-- of them a discount.
-- ---------------------------------------------------------------------
alter table profiles add column if not exists referral_code text unique;

create or replace function assign_referral_code() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  candidate text;
begin
  if new.referral_code is not null then return new; end if;

  -- Short, readable, no ambiguous characters to misread over the phone.
  loop
    candidate := 'DN' || upper(substr(translate(encode(gen_random_bytes(6), 'base64'),
                                                'OI01+/=', 'XYZWabc'), 1, 5));
    exit when not exists (select 1 from profiles where referral_code = candidate);
  end loop;

  new.referral_code := candidate;
  return new;
end $$;

drop trigger if exists profiles_referral_code on profiles;
create trigger profiles_referral_code before insert on profiles
  for each row execute function assign_referral_code();

-- Backfill anyone who already has an account.
update profiles set referral_code = null where referral_code = '';
do $$
declare r record; candidate text;
begin
  for r in select id from profiles where referral_code is null loop
    loop
      candidate := 'DN' || upper(substr(translate(encode(gen_random_bytes(6), 'base64'),
                                                  'OI01+/=', 'XYZWabc'), 1, 5));
      exit when not exists (select 1 from profiles where referral_code = candidate);
    end loop;
    update profiles set referral_code = candidate where id = r.id;
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table promotions            enable row level security;
alter table promotion_redemptions enable row level security;

-- Anyone may read a live promotion — that is the point of advertising one.
drop policy if exists promotions_read on promotions;
create policy promotions_read on promotions for select
  using (
    is_staff()
    or (
      is_active
      and (starts_on is null or starts_on <= current_date)
      and (ends_on is null or ends_on >= current_date)
    )
  );

drop policy if exists promotions_admin_write on promotions;
create policy promotions_admin_write on promotions for all
  using (is_admin()) with check (is_admin());

drop policy if exists redemptions_read on promotion_redemptions;
create policy redemptions_read on promotion_redemptions for select
  using (customer_id = auth.uid() or referrer_id = auth.uid() or is_staff());

drop policy if exists redemptions_insert on promotion_redemptions;
create policy redemptions_insert on promotion_redemptions for insert
  with check (customer_id = auth.uid() or is_staff());

drop policy if exists redemptions_admin_write on promotion_redemptions;
create policy redemptions_admin_write on promotion_redemptions for all
  using (is_admin()) with check (is_admin());

-- ---------------------------------------------------------------------
-- The two promotions the workshop starts with.
-- ---------------------------------------------------------------------
insert into promotions (code, name, description, trigger, kind, value, per_customer_limit)
values
  (null, 'First booking online', 'Five percent off your first booking made through the website.',
   'first_booking', 'percent', 5, 1),
  ('FRIEND', 'Invite a friend', 'Your friend gets 5% off their first visit, and you get LKR 1,000 off your next one.',
   'referral', 'percent', 5, 99)
on conflict (code) do nothing;

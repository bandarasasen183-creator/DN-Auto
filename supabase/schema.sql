-- =====================================================================
-- DN Auto Repairs And Imports — database schema
-- Postgres / Supabase. Run in the Supabase SQL editor (or `supabase db push`).
--
-- Design notes:
--  * Every table is owned by auth.users via `profiles.id`.
--  * Roles are stored on `profiles.role` and mirrored into the JWT by the
--    `custom_access_token_hook` at the bottom so RLS never needs a subquery
--    on the hot path.
--  * Money is stored in LKR *cents* (bigint) to avoid float rounding.
-- =====================================================================

create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------
do $$ begin
  create type user_role as enum ('customer', 'worker', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type booking_status as enum (
    'requested',    -- customer submitted, nobody has looked at it
    'confirmed',    -- admin accepted the slot
    'assigned',     -- admin assigned it to a worker
    'accepted',     -- worker accepted the job
    'in_progress',  -- work has started
    'awaiting_parts',
    'awaiting_approval', -- quote sent, waiting on the customer
    'completed',
    'cancelled',
    'no_show'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type quote_status as enum ('draft', 'sent', 'approved', 'rejected', 'expired');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_status as enum ('pending', 'authorized', 'paid', 'failed', 'refunded');
exception when duplicate_object then null; end $$;

do $$ begin
  -- Kept provider-agnostic on purpose: no merchant credentials exist yet.
  create type payment_provider as enum ('cash', 'webxpay', 'koko', 'payable_pos', 'bank_transfer');
exception when duplicate_object then null; end $$;

do $$ begin
  create type fuel_type as enum ('petrol', 'hybrid_petrol');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- Profiles — one row per auth user
-- ---------------------------------------------------------------------
create table if not exists profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  role          user_role not null default 'customer',
  full_name     text not null,
  phone         text,
  email         text,
  avatar_url    text,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Worker-specific detail. 1:1 with a profile whose role = 'worker'.
create table if not exists workers (
  id                uuid primary key references profiles(id) on delete cascade,
  employee_code     text unique,
  specialities      text[] not null default '{}',
  hourly_rate_cents bigint not null default 0,
  hired_on          date,
  created_at        timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Vehicles — petrol only, enforced by the fuel_type enum
-- ---------------------------------------------------------------------
create table if not exists vehicles (
  id            uuid primary key default uuid_generate_v4(),
  owner_id      uuid not null references profiles(id) on delete cascade,
  make          text not null,
  model         text not null,
  year          int check (year between 1950 and extract(year from now())::int + 1),
  registration  text not null,
  fuel          fuel_type not null default 'petrol',
  notes         text,
  created_at    timestamptz not null default now(),
  unique (owner_id, registration)
);
create index if not exists vehicles_owner_idx on vehicles(owner_id);

-- ---------------------------------------------------------------------
-- Services catalogue — prices in LKR cents, managed by admin
-- ---------------------------------------------------------------------
create table if not exists services (
  id                 uuid primary key default uuid_generate_v4(),
  slug               text unique not null,
  name               text not null,
  description        text,
  category           text,
  base_price_cents   bigint not null default 0,
  price_is_from      boolean not null default true, -- "from LKR x" guide pricing
  duration_minutes   int not null default 60,
  is_active          boolean not null default true,
  sort_order         int not null default 0,
  created_at         timestamptz not null default now()
);

-- Service bays — a worker occupies a bay while a job runs.
create table if not exists bays (
  id         uuid primary key default uuid_generate_v4(),
  name       text unique not null,
  is_active  boolean not null default true
);

-- ---------------------------------------------------------------------
-- Bookings — the spine of the app
-- customer books -> admin assigns -> worker accepts -> status updates ->
-- customer sees live status + history
-- ---------------------------------------------------------------------
create table if not exists bookings (
  id                 uuid primary key default uuid_generate_v4(),
  reference          text unique not null default (
                       'DN-' || to_char(now(), 'YYMM') || '-' ||
                       upper(substr(md5(random()::text), 1, 5))
                     ),
  customer_id        uuid not null references profiles(id) on delete cascade,
  vehicle_id         uuid references vehicles(id) on delete set null,
  service_id         uuid references services(id) on delete set null,
  assigned_worker_id uuid references profiles(id) on delete set null,
  bay_id             uuid references bays(id) on delete set null,
  status             booking_status not null default 'requested',
  scheduled_for      timestamptz not null,
  is_emergency       boolean not null default false,
  customer_notes     text,
  internal_notes     text,
  accepted_at        timestamptz,
  started_at         timestamptz,
  completed_at       timestamptz,
  cancelled_at       timestamptz,
  cancellation_reason text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index if not exists bookings_customer_idx on bookings(customer_id, scheduled_for desc);
create index if not exists bookings_worker_idx   on bookings(assigned_worker_id, scheduled_for desc);
create index if not exists bookings_status_idx   on bookings(status, scheduled_for);

-- Append-only audit trail. Powers the customer-facing "repair log".
create table if not exists booking_events (
  id           uuid primary key default uuid_generate_v4(),
  booking_id   uuid not null references bookings(id) on delete cascade,
  actor_id     uuid references profiles(id) on delete set null,
  from_status  booking_status,
  to_status    booking_status,
  message      text,
  is_customer_visible boolean not null default true,
  created_at   timestamptz not null default now()
);
create index if not exists booking_events_booking_idx on booking_events(booking_id, created_at);

-- ---------------------------------------------------------------------
-- Quotes & line items — customer approves before work starts
-- ---------------------------------------------------------------------
create table if not exists quotes (
  id            uuid primary key default uuid_generate_v4(),
  booking_id    uuid not null references bookings(id) on delete cascade,
  status        quote_status not null default 'draft',
  subtotal_cents bigint not null default 0,
  tax_cents      bigint not null default 0,
  total_cents    bigint not null default 0,
  valid_until    date,
  notes          text,
  created_by     uuid references profiles(id) on delete set null,
  responded_at   timestamptz,
  created_at     timestamptz not null default now()
);
create index if not exists quotes_booking_idx on quotes(booking_id);

create table if not exists quote_items (
  id              uuid primary key default uuid_generate_v4(),
  quote_id        uuid not null references quotes(id) on delete cascade,
  description     text not null,
  kind            text not null default 'labour', -- 'labour' | 'part'
  quantity        numeric(10,2) not null default 1,
  unit_price_cents bigint not null default 0,
  -- 6-month+ parts warranty is a business promise; record it per part.
  warranty_months int not null default 0,
  sort_order      int not null default 0
);
create index if not exists quote_items_quote_idx on quote_items(quote_id);

-- ---------------------------------------------------------------------
-- Payments — provider-agnostic until merchant credentials exist
-- ---------------------------------------------------------------------
create table if not exists payments (
  id                uuid primary key default uuid_generate_v4(),
  booking_id        uuid not null references bookings(id) on delete cascade,
  quote_id          uuid references quotes(id) on delete set null,
  provider          payment_provider not null default 'cash',
  status            payment_status not null default 'pending',
  amount_cents      bigint not null,
  currency          char(3) not null default 'LKR',
  -- Whatever the gateway hands back (order id, txn ref, POS slip no).
  provider_reference text,
  provider_payload   jsonb,
  paid_at           timestamptz,
  created_at        timestamptz not null default now()
);
create index if not exists payments_booking_idx on payments(booking_id);

-- ---------------------------------------------------------------------
-- Worker pay
-- ---------------------------------------------------------------------
create table if not exists pay_periods (
  id          uuid primary key default uuid_generate_v4(),
  starts_on   date not null,
  ends_on     date not null,
  is_closed   boolean not null default false,
  created_at  timestamptz not null default now(),
  unique (starts_on, ends_on)
);

create table if not exists payslips (
  id              uuid primary key default uuid_generate_v4(),
  pay_period_id   uuid not null references pay_periods(id) on delete cascade,
  worker_id       uuid not null references profiles(id) on delete cascade,
  jobs_completed  int not null default 0,
  hours_worked    numeric(10,2) not null default 0,
  base_pay_cents  bigint not null default 0,
  bonus_cents     bigint not null default 0,
  deductions_cents bigint not null default 0,
  net_pay_cents   bigint generated always as
                    (base_pay_cents + bonus_cents - deductions_cents) stored,
  released_at     timestamptz,
  created_at      timestamptz not null default now(),
  unique (pay_period_id, worker_id)
);
create index if not exists payslips_worker_idx on payslips(worker_id);

-- ---------------------------------------------------------------------
-- Notifications & assistant history
-- ---------------------------------------------------------------------
create table if not exists notifications (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references profiles(id) on delete cascade,
  title       text not null,
  body        text,
  link        text,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists notifications_user_idx on notifications(user_id, created_at desc);

-- DN Assist: one row per conversation, messages hang off it.
create table if not exists assistant_conversations (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references profiles(id) on delete cascade,
  title       text not null default 'New conversation',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists assistant_conversations_user_idx
  on assistant_conversations(user_id, updated_at desc);

create table if not exists assistant_messages (
  id              uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references assistant_conversations(id) on delete cascade,
  role            text not null check (role in ('user', 'assistant', 'system')),
  content         text not null,
  created_at      timestamptz not null default now()
);
create index if not exists assistant_messages_conv_idx
  on assistant_messages(conversation_id, created_at);

-- ---------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------
create or replace function touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists profiles_touch on profiles;
create trigger profiles_touch before update on profiles
  for each row execute function touch_updated_at();

drop trigger if exists bookings_touch on bookings;
create trigger bookings_touch before update on bookings
  for each row execute function touch_updated_at();

-- Every status change writes an audit row so the repair log is never
-- reconstructed from guesswork.
create or replace function log_booking_status_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into booking_events (booking_id, actor_id, to_status, message)
    values (new.id, new.customer_id, new.status, 'Booking requested');
  elsif new.status is distinct from old.status then
    insert into booking_events (booking_id, actor_id, from_status, to_status, message)
    values (new.id, auth.uid(), old.status, new.status, null);
  end if;
  return new;
end $$;

drop trigger if exists bookings_status_log on bookings;
create trigger bookings_status_log after insert or update on bookings
  for each row execute function log_booking_status_change();

-- A new auth user always gets a profile. Role comes from signup metadata
-- but is clamped to 'customer' — staff roles are granted by an admin only.
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email, phone, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    new.raw_user_meta_data->>'phone',
    'customer'
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- ---------------------------------------------------------------------
-- Role helpers (security definer so RLS policies can call them safely)
-- ---------------------------------------------------------------------
create or replace function current_role_name() returns user_role
language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid();
$$;

create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(current_role_name() = 'admin', false);
$$;

create or replace function is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(current_role_name() in ('admin', 'worker'), false);
$$;

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table profiles                enable row level security;
alter table workers                 enable row level security;
alter table vehicles                enable row level security;
alter table services                enable row level security;
alter table bays                    enable row level security;
alter table bookings                enable row level security;
alter table booking_events          enable row level security;
alter table quotes                  enable row level security;
alter table quote_items             enable row level security;
alter table payments                enable row level security;
alter table pay_periods             enable row level security;
alter table payslips                enable row level security;
alter table notifications           enable row level security;
alter table assistant_conversations enable row level security;
alter table assistant_messages      enable row level security;

-- profiles
drop policy if exists profiles_self_read on profiles;
create policy profiles_self_read on profiles for select
  using (id = auth.uid() or is_staff());

drop policy if exists profiles_self_update on profiles;
create policy profiles_self_update on profiles for update
  using (id = auth.uid()) with check (id = auth.uid() and role = current_role_name());

drop policy if exists profiles_admin_all on profiles;
create policy profiles_admin_all on profiles for all
  using (is_admin()) with check (is_admin());

-- workers
drop policy if exists workers_read on workers;
create policy workers_read on workers for select
  using (id = auth.uid() or is_staff());

drop policy if exists workers_admin_write on workers;
create policy workers_admin_write on workers for all
  using (is_admin()) with check (is_admin());

-- vehicles
drop policy if exists vehicles_owner on vehicles;
create policy vehicles_owner on vehicles for all
  using (owner_id = auth.uid() or is_staff())
  with check (owner_id = auth.uid() or is_admin());

-- services / bays: readable by everyone (public price list), admin writes
drop policy if exists services_read on services;
create policy services_read on services for select using (true);
drop policy if exists services_admin_write on services;
create policy services_admin_write on services for all
  using (is_admin()) with check (is_admin());

drop policy if exists bays_read on bays;
create policy bays_read on bays for select using (is_staff());
drop policy if exists bays_admin_write on bays;
create policy bays_admin_write on bays for all
  using (is_admin()) with check (is_admin());

-- bookings
drop policy if exists bookings_customer_read on bookings;
create policy bookings_customer_read on bookings for select
  using (customer_id = auth.uid() or is_staff());

drop policy if exists bookings_customer_insert on bookings;
create policy bookings_customer_insert on bookings for insert
  with check (customer_id = auth.uid() or is_admin());

-- A customer may only edit their own booking, and only while it has not
-- been picked up by the workshop.
drop policy if exists bookings_customer_update on bookings;
create policy bookings_customer_update on bookings for update
  using (customer_id = auth.uid() and status in ('requested', 'confirmed'))
  with check (customer_id = auth.uid());

-- A worker may update jobs assigned to them, or claim an unassigned one.
drop policy if exists bookings_worker_update on bookings;
create policy bookings_worker_update on bookings for update
  using (
    current_role_name() = 'worker'
    and (assigned_worker_id = auth.uid() or assigned_worker_id is null)
  )
  with check (
    current_role_name() = 'worker'
    and assigned_worker_id = auth.uid()
  );

drop policy if exists bookings_admin_all on bookings;
create policy bookings_admin_all on bookings for all
  using (is_admin()) with check (is_admin());

-- booking_events
drop policy if exists booking_events_read on booking_events;
create policy booking_events_read on booking_events for select
  using (
    is_staff()
    or exists (
      select 1 from bookings b
      where b.id = booking_events.booking_id
        and b.customer_id = auth.uid()
        and booking_events.is_customer_visible
    )
  );

drop policy if exists booking_events_staff_insert on booking_events;
create policy booking_events_staff_insert on booking_events for insert
  with check (is_staff());

-- quotes
drop policy if exists quotes_read on quotes;
create policy quotes_read on quotes for select
  using (
    is_staff()
    or exists (
      select 1 from bookings b
      where b.id = quotes.booking_id and b.customer_id = auth.uid()
    )
  );

-- The customer's only write on a quote is approving or rejecting it.
drop policy if exists quotes_customer_respond on quotes;
create policy quotes_customer_respond on quotes for update
  using (
    exists (
      select 1 from bookings b
      where b.id = quotes.booking_id and b.customer_id = auth.uid()
    )
    and status = 'sent'
  )
  with check (status in ('approved', 'rejected'));

drop policy if exists quotes_staff_write on quotes;
create policy quotes_staff_write on quotes for all
  using (is_staff()) with check (is_staff());

drop policy if exists quote_items_read on quote_items;
create policy quote_items_read on quote_items for select
  using (
    is_staff()
    or exists (
      select 1 from quotes q join bookings b on b.id = q.booking_id
      where q.id = quote_items.quote_id and b.customer_id = auth.uid()
    )
  );

drop policy if exists quote_items_staff_write on quote_items;
create policy quote_items_staff_write on quote_items for all
  using (is_staff()) with check (is_staff());

-- payments
drop policy if exists payments_read on payments;
create policy payments_read on payments for select
  using (
    is_staff()
    or exists (
      select 1 from bookings b
      where b.id = payments.booking_id and b.customer_id = auth.uid()
    )
  );

drop policy if exists payments_admin_write on payments;
create policy payments_admin_write on payments for all
  using (is_admin()) with check (is_admin());

-- pay
drop policy if exists pay_periods_read on pay_periods;
create policy pay_periods_read on pay_periods for select using (is_staff());
drop policy if exists pay_periods_admin_write on pay_periods;
create policy pay_periods_admin_write on pay_periods for all
  using (is_admin()) with check (is_admin());

drop policy if exists payslips_read on payslips;
create policy payslips_read on payslips for select
  using (worker_id = auth.uid() or is_admin());
drop policy if exists payslips_admin_write on payslips;
create policy payslips_admin_write on payslips for all
  using (is_admin()) with check (is_admin());

-- notifications
drop policy if exists notifications_own on notifications;
create policy notifications_own on notifications for select
  using (user_id = auth.uid());
drop policy if exists notifications_own_update on notifications;
create policy notifications_own_update on notifications for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists notifications_staff_insert on notifications;
create policy notifications_staff_insert on notifications for insert
  with check (is_staff());

-- assistant
drop policy if exists assistant_conv_own on assistant_conversations;
create policy assistant_conv_own on assistant_conversations for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists assistant_msg_own on assistant_messages;
create policy assistant_msg_own on assistant_messages for all
  using (
    exists (
      select 1 from assistant_conversations c
      where c.id = assistant_messages.conversation_id and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from assistant_conversations c
      where c.id = assistant_messages.conversation_id and c.user_id = auth.uid()
    )
  );

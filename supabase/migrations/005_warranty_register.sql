-- =====================================================================
-- 005 — the warranty register, walk-in contacts, and who did the work
--
-- The idea this is built around: the VEHICLE REGISTRATION is the key, not
-- a customer account. Somebody walks in a year later and says "you fitted a
-- battery to this car" — the mechanic types the plate and sees what was
-- fitted, when, by whom, and whether the warranty is still live.
--
-- Run after 004. Safe to re-run.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Registration numbers are typed by hand under a car, so they arrive as
-- "cab 1234", "CAB-1234", "Cab1234". Everything is looked up on a
-- normalised copy — letters and digits only, uppercased — while the
-- original is kept for the paperwork.
-- ---------------------------------------------------------------------
create or replace function normalise_plate(raw text) returns text
language sql immutable as $$
  select nullif(upper(regexp_replace(coalesce(raw, ''), '[^A-Za-z0-9]', '', 'g')), '');
$$;

-- ---------------------------------------------------------------------
-- Contacts — a customer who has no account and does not want one.
--
-- We ask for a phone number and nothing else. No email, no password, no
-- sign-up. Consent for marketing is stored separately from the number
-- itself, because having someone's number is not permission to advertise
-- at them.
-- ---------------------------------------------------------------------
create table if not exists contacts (
  id             uuid primary key default uuid_generate_v4(),
  full_name      text,
  phone          text not null,
  -- Digits only, for matching the same person across visits.
  phone_key      text generated always as
                   (regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g')) stored,
  has_whatsapp   boolean not null default true,
  -- Marketing is opt-in and recorded: who agreed, when, and how we asked.
  marketing_opt_in boolean not null default false,
  marketing_opt_in_at timestamptz,
  opt_in_source  text,
  -- Warranty and job updates are a different thing to marketing: a customer
  -- can want to hear that their warranty is running out without wanting
  -- offers. Kept separate so we never conflate the two.
  service_updates_opt_in boolean not null default true,
  -- If they ever have an account, this links the two.
  profile_id     uuid references profiles(id) on delete set null,
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create unique index if not exists contacts_phone_key_idx on contacts(phone_key);
create index if not exists contacts_name_idx on contacts(lower(full_name));

-- ---------------------------------------------------------------------
-- The vehicle register. One row per plate the workshop has ever seen,
-- whether or not the owner has an account.
-- ---------------------------------------------------------------------
create table if not exists vehicle_records (
  id            uuid primary key default uuid_generate_v4(),
  registration  text not null,
  plate_key     text generated always as
                  (upper(regexp_replace(coalesce(registration, ''), '[^A-Za-z0-9]', '', 'g'))) stored,
  make          text,
  model         text,
  year          int,
  colour        text,
  -- Who brought it in most recently. A car can change hands, so this is the
  -- latest known keeper rather than a permanent owner.
  contact_id    uuid references contacts(id) on delete set null,
  notes         text,
  first_seen_at timestamptz not null default now(),
  last_seen_at  timestamptz not null default now()
);
create unique index if not exists vehicle_records_plate_idx on vehicle_records(plate_key);

-- Invoices gain the plate, the contact, and who actually did the work.
alter table invoices add column if not exists contact_id uuid references contacts(id) on delete set null;
alter table invoices add column if not exists vehicle_record_id uuid references vehicle_records(id) on delete set null;
alter table invoices add column if not exists registration text;
alter table invoices add column if not exists plate_key text generated always as
  (upper(regexp_replace(coalesce(registration, ''), '[^A-Za-z0-9]', '', 'g'))) stored;
-- The mechanic who did the job. Not for blame — for asking "what happened?"
-- when the car comes back.
alter table invoices add column if not exists performed_by uuid references profiles(id) on delete set null;

create index if not exists invoices_plate_idx on invoices(plate_key);
create index if not exists invoices_contact_idx on invoices(contact_id);
create index if not exists invoices_performed_idx on invoices(performed_by);

-- ---------------------------------------------------------------------
-- Warranties. One row per part fitted that carries cover.
--
-- expires_on is generated, never typed, so nobody can quietly write a
-- different date onto a warranty than the months it was sold with.
-- ---------------------------------------------------------------------
create table if not exists warranties (
  id              uuid primary key default uuid_generate_v4(),
  -- Short and readable so it can be printed on a receipt and read back
  -- over the phone.
  number          text unique not null default (
                    'W-' || to_char(now(), 'YYMM') || '-' ||
                    upper(substr(md5(random()::text), 1, 5))
                  ),
  invoice_id      uuid references invoices(id) on delete set null,
  invoice_item_id uuid references invoice_items(id) on delete set null,
  vehicle_record_id uuid references vehicle_records(id) on delete set null,
  contact_id      uuid references contacts(id) on delete set null,

  registration    text not null,
  plate_key       text generated always as
                    (upper(regexp_replace(coalesce(registration, ''), '[^A-Za-z0-9]', '', 'g'))) stored,

  description     text not null,          -- "Exide 65Ah battery"
  kind            text not null default 'part',
  months          int not null check (months > 0),
  starts_on       date not null default current_date,
  expires_on      date generated always as
                    ((starts_on + (months || ' months')::interval)::date) stored,

  fitted_by       uuid references profiles(id) on delete set null,
  fitted_by_name  text,                   -- kept for the printed record
  notes           text,

  -- A warranty can be voided (misuse, accident damage) with a reason. It is
  -- never deleted, because the customer was still sold it.
  is_void         boolean not null default false,
  void_reason     text,
  voided_by       uuid references profiles(id) on delete set null,
  voided_at       timestamptz,

  -- Set when a claim is made against it.
  claimed_at      timestamptz,
  claim_notes     text,

  created_at      timestamptz not null default now()
);
create index if not exists warranties_plate_idx on warranties(plate_key, expires_on desc);
create index if not exists warranties_contact_idx on warranties(contact_id);
create index if not exists warranties_expiry_idx on warranties(expires_on) where not is_void;

-- ---------------------------------------------------------------------
-- Keep the vehicle register current whenever a bill mentions a plate.
-- ---------------------------------------------------------------------
create or replace function touch_vehicle_record() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  key text := upper(regexp_replace(coalesce(new.registration, ''), '[^A-Za-z0-9]', '', 'g'));
  found uuid;
begin
  if key is null or key = '' then return new; end if;

  select id into found from vehicle_records where plate_key = key;

  if found is null then
    insert into vehicle_records (registration, contact_id)
    values (new.registration, new.contact_id)
    returning id into found;
  else
    update vehicle_records
       set last_seen_at = now(),
           contact_id = coalesce(new.contact_id, contact_id)
     where id = found;
  end if;

  new.vehicle_record_id := found;
  return new;
end $$;

drop trigger if exists invoices_touch_vehicle on invoices;
create trigger invoices_touch_vehicle before insert or update of registration, contact_id on invoices
  for each row execute function touch_vehicle_record();

-- ---------------------------------------------------------------------
-- Messages we have sent, so nobody is texted the same thing twice and so
-- there is a record of what was sent to whom.
-- ---------------------------------------------------------------------
do $$ begin
  create type message_channel as enum ('whatsapp', 'sms');
exception when duplicate_object then null; end $$;

do $$ begin
  create type message_kind as enum ('warranty_issued', 'warranty_expiring', 'service_due', 'marketing', 'other');
exception when duplicate_object then null; end $$;

create table if not exists messages (
  id           uuid primary key default uuid_generate_v4(),
  contact_id   uuid references contacts(id) on delete cascade,
  warranty_id  uuid references warranties(id) on delete set null,
  channel      message_channel not null default 'whatsapp',
  kind         message_kind not null default 'other',
  to_phone     text not null,
  body         text not null,
  status       text not null default 'queued',   -- queued | sent | failed
  provider     text,
  provider_reference text,
  failure_reason text,
  sent_at      timestamptz,
  created_at   timestamptz not null default now()
);
create index if not exists messages_contact_idx on messages(contact_id, created_at desc);
-- Stops a nightly job sending the same expiry reminder twice.
create unique index if not exists messages_once_idx
  on messages(warranty_id, kind) where warranty_id is not null;

-- ---------------------------------------------------------------------
-- Row Level Security. All of this is workshop-side.
-- ---------------------------------------------------------------------
alter table contacts        enable row level security;
alter table vehicle_records enable row level security;
alter table warranties      enable row level security;
alter table messages        enable row level security;

drop policy if exists contacts_staff on contacts;
create policy contacts_staff on contacts for all
  using (is_staff() or profile_id = auth.uid())
  with check (is_staff());

drop policy if exists vehicle_records_staff on vehicle_records;
create policy vehicle_records_staff on vehicle_records for all
  using (is_staff()) with check (is_staff());

-- A customer with an account can see warranties on their own vehicles.
drop policy if exists warranties_read on warranties;
create policy warranties_read on warranties for select
  using (
    is_staff()
    or exists (
      select 1 from contacts c
      where c.id = warranties.contact_id and c.profile_id = auth.uid()
    )
    or exists (
      select 1 from vehicles v
      where v.owner_id = auth.uid()
        and upper(regexp_replace(v.registration, '[^A-Za-z0-9]', '', 'g')) = warranties.plate_key
    )
  );

drop policy if exists warranties_staff_write on warranties;
create policy warranties_staff_write on warranties for all
  using (is_staff()) with check (is_staff());

drop policy if exists messages_staff on messages;
create policy messages_staff on messages for all
  using (is_staff()) with check (is_staff());

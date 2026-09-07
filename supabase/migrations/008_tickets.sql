-- =====================================================================
-- 008 — tickets: what is in the workshop right now
--
-- A booking is a promise about the future. A bill is a record of the
-- past. Neither answers the question the workshop is actually asked all
-- day, which is "is that car ready yet?"
--
-- A ticket is one car, in the workshop, now. It is opened when the car
-- arrives — whether it was booked or just turned up — and closed when the
-- keys go back.
--
-- Run after 007. Safe to re-run.
-- =====================================================================

-- Short and speakable: a customer can be told "ticket forty-two" over the
-- phone and repeat it back. A uuid cannot be read out loud.
create sequence if not exists ticket_number_seq start 1;

create table if not exists tickets (
  id            uuid primary key default uuid_generate_v4(),
  number        text unique not null
                  default ('T-' || lpad(nextval('ticket_number_seq')::text, 4, '0')),

  -- waiting        — car is here, nobody has started
  -- in_progress    — being worked on
  -- ready          — done, waiting for the customer
  -- collected      — keys handed back, ticket closed
  -- cancelled      — car left without work being done
  status        text not null default 'waiting'
                  check (status in ('waiting', 'in_progress', 'ready',
                                    'collected', 'cancelled')),

  -- --- The car ------------------------------------------------------
  -- The plate is the spine here as everywhere else: it is what ties this
  -- visit to the service history and to any warranty still live.
  registration  text not null,
  plate_key     text generated always as
                  (upper(regexp_replace(coalesce(registration, ''), '[^A-Za-z0-9]', '', 'g'))) stored,
  vehicle_record_id uuid references vehicle_records(id) on delete set null,
  make          text,
  model         text,
  colour        text,

  -- --- The customer -------------------------------------------------
  -- A walk-in gives a name and a number and nothing else. Everything here
  -- is optional except being able to ring them when the car is done.
  contact_id    uuid references contacts(id) on delete set null,
  customer_id   uuid references profiles(id) on delete set null,
  booking_id    uuid references bookings(id) on delete set null,
  customer_name text,
  customer_phone text,

  -- --- The job ------------------------------------------------------
  -- What the customer says is wrong, in their words. Deliberately separate
  -- from what we find, which belongs on the bill: "makes a noise going
  -- round corners" is the useful thing to have written down when the car
  -- comes back a second time.
  complaint     text not null,
  notes         text,

  bay_id        uuid references bays(id) on delete set null,
  -- Who is on it. By name, like everywhere else, because most of the
  -- people doing the work have no login.
  assigned_to   uuid references profiles(id) on delete set null,
  assigned_name text,

  -- Where the keys physically are. Sounds trivial; it is the single most
  -- asked question in a workshop with more than three cars in it.
  keys_location text,

  -- --- Time ---------------------------------------------------------
  -- promised_ready_at is a commitment made to a customer and is optional
  -- on purpose. Elapsed time is a fact and is always shown; a promise is
  -- only recorded when somebody actually made one, because a missed
  -- estimate the customer was told is worse than no estimate at all.
  opened_at     timestamptz not null default now(),
  promised_ready_at timestamptz,
  started_at    timestamptz,
  ready_at      timestamptz,
  collected_at  timestamptz,

  invoice_id    uuid references invoices(id) on delete set null,
  opened_by     uuid references profiles(id) on delete set null,
  created_at    timestamptz not null default now()
);

-- The board: open tickets, oldest first, because the car that has been
-- waiting longest is the one somebody should be looking at.
create index if not exists tickets_open_idx
  on tickets(status, opened_at) where status in ('waiting', 'in_progress', 'ready');
create index if not exists tickets_plate_idx on tickets(plate_key);
create index if not exists tickets_opened_idx on tickets(opened_at desc);
create index if not exists tickets_booking_idx on tickets(booking_id);

-- ---------------------------------------------------------------------
-- Stamp the times as the status moves, so nobody has to remember to.
--
-- These are set once and not overwritten: a ticket that goes back from
-- ready to in_progress because something else was found keeps the moment
-- work first started, which is what "how long did that job take?" means.
-- ---------------------------------------------------------------------
create or replace function stamp_ticket_status() returns trigger
language plpgsql as $$
begin
  if new.status is distinct from old.status then
    if new.status = 'in_progress' and new.started_at is null then
      new.started_at := now();
    elsif new.status = 'ready' and new.ready_at is null then
      new.ready_at := now();
    elsif new.status = 'collected' and new.collected_at is null then
      new.collected_at := now();
    end if;
  end if;
  return new;
end $$;

drop trigger if exists tickets_stamp_status on tickets;
create trigger tickets_stamp_status before update on tickets
  for each row execute function stamp_ticket_status();

-- ---------------------------------------------------------------------
-- Keep the vehicle register current from tickets too, the same way
-- invoices do. A car that comes in and leaves without being charged for
-- anything still visited the workshop, and the next person to type that
-- plate should see it.
-- ---------------------------------------------------------------------
create or replace function touch_vehicle_from_ticket() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  key text := upper(regexp_replace(coalesce(new.registration, ''), '[^A-Za-z0-9]', '', 'g'));
  found uuid;
begin
  if key is null or key = '' then return new; end if;

  select id into found from vehicle_records where plate_key = key;

  if found is null then
    insert into vehicle_records (registration, contact_id, make, model, colour)
    values (new.registration, new.contact_id, new.make, new.model, new.colour)
    returning id into found;
  else
    update vehicle_records
       set last_seen_at = now(),
           contact_id = coalesce(new.contact_id, contact_id),
           make       = coalesce(make, new.make),
           model      = coalesce(model, new.model),
           colour     = coalesce(colour, new.colour)
     where id = found;
  end if;

  new.vehicle_record_id := found;
  return new;
end $$;

drop trigger if exists tickets_touch_vehicle on tickets;
create trigger tickets_touch_vehicle before insert or update of registration, contact_id on tickets
  for each row execute function touch_vehicle_from_ticket();

-- ---------------------------------------------------------------------
-- Row Level Security.
--
-- Staff write. A customer with an account can watch their own car's
-- ticket, which is the honest answer to "is it ready yet?" and saves a
-- phone call.
-- ---------------------------------------------------------------------
alter table tickets enable row level security;

drop policy if exists tickets_staff on tickets;
create policy tickets_staff on tickets for all
  using (is_staff()) with check (is_staff());

drop policy if exists tickets_own on tickets;
create policy tickets_own on tickets for select
  using (
    customer_id = auth.uid()
    or exists (
      select 1 from contacts c
      where c.id = tickets.contact_id and c.profile_id = auth.uid()
    )
  );

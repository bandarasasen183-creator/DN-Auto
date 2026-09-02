-- =====================================================================
-- 004 — invoices, refunds and card-terminal requests
-- Run after 003. Safe to re-run.
-- =====================================================================

do $$ begin
  create type invoice_status as enum ('draft', 'issued', 'paid', 'void', 'refunded', 'part_refunded');
exception when duplicate_object then null; end $$;

do $$ begin
  create type terminal_status as enum (
    'queued',     -- created by the app, not yet on the machine
    'sent',       -- delivered to the terminal
    'paid',       -- terminal reported a successful payment
    'declined',
    'cancelled',
    'expired'
  );
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- Invoices. Raised by any member of the team, against a booking or as a
-- walk-in. This is the document the customer pays and takes away.
-- ---------------------------------------------------------------------
create table if not exists invoices (
  id             uuid primary key default uuid_generate_v4(),
  number         text unique not null default (
                   'INV-' || to_char(now(), 'YYMM') || '-' ||
                   upper(substr(md5(random()::text), 1, 5))
                 ),
  booking_id     uuid references bookings(id) on delete set null,
  -- Null for a walk-in who has no account.
  customer_id    uuid references profiles(id) on delete set null,
  customer_name  text,
  customer_phone text,
  vehicle_note   text,
  status         invoice_status not null default 'draft',
  promotion_id   uuid references promotions(id) on delete set null,
  subtotal_cents bigint not null default 0,
  discount_cents bigint not null default 0,
  tax_cents      bigint not null default 0,
  total_cents    bigint not null default 0,
  -- Sum of successful payments, kept up to date by trigger.
  paid_cents     bigint not null default 0,
  refunded_cents bigint not null default 0,
  notes          text,
  issued_by      uuid references profiles(id) on delete set null,
  issued_at      timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists invoices_status_idx on invoices(status, created_at desc);
create index if not exists invoices_customer_idx on invoices(customer_id);
create index if not exists invoices_issuer_idx on invoices(issued_by, created_at desc);

create table if not exists invoice_items (
  id               uuid primary key default uuid_generate_v4(),
  invoice_id       uuid not null references invoices(id) on delete cascade,
  service_id       uuid references services(id) on delete set null,
  description      text not null,
  kind             text not null default 'labour',   -- 'labour' | 'part'
  quantity         numeric(10,2) not null default 1,
  unit_price_cents bigint not null default 0,
  warranty_months  int not null default 0,
  sort_order       int not null default 0
);
create index if not exists invoice_items_invoice_idx on invoice_items(invoice_id);

alter table payments add column if not exists invoice_id uuid references invoices(id) on delete set null;
create index if not exists payments_invoice_idx on payments(invoice_id);

-- ---------------------------------------------------------------------
-- Refunds. Recorded against the payment they reverse, never by editing the
-- original — the ledger stays append-only and auditable.
-- ---------------------------------------------------------------------
create table if not exists refunds (
  id             uuid primary key default uuid_generate_v4(),
  payment_id     uuid not null references payments(id) on delete cascade,
  invoice_id     uuid references invoices(id) on delete set null,
  amount_cents   bigint not null check (amount_cents > 0),
  reason         text,
  provider_reference text,
  refunded_by    uuid references profiles(id) on delete set null,
  created_at     timestamptz not null default now()
);
create index if not exists refunds_payment_idx on refunds(payment_id);

-- ---------------------------------------------------------------------
-- Card terminal requests.
--
-- The app never talks to a card machine directly. It writes a row here with
-- everything the terminal needs, and whatever integration exists picks it up:
-- a WEBXPAY API adapter if their terminal offers one, or the tablet showing
-- the amount and reference for the mechanic to key in if it does not. Either
-- way the workflow, the audit trail and the receipt are identical.
-- ---------------------------------------------------------------------
create table if not exists terminal_requests (
  id             uuid primary key default uuid_generate_v4(),
  invoice_id     uuid not null references invoices(id) on delete cascade,
  -- Which tablet/terminal this was raised on, so takings can be split by bay.
  terminal_code  text,
  requested_by   uuid references profiles(id) on delete set null,
  amount_cents   bigint not null check (amount_cents > 0),
  currency       char(3) not null default 'LKR',
  status         terminal_status not null default 'queued',
  provider       payment_provider not null default 'webxpay',
  provider_reference text,
  provider_payload   jsonb,
  failure_reason text,
  -- Where the terminal (or the tablet) should send the person afterwards.
  return_path    text,
  sent_at        timestamptz,
  settled_at     timestamptz,
  created_at     timestamptz not null default now()
);
create index if not exists terminal_requests_invoice_idx on terminal_requests(invoice_id);
create index if not exists terminal_requests_open_idx on terminal_requests(status, created_at desc);

-- ---------------------------------------------------------------------
-- Keep invoice totals honest without the UI having to remember to.
-- ---------------------------------------------------------------------
create or replace function recalc_invoice_totals() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  target uuid := coalesce(new.invoice_id, old.invoice_id);
  paid   bigint;
  refunded bigint;
  total  bigint;
begin
  if target is null then return coalesce(new, old); end if;

  select coalesce(sum(amount_cents), 0) into paid
    from payments where invoice_id = target and status = 'paid';

  select coalesce(sum(amount_cents), 0) into refunded
    from refunds where invoice_id = target;

  select total_cents into total from invoices where id = target;

  update invoices
     set paid_cents = paid,
         refunded_cents = refunded,
         updated_at = now(),
         status = case
           when refunded >= total and refunded > 0 then 'refunded'::invoice_status
           when refunded > 0 then 'part_refunded'::invoice_status
           when paid >= total and total > 0 then 'paid'::invoice_status
           else status
         end
   where id = target;

  return coalesce(new, old);
end $$;

drop trigger if exists payments_recalc_invoice on payments;
create trigger payments_recalc_invoice after insert or update or delete on payments
  for each row execute function recalc_invoice_totals();

drop trigger if exists refunds_recalc_invoice on refunds;
create trigger refunds_recalc_invoice after insert or update or delete on refunds
  for each row execute function recalc_invoice_totals();

-- Who created a promotion, so a discount is always attributable.
alter table promotions add column if not exists created_by uuid references profiles(id) on delete set null;

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table invoices          enable row level security;
alter table invoice_items     enable row level security;
alter table refunds           enable row level security;
alter table terminal_requests enable row level security;

-- A customer sees their own invoices; the team sees all of them.
drop policy if exists invoices_read on invoices;
create policy invoices_read on invoices for select
  using (customer_id = auth.uid() or is_staff());

drop policy if exists invoices_staff_write on invoices;
create policy invoices_staff_write on invoices for all
  using (is_staff()) with check (is_staff());

drop policy if exists invoice_items_read on invoice_items;
create policy invoice_items_read on invoice_items for select
  using (
    is_staff()
    or exists (
      select 1 from invoices i
      where i.id = invoice_items.invoice_id and i.customer_id = auth.uid()
    )
  );

drop policy if exists invoice_items_staff_write on invoice_items;
create policy invoice_items_staff_write on invoice_items for all
  using (is_staff()) with check (is_staff());

-- Refunds are visible to the customer they belong to, and issued by the team.
drop policy if exists refunds_read on refunds;
create policy refunds_read on refunds for select
  using (
    is_staff()
    or exists (
      select 1 from invoices i
      where i.id = refunds.invoice_id and i.customer_id = auth.uid()
    )
  );

drop policy if exists refunds_staff_write on refunds;
create policy refunds_staff_write on refunds for all
  using (is_staff()) with check (is_staff());

-- Terminal requests are workshop-side only.
drop policy if exists terminal_read on terminal_requests;
create policy terminal_read on terminal_requests for select using (is_staff());

drop policy if exists terminal_staff_write on terminal_requests;
create policy terminal_staff_write on terminal_requests for all
  using (is_staff()) with check (is_staff());

-- The team can raise payments and promotions, not just admin.
drop policy if exists payments_admin_write on payments;
drop policy if exists payments_staff_write on payments;
create policy payments_staff_write on payments for all
  using (is_staff()) with check (is_staff());

drop policy if exists promotions_admin_write on promotions;
drop policy if exists promotions_staff_write on promotions;
create policy promotions_staff_write on promotions for all
  using (is_staff()) with check (is_staff());

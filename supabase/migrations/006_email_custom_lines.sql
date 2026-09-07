-- =====================================================================
-- 006 — emailing service history, and bills that aren't from the menu
--
-- Three things:
--   1. Messages can go by email, not only WhatsApp and SMS.
--   2. A bill records the registration, so service history can be looked
--      up by plate — the spine of the warranty register in 005.
--   3. A customer's email is kept where we can reach it.
--
-- Run after 005. Safe to re-run.
-- =====================================================================

-- ---------------------------------------------------------------------
-- channel and kind become text with a check, rather than enums.
--
-- Adding a value to a Postgres enum is awkward to do idempotently and
-- cannot always run inside a transaction. These two columns will keep
-- gaining values as we add ways of contacting people, so a check
-- constraint is the honest shape for them.
-- ---------------------------------------------------------------------
alter table messages alter column channel drop default;
alter table messages alter column channel type text using channel::text;
alter table messages alter column channel set default 'whatsapp';

alter table messages alter column kind drop default;
alter table messages alter column kind type text using kind::text;
alter table messages alter column kind set default 'other';

alter table messages drop constraint if exists messages_channel_check;
alter table messages add constraint messages_channel_check
  check (channel in ('whatsapp', 'sms', 'email'));

alter table messages drop constraint if exists messages_kind_check;
alter table messages add constraint messages_kind_check
  check (kind in ('warranty_issued', 'warranty_expiring', 'service_due',
                  'service_history', 'receipt', 'marketing', 'other'));

-- An email has no phone number, so the phone can no longer be required.
alter table messages alter column to_phone drop not null;
alter table messages add column if not exists to_email text;
alter table messages add column if not exists subject text;
alter table messages add column if not exists invoice_id uuid
  references invoices(id) on delete set null;

-- One or the other has to be present, or we have nowhere to send it.
alter table messages drop constraint if exists messages_destination_check;
alter table messages add constraint messages_destination_check
  check (to_phone is not null or to_email is not null);

-- ---------------------------------------------------------------------
-- The "don't send it twice" index in 005 keyed on (warranty_id, kind).
-- Now that the same warranty can legitimately be sent by both WhatsApp
-- and email, the channel has to be part of it — otherwise emailing a
-- warranty blocks ever texting about it.
-- ---------------------------------------------------------------------
drop index if exists messages_once_idx;
create unique index if not exists messages_once_idx
  on messages(warranty_id, kind, channel) where warranty_id is not null;

create index if not exists messages_invoice_idx on messages(invoice_id);

-- ---------------------------------------------------------------------
-- Where to email people.
--
-- A walk-in still only has to give a phone number — 005 deliberately asks
-- for nothing else. An email is an extra a customer can offer if they
-- want their service history sent to them, never a requirement.
-- ---------------------------------------------------------------------
alter table contacts add column if not exists email text;
create index if not exists contacts_email_idx on contacts(lower(email));

alter table invoices add column if not exists customer_email text;

-- ---------------------------------------------------------------------
-- Who actually did the work, by name.
--
-- 005 linked the job to a staff account. In practice a good share of the
-- people turning a spanner here will never have a login, and a register
-- where half the jobs read "not recorded" is not worth keeping. So the
-- name is always stored, and the account link is a bonus when the name
-- happens to match one.
-- ---------------------------------------------------------------------
alter table invoices add column if not exists performed_by_name text;
create index if not exists invoices_performed_name_idx
  on invoices(lower(performed_by_name));

-- ---------------------------------------------------------------------
-- The customer's signature, captured on the tablet at handover.
--
-- WEBXPAY have confirmed their terminal has no API we can talk to, so the
-- card machine and this app stay separate systems. What ties a payment on
-- the machine to a job in here is a person confirming it happened — so
-- that confirmation is worth recording properly rather than leaving as a
-- tap nobody signed for.
--
-- Stored as a PNG data URL. A signature is a few kilobytes of strokes;
-- putting it in a column keeps it attached to the bill it belongs to
-- instead of in a bucket that can drift out of sync with it.
-- ---------------------------------------------------------------------
alter table invoices add column if not exists signature_png text;
alter table invoices add column if not exists signed_name text;
alter table invoices add column if not exists signed_at timestamptz;
-- Set when a member of staff takes the tablet back and clears the
-- confirmation screen. Until then the tablet is still in front of the
-- customer, which is the whole reason that screen shows nothing else.
alter table invoices add column if not exists handed_back_at timestamptz;
alter table invoices add column if not exists handed_back_by uuid
  references profiles(id) on delete set null;

-- ---------------------------------------------------------------------
-- Per-line warranty was already on invoice_items. What was missing is
-- being able to sell a warranty that isn't the standing six months —
-- a supplier's twelve, or a used part with none at all. The column
-- allows it; 006 only documents that zero is a real answer rather than
-- a missing one.
-- ---------------------------------------------------------------------
comment on column invoice_items.warranty_months is
  'Months of cover on this line. 0 means explicitly none (used parts, '
  'labour), not "unknown". Defaults to the workshop standing warranty '
  'for parts but is set per line at the counter.';

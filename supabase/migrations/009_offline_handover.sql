-- =====================================================================
-- 009 — recording a handover offline
--
-- The app never touches the card machine — WEBXPAY has no API — so
-- "complete" on the handover screen only *records* that a mechanic took
-- a payment and the customer signed for it. It doesn't move money. That
-- is what makes it safe to let a mechanic tap it with no connection: the
-- risk of a retried request is a duplicate row, not a duplicate charge.
--
-- What stops the duplicate row is this column. The tablet generates one
-- id for the action before it ever leaves the device, and the sync route
-- uses it as the payment's own id — so the same action arriving twice,
-- whether from a retried fetch or two tabs flushing at once, writes the
-- same row twice rather than two payments for one handover.
--
-- Run after 008. Safe to re-run.
-- =====================================================================

alter table payments add column if not exists client_id uuid unique;

comment on column payments.client_id is
  'Set only when this payment was recorded through the offline queue. '
  'Its uniqueness is what makes a retried sync safe to replay.';

-- Drop the not-null constraint on booking_id in the payments table,
-- because payments can now be made against invoices that come from
-- tickets (walk-ins) and not just bookings.
alter table payments alter column booking_id drop not null;

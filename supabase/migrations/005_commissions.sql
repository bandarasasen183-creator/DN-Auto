-- Add commission fields to invoice_items
ALTER TABLE invoice_items ADD COLUMN commission_amount_cents INTEGER DEFAULT 0;

-- Optional: Track if a commission was set as a percentage or flat rate
ALTER TABLE invoice_items ADD COLUMN commission_rule TEXT;

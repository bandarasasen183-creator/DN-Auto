-- =====================================================================
-- Seed data for DN Auto Repairs And Imports
-- Prices are guide prices in LKR cents ("from" pricing — the final figure
-- comes from the quote once the vehicle has been inspected).
--
-- Scope reminder, enforced by what is NOT in this list:
--   no A/C repair, no wheel alignment, no wheel balancing, no tyre fitting,
--   petrol vehicles only.
-- =====================================================================

insert into services (slug, name, description, category, base_price_cents, duration_minutes, sort_order)
values
  ('general-service', 'General Service',
   'Multi-point inspection, fluid top-ups, filter check and a full health report on your vehicle.',
   'Maintenance', 1200000, 90, 1),

  ('oil-filter-change', 'Oil & Filter Change',
   'Engine oil drain and refill with a new oil filter. Genuine parts, correct grade for your engine.',
   'Maintenance', 850000, 45, 2),

  ('brake-check', 'Brake & Suspension Check',
   'Pad, disc, line and suspension inspection with wear measurements and a written recommendation.',
   'Safety', 950000, 60, 3),

  ('engine-diagnostics', 'Engine Diagnostics & Repair',
   'Full OBD scan, live data reading and fault tracing by a certified mechanic before any part is replaced.',
   'Diagnostics', 1500000, 90, 4),

  ('electrical-battery', 'Electrical & Battery',
   'Charging system, alternator, starter and battery testing, plus wiring and fault repair.',
   'Electrical', 1100000, 75, 5),

  ('transmission-service', 'Transmission Service',
   'Transmission fluid service and gearbox inspection for petrol and hybrid-petrol vehicles.',
   'Drivetrain', 1800000, 120, 6),

  ('pre-purchase-inspection', 'Pre-Purchase Inspection',
   'Buying a vehicle? We inspect it end to end and give you an honest written report before you pay.',
   'Inspection', 2000000, 120, 7)
on conflict (slug) do update set
  name             = excluded.name,
  description      = excluded.description,
  category         = excluded.category,
  base_price_cents = excluded.base_price_cents,
  duration_minutes = excluded.duration_minutes,
  sort_order       = excluded.sort_order;

insert into bays (name) values ('Bay 1'), ('Bay 2'), ('Bay 3')
on conflict (name) do nothing;

# DN Auto Repairs And Imports

Customer, worker and admin portals for DN Auto Repairs And Imports — Church Rd,
Kadawatha 11850, Sri Lanka. Petrol vehicles only, established 2019.

**Stack:** Next.js 14 (App Router) · Supabase (Postgres + Auth) · no UI framework,
hand-written CSS design system.

---

## Getting started

```bash
npm install
cp .env.example .env.local     # fill in your Supabase keys
npm run dev
```

### Setting up the database

1. Create a project at [supabase.com](https://supabase.com).
2. Open the SQL editor and run, in order:
   `supabase/schema.sql`, then each file in `supabase/migrations/` by number,
   then `supabase/seed.sql`.
3. Copy the project URL and anon key into `.env.local`.

### Creating the first admin

Sign up through `/signup` (this always creates a *customer*, by design), then
promote yourself in the Supabase SQL editor:

```sql
update profiles set role = 'admin' where email = 'you@example.com';
```

Staff accounts are never self-selected at signup — an admin promotes them.

---

## Project layout

```
app/
  page.js               public site (services, hours, scope)
  (auth)/               login, signup, sign-out server actions
  portal/               customer portal   (role: customer)
  worker/               worker portal     (role: worker)
  admin/                admin portal      (role: admin)
  api/assistant/        DN Assist chat + history endpoints
  auth/callback/        Supabase email-confirmation landing
components/             portal shell, wizard progress bar, timeline, DN Assist
lib/
  business.js           real-world facts + rules: hours, scope, LKR formatting
  supabase/             browser and server clients
  auth/session.js       getSessionUser() and the requireRole() guard
  assistant/prompt.js   the assistant's brief, generated from business.js
  payments/             provider-agnostic gateway adapters
  domains.js            subdomain -> portal map
middleware.js           session refresh, role routing, subdomain mapping
public/images/          workshop artwork — replace with real photographs
supabase/
  schema.sql            tables, triggers, row-level security
  migrations/           later schema changes, run in order after schema.sql
  seed.sql              service catalogue with LKR guide prices
legacy/                 the original static prototype, kept for reference
```

## How the data flows

```
customer books  ->  admin confirms & assigns  ->  worker accepts
      ^                                                |
      |                                                v
 live status + repair log  <---  every status change writes booking_events
```

Every status change is written to `booking_events` by a database trigger, so the
customer-facing repair log is an audit trail rather than something the UI
reconstructs.

## Security model

* Roles live on `profiles.role`: `customer`, `worker`, `admin`.
* Row-level security is on for every table — a customer can only ever read their
  own bookings, quotes, payments and vehicles, whatever the client asks for.
* `middleware.js` guards `/portal`, `/worker` and `/admin`, and redirects anyone
  who lands on the wrong portal to their own.
* Money is stored as LKR **cents** in `bigint` columns; never floats.

## Business rules encoded in the app

Defined once in `lib/business.js` and validated server-side:

* **Petrol vehicles only** — the `fuel_type` enum has no diesel option.
* **Not offered:** A/C repair, wheel alignment, wheel balancing, tyre fitting.
* **Hours:** Sunday 8:00–17:00 · Mon–Fri 18:00–21:00 emergencies for existing
  customers only · Saturday closed.
* **6-month minimum parts warranty**, recorded per part on quote line items.

## Subdomains

The canonical domain is **dnauto.lk** (BuyDomains.LK); **dnauto.org**
(Spaceship) is an alias that redirects to it with a 308, keeping the path and
subdomain. Both are set once in `lib/domains.js`.

`middleware.js` maps `customer.` / `workers.` / `admin.` hosts to the right
portal, so the three portals split across subdomains without a code change —
only DNS and the host mapping table need updating. See
[DEPLOYMENT.md](DEPLOYMENT.md) for the DNS records at both registrars.

## Discounts

Promotions live in the database and are managed at **Admin → Promotions** — no
code change to run an offer. Four kinds of trigger:

| Trigger | Behaviour |
|---|---|
| `first_booking` | Applies itself to a customer's first ever booking (this is the 5% welcome offer) |
| `code` | The customer types a code |
| `referral` | The code belongs to another customer, who is credited |
| `always` | A seasonal offer applied to every booking while it runs |

Percentages can be capped, offers can have a minimum spend, start and end
dates, a total usage limit and a per-customer limit. Every application is
written to `promotion_redemptions`, so what an offer has cost is a query
rather than a guess. Eligibility is decided server-side in `lib/promotions.js`
and re-checked inside the booking action — the wizard only previews it.

## Payments

Deliberately provider-agnostic until merchant credentials exist. The `payments`
table records a `payment_provider` (`webxpay`, `koko`, `payable_pos`, `cash`,
`bank_transfer`), the gateway's reference and its raw payload, so adding a
provider is an adapter rather than a schema change.

---

## Roadmap

All eight phases are complete.

- [x] **Phase 1** — Next.js + Supabase foundation, schema + RLS, real auth, role routing
- [x] **Phase 2** — Customer portal: booking wizard, bookings, quotes, repair log
- [x] **Phase 3** — Worker portal: incoming jobs, accept/update, pay & payslips
- [x] **Phase 4** — Admin portal: bookings, customers, workers, prices, payments
- [x] **Phase 5** — DN Assist: chat, voice, forms, history
- [x] **Phase 6** — Payments: WEBXPAY / Koko / Payable adapter layer
- [x] **Phase 7** — Design & animation polish
- [x] **Phase 8** — Subdomain routing and deployment

## Deploying

See [DEPLOYMENT.md](DEPLOYMENT.md) — Supabase setup, environment variables,
DNS for the three portal subdomains, and the go-live checklist.

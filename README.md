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

## Tickets — what's in the workshop right now

A booking is a promise about the future and a bill is a record of the past.
Neither answers the question the workshop is actually asked all day: *is that
car ready yet?*

**Worker → In the workshop** is a board of three columns — waiting, in
progress, ready — oldest first, because the car that has been there longest is
the one somebody should be looking at. A ticket is opened when a car arrives,
booked or not, and closed when the keys go back.

What a ticket carries beyond the obvious:

* **The complaint in the customer's words**, kept separate from what we find.
  "Grinding noise going round left corners" is the useful thing to have written
  down when the car comes back a second time.
* **Where the keys are.** Sounds trivial until there are six cars in.
* **A promised time, only if somebody made one.** Elapsed time is a fact and is
  always shown; a promise is a commitment and is optional. Tickets past their
  promised time are marked on the board from across the room, because a missed
  promise the customer remembers is worse than never having given one.
* **Who's on it, by name** — no account needed, same as everywhere else.

Because the plate is the key, opening a ticket shows the car's whole history
without anybody going to look for it: previous visits, and — flagged at the top
— **any part still under warranty**. If the complaint is about one of those, the
work is covered, and the mechanic finds out before quoting rather than after.

Tickets feed billing directly. The billing screen's customer selector lists cars
currently in the workshop, so a customer who dropped their car off in the
morning is picked from a list rather than typed in again — which is how a bill
ends up under a slightly different name to the ticket, after which neither can
be found. Raising the bill closes the ticket's loop, and bookings are shown for
**today only**, since a list going back weeks is noise at a counter.

## Billing, handover and the card terminal

The team raises bills at **Worker → Billing**: against a job or for a walk-in
with no account, with a promo code applied at the counter. Lines can come from
the service catalogue or be typed from scratch — plenty of what a workshop
charges for was never on a price list — and each line carries its own warranty
in months, pre-filled with the usual answer but set per line.

**WEBXPAY have confirmed their terminal has no API.** The card machine and this
app are therefore two separate systems that meet at a person, and the app is
built around that rather than pretending otherwise. Raising a bill leads
straight to a **handover screen**, which is handed to the customer:

1. How they paid — card, cash or transfer.
2. Their signature, drawn on the tablet.
3. A confirmation screen showing a tick and nothing else.

That last screen matters. The customer is holding a device that can reach every
other customer's details, so it carries no navigation and no totals, and the
way out is a deliberate press-and-hold rather than a tap — a member of staff
takes the tablet back, and that release is recorded against the bill.

The signature is stored on the invoice and printed on the receipt. Without it,
a payment on a machine we can't talk to is one member of staff's word; with it,
the bill carries the customer's own confirmation.

Refunds are their own rows against the payment they reverse, never an edit, so
the ledger stays append-only and every figure traces back to who did what.

## The warranty register

The registration is the key, not a customer account. Somebody arrives a year
later saying "you fitted a battery to this car" — the plate is typed and the
answer is there.

Every bill records a plate, and every line sold with cover becomes a row in
`warranties` with its own printable number and an expiry date the database
generates from the months sold, so nobody can quietly type a different one.
Who did the work is recorded **by name**, not by account — most of the people
turning a spanner here will never have a login, and a register where half the
jobs read "not recorded" is not worth keeping. A name matching a staff account
is linked to it automatically.

## Email

Both directions, through [Resend](https://resend.com) (`lib/email/index.js`).

**Out.** Service history goes to customers on request — everything recorded
against their vehicle, every visit and every warranty still in date, not just
the bill in front of them. Sends are written to `messages`, so "you never sent
it" is answerable from the record.

**In.** Mail to `@dnauto.lk` lands in the app at **Worker → Mailbox** rather
than in somebody's personal inbox, and is answered from there. Resend takes
delivery and posts `email.received` to `app/api/email/inbound`, which pulls
the body back through the Receiving API and files it into a thread.

Threads, not messages: a customer's question and our answer three hours later
are one conversation, and reading half of it is worse than reading none. New
mail is threaded on the real `In-Reply-To` and `References` headers first,
falling back to sender and subject only when a message carries none — and
replies carry those headers back out, so our answer lands under the customer's
original message in *their* mail client instead of starting a new thread.

Threads link themselves to a contact or customer when the address matches, and
to a vehicle when the subject or body mentions a plate the workshop has
actually seen before. A four-digit number that merely looks like a plate is
left alone — attaching a stranger's email to somebody's vehicle history is a
worse failure than not linking it at all.

Two things worth knowing about the webhook: it verifies Resend's signature
before doing anything, because it is otherwise a public URL that writes to the
database; and it is deliberately idempotent, since Resend retries until it
gets a 200 and the same message will arrive more than once.

Inbound HTML is displayed as text, never rendered. Nobody who emails the
workshop gets to run markup inside the portal.

Without `RESEND_API_KEY` the app says so plainly rather than failing quietly,
on the same principle as the payment adapters: a receipt that silently never
arrives is worse than one that visibly refused to send.

Tablets live on `pay.dnauto.lk`, which opens billing and nothing else, so a
machine left on the counter cannot wander into the rest of the portal.

* [TABLETS.md](TABLETS.md) — setting up the Kogan Explore Tab 10.1" units:
  stripping the stock Google apps off over ADB, screen pinning, and how
  takings are split per mechanic and per bay.
* [APK.md](APK.md) — building the site into a real installable Android app
  with `bubblewrap`, so it lands in the app drawer with its own icon and no
  browser chrome. No Play Store and no Google account needed.

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

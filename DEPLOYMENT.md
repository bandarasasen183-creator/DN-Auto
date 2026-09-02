# Deploying DN Auto

Two domains are registered:

| Domain | Registrar | Role |
|---|---|---|
| **dnauto.lk** | BuyDomains.LK (PEEK Hosting) | The canonical site — everything lives here |
| dnauto.org | Spaceship | Alias, permanently redirected to the .lk |

The .lk is primary because a Sri Lankan workshop ranks better locally on it and
customers in Kadawatha will trust it. Both are set in one place —
`ROOT_DOMAIN` and `ALIAS_DOMAINS` in `lib/domains.js` — overridable per
environment with `NEXT_PUBLIC_ROOT_DOMAIN` and `NEXT_PUBLIC_ALIAS_DOMAINS`.

The redirect is handled in `middleware.js` before any session work, keeps the
subdomain (`admin.dnauto.org` → `admin.dnauto.lk`) and uses a 308, so search
engines fold the alias into the canonical domain rather than ranking both.

---

## 1. Supabase

1. Create a project at [supabase.com](https://supabase.com) (pick the region
   closest to Sri Lanka — Singapore, `ap-southeast-1`).
2. SQL editor → run in order: `supabase/schema.sql`, then every file in
   `supabase/migrations/` by number, then `supabase/seed.sql`.
3. **Database → Replication** → enable Realtime on the `notifications` table.
   Without this the notification bell still works, it just won't update live.
4. **Authentication → URL Configuration**:
   - Site URL: `https://dnauto.lk`
   - Redirect URLs — add every host the app runs on. Miss one and logins fail
     silently on that host:
     ```
     https://dnauto.lk/auth/callback
     https://www.dnauto.lk/auth/callback
     https://customer.dnauto.lk/auth/callback
     https://workers.dnauto.lk/auth/callback
     https://admin.dnauto.lk/auth/callback
     http://localhost:3000/auth/callback
     ```
5. Copy the project URL and anon key from **Settings → API**.

## 2. Environment variables

| Variable | Where it's used | Required |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Everywhere | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Everywhere | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Reserved for admin scripts. **Never** expose it to the browser | No |
| `ANTHROPIC_API_KEY` | DN Assist. Without it the assistant returns a clear "not configured" message rather than failing | No |
| `NEXT_PUBLIC_ROOT_DOMAIN` | Overrides `dnauto.lk`, e.g. on a staging deploy | No |
| `NEXT_PUBLIC_ALIAS_DOMAINS` | Comma-separated domains that redirect to the canonical one | No |
| `NEXT_PUBLIC_SITE_URL` | Absolute base for canonical links and the sitemap | No |
| `WEBXPAY_MERCHANT_ID` / `WEBXPAY_SECRET` | WEBXPAY online adapter | When going live |
| `WEBXPAY_TERMINAL_URL` / `WEBXPAY_TERMINAL_KEY` | Card terminal. Set these and amounts are pushed to the machine; leave blank and the tablet shows the amount to key in | When their terminal docs arrive |
| `KOKO_MERCHANT_ID` / `KOKO_SECRET` | Koko adapter | When going live |
| `PAYABLE_TERMINAL_ID` / `PAYABLE_API_KEY` | Pushing amounts to the POS terminal | Optional |

## 3. Hosting

Vercel is the path of least resistance for a Next.js app:

```bash
npx vercel            # first deploy
npx vercel --prod     # production
```

Add the environment variables in the Vercel dashboard before the first
production deploy.

## 4. Subdomains

One deployment serves all three portals — do **not** deploy the app three
times. Point every host at the same deployment and the middleware sorts out
who sees what.

### dnauto.lk — the real site

DNS for the .lk is managed through **BuyDomains.LK**, in your account's domain
control panel. If they don't expose DNS records directly, ask their support to
point the domain at Vercel — .lk resellers usually do this for you.

| Host | Type | Value |
|---|---|---|
| `@` | A | `76.76.21.21` |
| `www` | CNAME | `cname.vercel-dns.com` |
| `customer` | CNAME | `cname.vercel-dns.com` |
| `workers` | CNAME | `cname.vercel-dns.com` |
| `team` | CNAME | `cname.vercel-dns.com` |
| `pay` | CNAME | `cname.vercel-dns.com` |
| `admin` | CNAME | `cname.vercel-dns.com` |

`pay` is the host for the workshop tablets — it opens billing directly, and is
the address the tablets install from. See [TABLETS.md](TABLETS.md).

### dnauto.org — the alias

**Spaceship → Domain List → dnauto.org → Manage → Advanced DNS.** Leave the
nameservers on Spaceship's default.

| Host | Type | Value |
|---|---|---|
| `@` | A | `76.76.21.21` |
| `www` | CNAME | `cname.vercel-dns.com` |

Add it to the same Vercel project. Do **not** set up Vercel's own redirect —
`middleware.js` already handles it and keeps the path and subdomain intact.

Vercel shows the exact apex value on its Domains screen — use whatever it
gives you if it differs from the number above. Every host above goes on the
**same** Vercel project.

DNS changes at Spaceship usually take effect within an hour, occasionally up
to 24. HTTPS certificates are issued by Vercel automatically once each host
resolves — you do **not** need to buy an SSL certificate for this.

**What happens then**, from `middleware.js` and `lib/domains.js`:

- A visitor to `customer.dnauto.lk` is sent to `/portal`.
- `workers.dnauto.lk` → `/worker`; `admin.dnauto.lk` → `/admin`.
- Somebody signed in as a customer who lands on `admin.dnauto.lk` is redirected
  to their own portal, not shown an error — the guard is by role, not by host.
- Signed out, any portal host sends them to `/login`, and they come back to
  where they were trying to go.

Adding another host is one line in `SUBDOMAIN_PORTALS` in `lib/domains.js`.

## 5. The first admin

Sign up through `/signup` — this always creates a *customer*, by design — then
in the Supabase SQL editor:

```sql
update profiles set role = 'admin' where email = 'bandarasasen183@gmail.com';
```

From then on, every other staff account is created from **Admin → Customers**
by changing someone's role. Nobody can grant themselves a staff role.

## 6. Before you hand it to real customers

- [ ] Run through the whole loop once on production: book → assign → accept →
      update → quote → approve → complete → record payment.
- [ ] Check the customer only sees what they should (sign in as two customers).
- [ ] Confirm a worker cannot open `/admin` and an admin cannot be demoted by
      themselves.
- [ ] Set up Supabase's daily backups (Settings → Database).
- [ ] Decide on the payment provider and fill in that one adapter file.

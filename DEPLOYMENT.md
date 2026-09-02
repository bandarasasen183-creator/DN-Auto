# Deploying DN Auto

The domain is **dnauto.org**, registered with Spaceship. It is set in one
place — `ROOT_DOMAIN` in `lib/domains.js` — and can be overridden per
environment with `NEXT_PUBLIC_ROOT_DOMAIN`.

---

## 1. Supabase

1. Create a project at [supabase.com](https://supabase.com) (pick the region
   closest to Sri Lanka — Singapore, `ap-southeast-1`).
2. SQL editor → run in order: `supabase/schema.sql`, then every file in
   `supabase/migrations/` by number, then `supabase/seed.sql`.
3. **Database → Replication** → enable Realtime on the `notifications` table.
   Without this the notification bell still works, it just won't update live.
4. **Authentication → URL Configuration**:
   - Site URL: `https://dnauto.org`
   - Redirect URLs — add every host the app runs on. Miss one and logins fail
     silently on that host:
     ```
     https://dnauto.org/auth/callback
     https://www.dnauto.org/auth/callback
     https://customer.dnauto.org/auth/callback
     https://workers.dnauto.org/auth/callback
     https://admin.dnauto.org/auth/callback
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
| `NEXT_PUBLIC_ROOT_DOMAIN` | Overrides `dnauto.org`, e.g. on a staging deploy | No |
| `NEXT_PUBLIC_SITE_URL` | Absolute base for canonical links and the sitemap | No |
| `WEBXPAY_MERCHANT_ID` / `WEBXPAY_SECRET` | WEBXPAY adapter | When going live |
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

**Where the DNS lives.** The domain is at Spaceship, so records are edited in
**Spaceship → Domain List → dnauto.org → Manage → Advanced DNS**. Leave the
nameservers on Spaceship's default (Spaceship DNS) — you do not need to move
them to Vercel.

**Records** — all pointing at the same deployment:

| Host | Type | Value |
|---|---|---|
| `@` | A | `76.76.21.21` |
| `www` | CNAME | `cname.vercel-dns.com` |
| `customer` | CNAME | `cname.vercel-dns.com` |
| `workers` | CNAME | `cname.vercel-dns.com` |
| `admin` | CNAME | `cname.vercel-dns.com` |

Vercel shows the exact apex value to use on the Domains screen — use whatever
it gives you rather than the number above if they differ. Then add all five
host names as domains on the **same** Vercel project.

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

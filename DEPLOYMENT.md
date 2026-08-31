# Deploying DN Auto

Everything here assumes the future domain is `dnauto.lk`. Swap in whatever you
actually register — nothing in the code hard-codes it.

---

## 1. Supabase

1. Create a project at [supabase.com](https://supabase.com) (pick the region
   closest to Sri Lanka — Singapore, `ap-southeast-1`).
2. SQL editor → run `supabase/schema.sql`, then `supabase/seed.sql`.
3. **Database → Replication** → enable Realtime on the `notifications` table.
   Without this the notification bell still works, it just won't update live.
4. **Authentication → URL Configuration**:
   - Site URL: `https://dnauto.lk`
   - Redirect URLs — add every host the app runs on:
     ```
     https://dnauto.lk/auth/callback
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

**DNS** — four records, all to the same target:

| Host | Type | Value |
|---|---|---|
| `dnauto.lk` | A / ALIAS | the host's IP or alias |
| `customer.dnauto.lk` | CNAME | `cname.vercel-dns.com` |
| `workers.dnauto.lk` | CNAME | `cname.vercel-dns.com` |
| `admin.dnauto.lk` | CNAME | `cname.vercel-dns.com` |

Then add all four as domains on the same Vercel project.

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
update profiles set role = 'admin' where email = 'you@example.com';
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

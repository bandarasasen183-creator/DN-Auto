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
| `SUPABASE_SERVICE_ROLE_KEY` | Inbound email, which has no signed-in user to run row-level security as. **Never** expose it to the browser | For the mailbox |
| `ANTHROPIC_API_KEY` | DN Assist. Without it the assistant returns a clear "not configured" message rather than failing | No |
| `NEXT_PUBLIC_ROOT_DOMAIN` | Overrides `dnauto.lk`, e.g. on a staging deploy | No |
| `NEXT_PUBLIC_ALIAS_DOMAINS` | Comma-separated domains that redirect to the canonical one | No |
| `NEXT_PUBLIC_SITE_URL` | Absolute base for canonical links and the sitemap | No |
| `WEBXPAY_MERCHANT_ID` / `WEBXPAY_SECRET` | WEBXPAY online adapter | When going live |
| `WEBXPAY_TERMINAL_URL` / `WEBXPAY_TERMINAL_KEY` | Card terminal. WEBXPAY have confirmed there is no API, so these stay empty and handover captures the method and a signature instead | No |
| `RESEND_API_KEY` | Sending and receiving email. Without it the app says email isn't set up rather than failing quietly | To email anything |
| `RESEND_FROM` | The address customers see, e.g. `DN Auto Repairs <service@send.dnauto.lk>`. Must be on a domain verified in Resend | With the above |
| `RESEND_WEBHOOK_SECRET` | Signs the inbound webhook. Without it the mailbox refuses every delivery, since it can't tell Resend from anyone who found the URL | For the mailbox |
| `ANDROID_CERT_FINGERPRINT` / `ANDROID_PACKAGE_ID` | Vouches for the installed Android app at `/.well-known/assetlinks.json`. See [APK.md](APK.md) | Only if building the APK |
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

The domain is registered with **BuyDomains.LK**, but its nameservers are
delegated to **Cloudflare**, so every record below is added in the Cloudflare
dashboard rather than at the registrar. The registrar only holds the
nameserver delegation now; changing a record there does nothing.

> **Turn the proxy off — the orange cloud — on every record pointing at
> Vercel.** Proxied records must be DNS-only (grey cloud). Cloudflare
> proxying in front of Vercel means two CDNs terminating TLS for the same
> host, which produces either a redirect loop or a 526, and neither error
> says what is actually wrong.
>
> While you are there: **SSL/TLS → Overview → Full (strict)**. On
> *Flexible*, Cloudflare talks HTTP to Vercel, Vercel redirects to HTTPS,
> and the site loops until the browser gives up.

| Host | Type | Value | Proxy |
|---|---|---|---|
| `@` | A | `76.76.21.21` | DNS only |
| `www` | CNAME | `cname.vercel-dns.com` | DNS only |
| `customer` | CNAME | `cname.vercel-dns.com` | DNS only |
| `workers` | CNAME | `cname.vercel-dns.com` | DNS only |
| `team` | CNAME | `cname.vercel-dns.com` | DNS only |
| `pay` | CNAME | `cname.vercel-dns.com` | DNS only |
| `admin` | CNAME | `cname.vercel-dns.com` | DNS only |

`pay` is the host for the workshop tablets — it opens billing directly, and is
the address the tablets install from. See [TABLETS.md](TABLETS.md).

### Email

Two separate jobs, and it is worth being clear which is which, because one
of them looks like it covers both and doesn't.

**Sending — Resend.** Everything the app emails a customer. Resend has a
Cloudflare integration: add `dnauto.lk` in Resend, click through to
Cloudflare, and it writes its own DKIM, SPF and DMARC records. Then put the
API key in `RESEND_API_KEY` on Vercel.

Send from a subdomain — `RESEND_FROM="DN Auto Repairs <service@send.dnauto.lk>"`
— rather than the root. If a batch of mail ever gets marked as spam, that
damages the reputation of whatever domain sent it, and it should not be the
one your actual business mail arrives on.

**Receiving — Resend Inbound.** Mail to the workshop lands in the app, at
**Worker → Mailbox**, and is answered from there.

1. **Resend → Domains → dnauto.lk → Inbound → Enable.** Resend gives you an
   MX record. Add it in Cloudflare on the root:

   | Type | Name | Value | Priority | Proxy |
   |---|---|---|---|---|
   | MX | `@` | *(the host Resend shows)* | 10 | DNS only |

2. **Resend → Webhooks → Add endpoint**, pointed at
   `https://dnauto.lk/api/email/inbound`, subscribed to **`email.received`**.
3. Copy the signing secret into `RESEND_WEBHOOK_SECRET` on Vercel, and make
   sure `SUPABASE_SERVICE_ROLE_KEY` is set there too — the webhook has no
   signed-in user, so it writes as the service role.

> **One MX setup per domain.** If you switched on Cloudflare Email Routing
> earlier, turn it off before adding Resend's MX. Two sets of MX records on
> one domain means mail arrives at whichever answers first, which is not a
> coin toss to run on customer email.

Everything to `@dnauto.lk` then arrives in the app — `info@`, `admin@`, all
of it. Resend keeps the message even if the webhook is down and retries, so
an outage delays mail rather than losing it.

If somebody also wants a copy in a normal inbox — supplier invoices your dad
would rather read on his phone — Resend can forward those on. That is a rule
in Resend's dashboard, not a change here.

### dnauto.org — the alias

Registered at **Spaceship**. Either leave its DNS there (Domain List →
dnauto.org → Manage → Advanced DNS) or move its nameservers to Cloudflare
alongside the .lk — one dashboard for both is less to remember.

| Host | Type | Value | Proxy |
|---|---|---|---|
| `@` | A | `76.76.21.21` | DNS only |
| `www` | CNAME | `cname.vercel-dns.com` | DNS only |

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

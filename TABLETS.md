# Setting up the workshop tablets

For the **Kogan Explore Tab 10.1"** (Android), one per mechanic, in a bumper
case with a screen protector.

The app is installed to the home screen as a web app. There is nothing to
download from an app store and nothing to update by hand — a deploy reaches
every tablet the next time it is opened.

---

## 1. Before you hand it over

On each tablet, once:

1. **Wi-Fi** — connect it to the workshop network. Turn on *auto-reconnect*.
2. **Settings → Display → Screen timeout** — set to **10 minutes**. The app
   holds the screen awake while a payment is on screen, but a longer timeout
   means fewer unlocks between jobs.
3. **Settings → Display → Auto-rotate** — leave **on**. Billing works either
   way up; landscape is better for raising a bill, portrait for holding the
   total up to a customer.
4. **Settings → Security → Screen lock** — set a PIN. These tablets can see
   customer names and phone numbers, so an unlocked one left on a bench is a
   real problem.
5. Sign the mechanic in to **Chrome**, not a different browser — the install
   step below relies on it.

## 2. Install the app

1. Open Chrome and go to **https://pay.dnauto.lk**
2. Sign in as that mechanic. **Each tablet uses that mechanic's own account** —
   never a shared login. That is what makes "who sold what" answerable.
3. Chrome menu (⋮) → **Add to Home screen** → **Install**.
4. Open it from the home screen icon, not from Chrome.

Installed, it runs without the address bar, which is roughly 8% of the screen
back and stops anyone wandering off to another site mid-job. It opens straight
onto **Billing**.

## 3. Lock it to the app (recommended)

Android's screen pinning keeps a tablet on the app until someone deliberately
unpins it. Useful when a customer is holding it to tap their card.

**Settings → Security → Advanced → App pinning** → on, and turn on *"Ask for
PIN before unpinning"*.

To pin: open the app, swipe up and hold, tap the app icon, **Pin**.
To unpin: hold Back and Overview together, then enter the PIN.

## 4. Naming the tablets

When taking a card payment, the mechanic types the terminal name — **Bay 1**,
**Bay 2**, **Front desk**. Be consistent: it is what splits the day's takings
by bay. Write the name on the back of the bumper case in marker.

## 5. Day to day

| Task | Where |
|---|---|
| Raise a bill | Billing → **New bill** |
| Bill a walk-in with no account | New bill → leave the job as *Walk-in* |
| Take a card payment | Open the bill → **Pay now on the machine** |
| Take cash | Open the bill → **Cash / transfer** |
| Refund | Open the bill → **Refund** beside the payment |
| Give a discount | Type the code when raising the bill |
| Make a new code | Billing → **Promo codes** |
| Check own takings | Billing → **Raised by me** |

At close, **Billing** shows bills raised today and the total taken. That is the
number to reconcile against the till and the card machine's own report.

## 6. What the tablet cannot do

- **It does not need to talk to the card machine.** Right now the tablet shows
  the amount to key into the machine. If WEBXPAY's terminal turns out to have
  an API, the amount goes across automatically and nothing else changes.
- **It needs a working connection.** Bills are written to the database as they
  are raised — there is no offline queue. If the Wi-Fi drops mid-bill, write
  the job down and enter it when the connection is back. If the workshop's
  connection is unreliable, say so and offline drafts become worth building.

## 7. If a tablet is lost or a mechanic leaves

**Admin → Workers → Suspend.** They are signed out on the next page load and
cannot sign back in. Their past work, bills and payments stay exactly as they
were — nothing is deleted, because the ledger has to remain intact.

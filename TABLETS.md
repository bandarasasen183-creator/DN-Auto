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

## 2. Strip out what the workshop doesn't need

These tablets ship with around thirty Google apps — YouTube, Play Games, Kids
Space, Photos — none of which a workshop tablet has any use for. On 4GB of RAM
they are not just clutter: they sit in the background, sync, and take memory
away from the app actually being used at the counter.

**Disabling them in Settings is not enough.** *Uninstalling* them for the
device's user profile is, and it needs no root and no unlocked bootloader —
just a USB cable.

### Turn on USB debugging

1. **Settings → About tablet** → tap **Build number** seven times.
2. **Settings → System → Developer options** → turn on **USB debugging**.
3. Plug the tablet into the Mac. Accept the "Allow USB debugging?" prompt on
   the tablet — tick *Always allow from this computer*.
4. On the Mac, install the platform tools once: `brew install android-platform-tools`
5. Check it sees the tablet: `adb devices` — it should list one device.

### Remove the apps

Each line removes one app for the tablet's user. Run them one at a time; a
`Failure` on any single line is harmless, it just means that app isn't on this
build under that name.

```bash
# Media and entertainment
adb shell pm uninstall --user 0 com.google.android.youtube
adb shell pm uninstall --user 0 com.google.android.apps.youtube.music
adb shell pm uninstall --user 0 com.google.android.apps.youtube.kids
adb shell pm uninstall --user 0 com.google.android.videos
adb shell pm uninstall --user 0 com.google.android.play.games
adb shell pm uninstall --user 0 com.google.android.apps.books

# Google personal apps
adb shell pm uninstall --user 0 com.google.android.apps.photos
adb shell pm uninstall --user 0 com.google.android.gm
adb shell pm uninstall --user 0 com.google.android.apps.docs
adb shell pm uninstall --user 0 com.google.android.keep
adb shell pm uninstall --user 0 com.google.android.apps.maps
adb shell pm uninstall --user 0 com.google.android.apps.tachyon
adb shell pm uninstall --user 0 com.google.android.apps.meetings

# Assistant, search bar, and the rest
adb shell pm uninstall --user 0 com.google.android.googlequicksearchbox
adb shell pm uninstall --user 0 com.google.android.apps.kids.home
adb shell pm uninstall --user 0 com.google.android.apps.wellbeing
adb shell pm uninstall --user 0 com.google.android.projection.gearhead
adb shell pm uninstall --user 0 com.google.ar.core
```

### Leave these alone

Removing any of these breaks the tablet for what we actually need it to do:

| Package | Why it stays |
|---|---|
| `com.android.chrome` | The app runs in it |
| `com.google.android.webview` | Renders the app. Removing it kills the PWA outright |
| `com.google.android.gms` | Play Services. Removing it breaks logins, notifications and half the OS |
| `com.android.vending` | Play Store — needed to install the launcher below |
| `com.google.android.apps.adm` | **Find My Device.** Keep this. A tablet with customer names on it is worth being able to locate and wipe remotely |
| `com.android.settings` | Obvious, but people do try |

Keep the Camera too — photographing damage on arrival is worth having.

### If you remove something you needed

Nothing here is permanent. To put an app back:

```bash
adb shell cmd package install-existing com.google.android.youtube
```

A factory reset also restores every one of them, so there is no way to
permanently ruin the tablet with the commands above.

### Then hide the rest

Install **Nova Launcher** from the Play Store, set it as the default home app,
and hide every icon except Chrome and Settings. Between the uninstalls and the
launcher, the tablet stops looking like a personal Android device and starts
looking like a workshop terminal.

### A note on custom operating systems

The answer is no, and it is worth writing down so nobody spends a weekend on
it. The **Kogan KATB10128WPA** is a rebadged generic ODM board. There is no
published bootloader unlock, no kernel source release from Kogan, and no
LineageOS device tree — because almost nobody else owns one. Flashing a ROM
built for a *similar* board is how you end up with a tablet that will not boot
and no recovery mode to rescue it from.

The `Xtend` 4096MB shown in Settings is not real memory either. It is
compressed swap written to the 128GB of storage. It helps a little with
switching between apps and does nothing about the real 4GB ceiling — which is
exactly why removing the background apps above is the thing that actually
makes the tablet faster.

The stalled Android 14 update is Kogan's OTA server, not the tablet. Leave it.

## 3. Install the app

1. Open Chrome and go to **https://pay.dnauto.lk**
2. Sign in as that mechanic. **Each tablet uses that mechanic's own account** —
   never a shared login. That is what makes "who sold what" answerable.
3. Chrome menu (⋮) → **Add to Home screen** → **Install**.
4. Open it from the home screen icon, not from Chrome.

Installed, it runs without the address bar, which is roughly 8% of the screen
back and stops anyone wandering off to another site mid-job. It opens straight
onto **Billing**.

## 4. Lock it to the app (recommended)

Android's screen pinning keeps a tablet on the app until someone deliberately
unpins it. Useful when a customer is holding it to tap their card.

**Settings → Security → Advanced → App pinning** → on, and turn on *"Ask for
PIN before unpinning"*.

To pin: open the app, swipe up and hold, tap the app icon, **Pin**.
To unpin: hold Back and Overview together, then enter the PIN.

## 5. Naming the tablets

When taking a card payment, the mechanic types the terminal name — **Bay 1**,
**Bay 2**, **Front desk**. Be consistent: it is what splits the day's takings
by bay. Write the name on the back of the bumper case in marker.

## 6. Day to day

| Task | Where |
|---|---|
| Raise a bill | Billing → **New bill** |
| Book a car in | **In the workshop** → *Car arrived* |
| See what's in the shop | **In the workshop** |
| Bill a car that's here | New bill → pick it under *A car in the workshop* |
| Take a card payment | Open the bill → **Pay now on the machine** |
| Take cash | Open the bill → **Cash / transfer** |
| Refund | Open the bill → **Refund** beside the payment |
| Give a discount | Type the code when raising the bill |
| Make a new code | Billing → **Promo codes** |
| Check own takings | Billing → **Raised by me** |

At close, **Billing** shows bills raised today and the total taken. That is the
number to reconcile against the till and the card machine's own report.

## 7. What the tablet cannot do

- **It does not need to talk to the card machine.** Right now the tablet shows
  the amount to key into the machine. If WEBXPAY's terminal turns out to have
  an API, the amount goes across automatically and nothing else changes.
- **Tickets work without Wi-Fi; payments do not.** Opening a ticket or moving
  one along is saved on the tablet and sent the moment the connection is back —
  the bar at the top of the screen says how many changes are waiting. Taking a
  payment needs a connection, deliberately: a payment saved offline and sent
  twice would charge the customer twice. Take it on the card machine as usual,
  write the amount down, and record it when the Wi-Fi returns.

## 8. If a tablet is lost or a mechanic leaves

**Admin → Workers → Suspend.** They are signed out on the next page load and
cannot sign back in. Their past work, bills and payments stay exactly as they
were — nothing is deleted, because the ledger has to remain intact.

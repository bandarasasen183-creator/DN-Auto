# Building the DN Auto app as a real APK

The workshop app can be installed from Chrome as a web app, which is enough
to use it. This document is about the other thing: a genuine `.apk` that
installs like any other Android app, shows in the app drawer with its own
icon, and can be handed to a tablet over a USB cable with no Play Store and
no Google account.

It is the same app. What changes is how Android treats it.

---

## What this actually is

A **Trusted Web Activity** (TWA) — an Android app whose entire contents are
this website, running full screen with no browser interface. Google's own
`bubblewrap` tool generates it. There is no second codebase: a deploy to
Vercel updates the app on every tablet, because the app *is* the site.

The one thing that makes it feel native rather than like a browser is
**Digital Asset Links**. The domain has to publicly vouch for the app's
signing certificate. Without that the app runs with a URL bar across the
top, which defeats the point.

That verification is already wired up — `app/assetlinks/route.js` serves it
at `/.well-known/assetlinks.json`, and reads the fingerprint from an
environment variable. You only have to fill the variable in.

---

## 1. Prerequisites

On the Mac, once:

```bash
brew install openjdk@17
npm install -g @bubblewrap/cli
```

The first `bubblewrap` command will offer to download the Android SDK
itself. Say yes — it puts it somewhere out of the way and nothing else
needs installing.

## 2. Generate the project

From the repository root:

```bash
bubblewrap init --manifest https://pay.dnauto.lk/manifest.webmanifest
```

`twa-manifest.json` in this repo already holds the right answers — package
id, colours, start URL, shortcuts — so accept the defaults where they match
it. When it asks about a **signing key**, let it create one at
`android.keystore` with the alias `dnauto`.

> **The keystore is the one irreplaceable file here.** Lose it and you can
> never ship an update to an already-installed app — every tablet has to
> uninstall and reinstall. Back it up somewhere that is not this repository,
> along with the passwords. It is deliberately in `.gitignore`; keep it that
> way, because a signing key in a public repo is a signing key anyone can
> use to impersonate the app.

## 3. Take the fingerprint

```bash
keytool -list -v -keystore android.keystore -alias dnauto | grep SHA256
```

Copy the colon-separated hex value. Then in **Vercel → Settings →
Environment Variables**, add it for Production:

```
ANDROID_CERT_FINGERPRINT=AB:CD:EF:...:12
ANDROID_PACKAGE_ID=lk.dnauto.workshop
```

Redeploy, then check it took:

```bash
curl https://pay.dnauto.lk/.well-known/assetlinks.json
```

You want the package name and your fingerprint back. An empty `[]` means
the variable didn't reach production — fix that before building, or the app
will install with a URL bar and you'll wonder why.

## 4. Build

```bash
bubblewrap build
```

Out comes `app-release-signed.apk`.

## 5. Install it on a tablet

The tablets already have USB debugging on from the de-bloat in
[TABLETS.md](TABLETS.md), so:

```bash
adb install -r app-release-signed.apk
```

`-r` reinstalls over an existing copy, keeping its data. Repeat per tablet,
or copy the APK to a USB stick and install it from the tablet's Files app.

**No Play Store, no Google account, no developer fee.** Sideloading an app
you wrote onto tablets you own is entirely ordinary; Android will warn about
installing from an unknown source the first time, which is expected.

## 6. Publish the APK so tablets can update themselves

Copy the built file into the site and deploy it:

```bash
cp app-release-signed.apk public/app/dn-auto.apk
git add -A && git commit -m "Publish app 1.0.0" && git push
```

The APK itself is **not** committed — `.gitignore` excludes it, because a
signed binary does not belong in a git history. Vercel picks it up from
the working copy at build time.

Once deployed, a tablet running an older shell shows an **App update
available** banner. Tapping *Update now* downloads the APK in the
background with a progress bar, then hands it to Android to install.

> Android always shows its own install confirmation, and always will. No
> sideloaded app can update itself silently — that is a deliberate part of
> Android, not a gap in this. A mechanic taps *Update* once and it is done.

## 7. Shipping an update

Only needed when something about the *shell* changes — the icon, the name,
the start URL, the Android version target. Ordinary changes to the site
reach the tablets on their own, because the app loads the live site. Most
months you will never touch this.

When you do, **three numbers must move together**:

| File | Field | Note |
|---|---|---|
| `twa-manifest.json` | `appVersionName` | `"1.1.0"` |
| `twa-manifest.json` | `appVersionCode` | must *increase*, or Android refuses the install |
| `twa-manifest.json` | `startUrl` | `/worker/billing?app=1.1.0` — this is how a tablet knows which build it is running |
| `lib/app-release.js` | `versionName` / `versionCode` | what the tablets are told is newest |

Get `startUrl` wrong and the banner either never appears or never goes
away, because the app reports a version that doesn't match what it is.
Also put something useful in `notes` — it is shown on the banner, so write
it for a mechanic ("Bigger buttons on the payment screen"), not as a
changelog line.

Then:

```bash
bubblewrap build
cp app-release-signed.apk public/app/dn-auto.apk
```

Commit, push, and the tablets offer it themselves. You only need a cable
for the very first install on each tablet.

---

## 8. Should you put it on the Play Store?

Probably not, and not yet.

Sideloading covers what you actually need — a handful of tablets you
physically own. The Play Store costs a one-off US$25, requires a privacy
policy, and subjects an app that handles customer names and payment records
to Google's data-safety review. That is a real amount of work for no benefit
while the only users are your own mechanics.

It becomes worth it if you ever want customers to install something, which
is a different app to this one.

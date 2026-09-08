/**
 * The current Android build.
 *
 * Two versions are at play and it is worth keeping them straight:
 *
 *   - The *site* updates on its own. The APK is a Trusted Web Activity —
 *     a shell around this site — so a deploy reaches every tablet the next
 *     time it is opened. Nothing here is involved in that.
 *
 *   - The *shell* does not. Icon, name, package id, Android target: those
 *     are baked into the APK, and a sideloaded app gets no automatic
 *     updates from Android because there is no Play Store watching it.
 *
 * This file describes the newest shell we have built, so a tablet running
 * an older one can notice and say so. Bump it in the same commit that
 * bumps `twa-manifest.json`, or the tablets will be told to update to a
 * build that doesn't exist yet.
 */

export const APP_RELEASE = {
  versionName: '1.0.0',
  // Must match `appVersionCode` in twa-manifest.json. Android refuses an
  // install whose code is not higher than what is already there.
  //
  // This drifted to 2 in the actual built APK (bubblewrap bumps it on
  // rebuilds) without this file following, which is exactly the mismatch
  // the comment above warns about. Keeping it in sync here even though
  // nothing currently reads versionCode client-side — the day something
  // does, or a human reads this file to decide what to bump next, it
  // needs to already be telling the truth.
  versionCode: 2,
  // Where the APK is served from. A path, not an absolute URL, so it
  // works the same on a preview deploy as in production.
  downloadPath: '/app/dn-auto.apk',
  // Shown on the update prompt. Say what changed in terms a mechanic
  // cares about, not commit messages.
  notes: 'First release.',
};

/** Parses "1.2.3" into something comparable. Missing parts count as 0. */
export function parseVersion(value) {
  return String(value ?? '')
    .split('.')
    .map((part) => Number.parseInt(part, 10) || 0);
}

/** True when `installed` is behind `latest`. */
export function isOutdated(installed, latest = APP_RELEASE.versionName) {
  if (!installed) return false;
  const a = parseVersion(installed);
  const b = parseVersion(latest);
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    if ((a[i] ?? 0) < (b[i] ?? 0)) return true;
    if ((a[i] ?? 0) > (b[i] ?? 0)) return false;
  }
  return false;
}

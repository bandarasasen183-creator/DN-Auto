/**
 * Digital Asset Links, for the installed Android app.
 *
 * The workshop app is a Trusted Web Activity — a real APK that opens this
 * site full screen with no browser chrome. Android only grants it that
 * trust if the domain vouches for the APK's signing certificate here. Get
 * this wrong and the app still works, but with a URL bar across the top,
 * which is the whole thing the APK exists to remove.
 *
 * Served at /.well-known/assetlinks.json via a rewrite in next.config.mjs.
 *
 * The fingerprint comes from the keystore Bubblewrap generates:
 *   keytool -list -v -keystore android.keystore -alias dnauto
 * Put the SHA-256 line in ANDROID_CERT_FINGERPRINT.
 */

export const dynamic = 'force-dynamic';

const PACKAGE_ID = process.env.ANDROID_PACKAGE_ID || 'lk.dnauto.workshop';

export function GET() {
  const fingerprint = process.env.ANDROID_CERT_FINGERPRINT?.trim();

  // No fingerprint means the APK hasn't been built yet. An empty list is the
  // honest answer — better than vouching for a certificate that isn't ours.
  const body = fingerprint
    ? [
        {
          relation: ['delegate_permission/common.handle_all_urls'],
          target: {
            namespace: 'android_app',
            package_name: PACKAGE_ID,
            sha256_cert_fingerprints: [fingerprint],
          },
        },
      ]
    : [];

  return new Response(JSON.stringify(body, null, 2), {
    headers: {
      'content-type': 'application/json',
      'cache-control': 'public, max-age=3600',
    },
  });
}

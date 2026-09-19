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
  const envFingerprint = process.env.ANDROID_CERT_FINGERPRINT?.trim();
  const fingerprints = [
    'E4:7C:0F:72:89:B5:FA:39:57:B6:DA:BA:E1:18:48:FE:FC:C3:67:13:82:15:EA:AF:4B:DC:87:78:21:A0:FB:93',
    '0B:C8:FE:69:15:EF:F7:7E:70:32:FB:FC:71:4E:7C:5A:8A:3C:0F:E4:16:63:34:4A:83:99:8D:BC:FC:48:CA:60',
    envFingerprint,
  ].filter(Boolean);

  const body = [
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: PACKAGE_ID,
        sha256_cert_fingerprints: Array.from(new Set(fingerprints)),
      },
    },
  ];

  return new Response(JSON.stringify(body, null, 2), {
    headers: {
      'content-type': 'application/json',
      'cache-control': 'public, max-age=3600',
    },
  });
}

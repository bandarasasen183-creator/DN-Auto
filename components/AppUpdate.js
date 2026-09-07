'use client';

import { useCallback, useEffect, useState } from 'react';
import Icon from './Icon';

const STORAGE_KEY = 'dn-app-version';

/** Reads a value that may not be readable — private mode, blocked storage. */
function remembered(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function remember(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* Nothing to do. The version param will be read again next launch. */
  }
}

/**
 * Is this the installed Android app, rather than a browser?
 *
 * A Trusted Web Activity sets the referrer to android-app://<package>.
 * That only appears on the first navigation, so the answer is remembered
 * once rather than re-derived on every page.
 */
function inInstalledApp() {
  if (typeof document === 'undefined') return false;
  if (document.referrer.startsWith('android-app://')) {
    remember('dn-app-installed', '1');
    return true;
  }
  return remembered('dn-app-installed') === '1';
}

/**
 * Tells a tablet when its app shell is out of date, and updates it.
 *
 * The site itself updates on its own — the app is a shell around it. This
 * is only for the shell: a new icon, a new name, a newer Android target.
 * Rare, but there is otherwise no way for a sideloaded app to find out,
 * because nothing is watching it the way the Play Store would.
 *
 * The APK downloads in the background so the mechanic isn't left staring
 * at a progress bar mid-shift. Android still shows its own install
 * confirmation at the end — no sideloaded app can update itself silently,
 * and that is a deliberate part of Android rather than something to work
 * around.
 */
export default function AppUpdate() {
  const [release, setRelease] = useState(null);
  const [installed, setInstalled] = useState(null);
  const [progress, setProgress] = useState(null);
  const [ready, setReady] = useState(null);
  const [error, setError] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!inInstalledApp()) return;

    // The version is baked into the APK's start URL, so it arrives as a
    // query parameter on the first launch and is kept from then on.
    const fromUrl = new URLSearchParams(window.location.search).get('app');
    if (fromUrl) remember(STORAGE_KEY, fromUrl);
    const current = fromUrl ?? remembered(STORAGE_KEY);

    // No version at all means an APK built before this existed. Treat it
    // as ancient rather than current — it is the one build we know is
    // behind, and saying nothing would leave it stranded forever.
    setInstalled(current ?? '0.0.0');

    let cancelled = false;
    fetch('/api/app/version')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled) setRelease(data);
      })
      .catch(() => {
        /* Offline, or the endpoint isn't deployed. Say nothing. */
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const download = useCallback(async () => {
    if (!release) return;
    setError(null);
    setProgress(0);

    try {
      const response = await fetch(release.downloadPath);
      if (!response.ok) throw new Error(`The download returned ${response.status}.`);

      const total = Number(response.headers.get('content-length')) || 0;
      const reader = response.body?.getReader();

      // No streaming body available — fall back to a plain download, which
      // works, just without a progress bar.
      if (!reader) {
        setReady(release.downloadPath);
        setProgress(100);
        return;
      }

      const chunks = [];
      let received = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        received += value.length;
        if (total) setProgress(Math.round((received / total) * 100));
      }

      const blob = new Blob(chunks, { type: 'application/vnd.android.package-archive' });
      setReady(URL.createObjectURL(blob));
      setProgress(100);
    } catch (err) {
      setError(err.message);
      setProgress(null);
    }
  }, [release]);

  if (dismissed || !release || !installed) return null;

  const behind =
    Number(release.versionCode) > 0 &&
    installed !== release.versionName &&
    isBehind(installed, release.versionName);

  if (!behind) return null;

  return (
    <aside className="appupdate" role="status">
      <Icon name="download" size={18} />

      <div className="appupdate__body">
        <strong>App update available — {release.versionName}</strong>
        <span className="small">
          {release.notes} You&apos;re on {installed}.
        </span>

        {progress !== null && progress < 100 && (
          <span className="appupdate__bar" aria-label={`Downloading, ${progress}%`}>
            <span style={{ width: `${progress}%` }} />
          </span>
        )}

        {error && <span className="small">Couldn&apos;t download it — {error}</span>}
      </div>

      {ready ? (
        <a
          className="btn small"
          href={ready}
          download="dn-auto.apk"
          onClick={() => setTimeout(() => setDismissed(true), 1000)}
        >
          Install now
        </a>
      ) : (
        <button
          type="button"
          className="btn small"
          onClick={download}
          disabled={progress !== null}
        >
          {progress === null ? 'Update now' : `${progress}%`}
        </button>
      )}

      <button
        type="button"
        className="appupdate__close"
        onClick={() => setDismissed(true)}
        aria-label="Not now"
      >
        <Icon name="close" size={14} />
      </button>
    </aside>
  );
}

/** Local copy of the comparison, so this component pulls in nothing server-side. */
function isBehind(installed, latest) {
  const a = String(installed).split('.').map((n) => Number.parseInt(n, 10) || 0);
  const b = String(latest).split('.').map((n) => Number.parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    if ((a[i] ?? 0) < (b[i] ?? 0)) return true;
    if ((a[i] ?? 0) > (b[i] ?? 0)) return false;
  }
  return false;
}

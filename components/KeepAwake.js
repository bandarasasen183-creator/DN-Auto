'use client';

import { useEffect } from 'react';

/**
 * Holds a screen wake lock while mounted.
 *
 * The tablets sleep on a short timer to save battery, and a screen that dies
 * while the customer is reaching for their card is exactly the moment you
 * don't want it. Android reclaims the lock when the tab is hidden, so it is
 * re-acquired on visibilitychange.
 *
 * Renders nothing, and does nothing at all where the API is unsupported —
 * the screen simply behaves as it normally would.
 */
export default function KeepAwake() {
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) return;

    let lock = null;
    let cancelled = false;

    async function acquire() {
      if (document.visibilityState !== 'visible') return;
      try {
        lock = await navigator.wakeLock.request('screen');
        lock.addEventListener('release', () => {
          lock = null;
        });
      } catch {
        // Denied, low battery, or the tab lost focus. Not worth surfacing —
        // the worst case is the screen dims as it always did.
      }
    }

    function onVisibility() {
      if (!cancelled && !lock) acquire();
    }

    acquire();
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
      lock?.release?.().catch(() => {});
    };
  }, []);

  return null;
}

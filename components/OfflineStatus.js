'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Icon from './Icon';
import { flush, pending } from '@/lib/offline/queue';

/**
 * Registers the service worker, shows the connection state, and pushes
 * queued work up the moment there is a connection again.
 *
 * The count matters more than the icon. "Offline" on its own invites a
 * mechanic to assume their last three tickets went nowhere; "offline, 3
 * waiting to send" tells them the truth, which is that the work is safe
 * and will go when the Wi-Fi does.
 */
export default function OfflineStatus() {
  const router = useRouter();
  const [online, setOnline] = useState(true);
  const [waiting, setWaiting] = useState(0);
  const [sending, setSending] = useState(false);
  const [justSent, setJustSent] = useState(0);

  const refresh = useCallback(async () => {
    try {
      setWaiting((await pending()).length);
    } catch {
      /* IndexedDB blocked — offline queueing is simply unavailable. */
    }
  }, []);

  const send = useCallback(async () => {
    if (sending) return;
    setSending(true);
    try {
      const result = await flush();
      setWaiting(result.remaining);
      if (result.sent > 0) {
        setJustSent(result.sent);
        // What was queued is now real, so the server-rendered pages need
        // re-fetching or the board keeps showing the old picture.
        router.refresh();
        setTimeout(() => setJustSent(0), 5000);
      }
    } finally {
      setSending(false);
    }
  }, [router, sending]);

  useEffect(() => {
    setOnline(navigator.onLine);
    refresh();

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        /* Not fatal — the app works, it just won't open offline. */
      });

      const onMessage = (event) => {
        if (event.data?.type === 'FLUSH_QUEUE') send();
      };
      navigator.serviceWorker.addEventListener('message', onMessage);

      return () => navigator.serviceWorker.removeEventListener('message', onMessage);
    }
  }, [refresh, send]);

  useEffect(() => {
    function goOnline() {
      setOnline(true);
      send();
    }
    function goOffline() {
      setOnline(false);
    }

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);

    // navigator.onLine only knows whether there is a network, not whether
    // it goes anywhere — workshop Wi-Fi is often "connected" to a router
    // with no internet behind it. So try periodically as well.
    const timer = setInterval(() => {
      if (navigator.onLine) send();
    }, 60_000);

    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
      clearInterval(timer);
    };
  }, [send]);

  if (online && waiting === 0 && justSent === 0) return null;

  if (justSent > 0 && online) {
    return (
      <aside className="netbar netbar--ok" role="status">
        <Icon name="check" size={16} />
        <span>
          Back online — {justSent} {justSent === 1 ? 'change' : 'changes'} sent.
        </span>
      </aside>
    );
  }

  return (
    <aside className={`netbar ${online ? 'netbar--sync' : 'netbar--off'}`} role="status">
      <Icon name={online ? 'send' : 'alert'} size={16} />
      <span>
        {online ? 'Sending what was saved offline' : 'No connection'}
        {waiting > 0 && (
          <>
            {' — '}
            <strong>
              {waiting} {waiting === 1 ? 'change' : 'changes'} waiting to send
            </strong>
          </>
        )}
        .
      </span>

      {!online && (
        <span className="small netbar__note">
          Tickets keep working. Payments need a connection.
        </span>
      )}

      {online && waiting > 0 && (
        <button type="button" className="btn btn--ghost small" onClick={send} disabled={sending}>
          {sending ? 'Sending…' : 'Try now'}
        </button>
      )}
    </aside>
  );
}

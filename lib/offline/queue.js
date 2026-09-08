/**
 * The offline write queue.
 *
 * Only some things belong in here. The rule is: a queued action must be
 * safe to replay, and safe to be wrong about for a few minutes.
 *
 *   Queued  — opening a ticket, moving one along, editing its details.
 *             A duplicate ticket is visible on the board and takes ten
 *             seconds to cancel.
 *
 *   Never   — anything involving money. A payment replayed twice charges
 *             a customer twice; an invoice number allocated on two
 *             tablets at once collides; a refund replayed is money gone.
 *             Those wait for a connection and say so.
 *
 * Every queued action carries a client-generated id, and the server
 * ignores one it has already seen. That is what makes a retry safe: the
 * queue can flush twice, or two tabs can flush at once, and the result is
 * the same as flushing once.
 */

const DB_NAME = 'dn-offline';
const STORE = 'queue';
const DB_VERSION = 1;

/** Minimal IndexedDB wrapper — a whole library for one store isn't worth it. */
function open() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function tx(db, mode, run) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, mode);
    const store = transaction.objectStore(STORE);
    const result = run(store);
    transaction.oncomplete = () => resolve(result?.result ?? result);
    transaction.onerror = () => reject(transaction.error);
  });
}

export function newId() {
  return crypto.randomUUID();
}

/**
 * Puts an action in the queue.
 *
 * `queuedAt` orders the flush. Two status changes to the same ticket must
 * arrive in the order the mechanic made them, or the board ends up
 * showing the earlier one.
 */
export async function enqueue(action) {
  const db = await open();
  const row = {
    id: action.id ?? newId(),
    kind: action.kind,
    payload: action.payload,
    queuedAt: Date.now(),
    attempts: 0,
  };
  await tx(db, 'readwrite', (store) => store.put(row));
  db.close();
  return row;
}

export async function pending() {
  const db = await open();
  const rows = await tx(db, 'readonly', (store) => store.getAll());
  db.close();
  return (rows ?? []).sort((a, b) => a.queuedAt - b.queuedAt);
}

export async function remove(id) {
  const db = await open();
  await tx(db, 'readwrite', (store) => store.delete(id));
  db.close();
}

async function bump(row, reason) {
  const db = await open();
  await tx(db, 'readwrite', (store) =>
    store.put({ ...row, attempts: (row.attempts ?? 0) + 1, lastError: reason })
  );
  db.close();
}

/**
 * Sends everything waiting, oldest first.
 *
 * Stops at the first failure rather than carrying on: the actions are
 * ordered, and pushing a later one past a stuck earlier one is how a
 * ticket ends up marked ready before it was ever started.
 */
export async function flush() {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return { sent: 0, remaining: (await pending()).length };
  }

  const rows = await pending();
  let sent = 0;

  for (const row of rows) {
    // Something that has failed repeatedly is not going to start working.
    // Leave it for a person to look at rather than hammering the server.
    if (row.attempts >= 5) break;

    try {
      const response = await fetch('/api/offline/sync', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: row.id, kind: row.kind, payload: row.payload }),
      });

      if (response.ok) {
        await remove(row.id);
        sent += 1;
        continue;
      }

      // 4xx means the server will never accept this. Retrying forever
      // would block everything behind it, so it is dropped and reported.
      if (response.status >= 400 && response.status < 500) {
        const body = await response.json().catch(() => ({}));
        await bump(row, body?.error ?? `Rejected (${response.status})`);
        if (response.status !== 401 && response.status !== 429) {
          await remove(row.id);
        }
        break;
      }

      await bump(row, `Server error (${response.status})`);
      break;
    } catch (error) {
      await bump(row, error?.message ?? 'Network error');
      break;
    }
  }

  return { sent, remaining: (await pending()).length };
}

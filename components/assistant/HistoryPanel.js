'use client';

import { useEffect, useState } from 'react';

/** Past conversations, loaded from the database rather than local storage. */
export default function HistoryPanel({ activeId, onOpen, onNew }) {
  const [conversations, setConversations] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    fetch('/api/assistant/history')
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.error) setError(data.error);
        else setConversations(data.conversations);
      })
      .catch(() => !cancelled && setError('Could not load your conversations.'));

    return () => {
      cancelled = true;
    };
  }, []);

  async function open(id) {
    const res = await fetch(`/api/assistant/history?conversation=${id}`);
    const data = await res.json();
    onOpen(id, (data.messages ?? []).map((m) => ({ role: m.role, content: m.content })));
  }

  return (
    <div className="assist__body">
      <button type="button" className="btn btn--ghost small" style={{ width: '100%' }} onClick={onNew}>
        + Start a new conversation
      </button>

      {error && <p className="form-error" style={{ marginTop: '1rem' }}>{error}</p>}

      {conversations === null && !error && (
        <p className="small muted" style={{ marginTop: '1rem' }}>Loading…</p>
      )}

      {conversations?.length === 0 && (
        <p className="small muted" style={{ marginTop: '1rem' }}>
          Nothing here yet — your conversations will be saved so you can pick them up later.
        </p>
      )}

      <ul style={{ listStyle: 'none', margin: '1rem 0 0', padding: 0, display: 'grid', gap: '0.4rem' }}>
        {(conversations ?? []).map((c) => (
          <li key={c.id}>
            <button
              type="button"
              className="assist__history"
              data-active={c.id === activeId}
              onClick={() => open(c.id)}
            >
              <strong className="small">{c.title}</strong>
              <span className="small muted">
                {new Date(c.updated_at).toLocaleDateString('en-LK', {
                  day: 'numeric',
                  month: 'short',
                })}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

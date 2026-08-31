'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

/**
 * Unread notifications, kept live over Supabase Realtime so a customer sees a
 * status change without refreshing.
 */
export default function NotificationBell({ userId }) {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    async function load() {
      const { data } = await supabase
        .from('notifications')
        .select('id, title, body, link, read_at, created_at')
        .is('read_at', null)
        .order('created_at', { ascending: false })
        .limit(10);
      if (active) setItems(data ?? []);
    }

    load();

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        (payload) => setItems((prev) => [payload.new, ...prev].slice(0, 10))
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [userId]);

  async function markRead(id) {
    const supabase = createClient();
    await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', id);
    setItems((prev) => prev.filter((n) => n.id !== id));
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        className="bell"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={`Notifications${items.length ? `, ${items.length} unread` : ''}`}
      >
        <span aria-hidden>🔔</span>
        {items.length > 0 && <span className="bell__count">{items.length}</span>}
      </button>

      {open && (
        <div className="bell__panel">
          {items.length === 0 ? (
            <p className="small muted" style={{ margin: 0 }}>Nothing new.</p>
          ) : (
            items.map((n) => (
              <button key={n.id} type="button" className="bell__item" onClick={() => markRead(n.id)}>
                <strong className="small">{n.title}</strong>
                {n.body && <span className="small muted">{n.body}</span>}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

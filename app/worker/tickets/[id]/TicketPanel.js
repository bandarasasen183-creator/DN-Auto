'use client';

import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import Icon from '@/components/Icon';
import FaceScanner from '@/components/FaceScanner';
import { moveTicket, updateTicket } from '../actions';
import { NEXT_STATUS, TICKET_STATUS } from '@/lib/tickets';
import { enqueue } from '@/lib/offline/queue';

const VERB = {
  in_progress: { label: 'Start work', icon: 'wrench' },
  ready: { label: 'Mark ready', icon: 'check' },
  collected: { label: 'Keys handed back', icon: 'check' },
  waiting: { label: 'Back to waiting', icon: 'clock' },
  cancelled: { label: 'Car left', icon: 'close' },
};

function Move({ status, primary }) {
  const { pending } = useFormStatus();
  const verb = VERB[status] ?? { label: TICKET_STATUS[status]?.label ?? status, icon: 'arrowRight' };

  return (
    <button
      type="submit"
      name="status"
      value={status}
      className={primary ? 'btn btn--lg' : 'btn btn--ghost small'}
      disabled={pending}
    >
      <Icon name={verb.icon} size={primary ? 16 : 14} /> {verb.label}
    </button>
  );
}

export function StatusActions({ ticket }) {
  const [state, action] = useFormState(moveTicket, {});
  const [queued, setQueued] = useState(null);
  const moves = NEXT_STATUS[ticket.status] ?? [];

  if (moves.length === 0) {
    return <p className="small muted">This ticket is closed.</p>;
  }

  /**
   * Offline, the move is written to the tablet and sent later. Moving a
   * ticket along is exactly the kind of thing that is safe to queue: it
   * sets an absolute status rather than a delta, so arriving twice does
   * nothing the first arrival didn't.
   */
  async function submit(formData) {
    const status = String(formData.get('status') ?? '');

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      await enqueue({
        kind: 'ticket.move',
        payload: { ticket_id: ticket.id, status },
      });
      setQueued(status);
      return;
    }

    setQueued(null);
    await action(formData);
  }

  return (
    <form action={submit} className="stack" style={{ '--gap': '0.6rem' }}>
      <input type="hidden" name="ticket_id" value={ticket.id} />
      {state?.error && <p className="form-error">{state.error}</p>}
      {queued && (
        <p className="form-note">
          Saved on this tablet — it&apos;ll move to{' '}
          <strong>{TICKET_STATUS[queued]?.label ?? queued}</strong> on the board
          when the Wi-Fi is back.
        </p>
      )}
      {moves.map((status, i) => (
        <Move key={status} status={status} primary={i === 0} />
      ))}
    </form>
  );
}

function Save() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn--ghost small" disabled={pending}>
      {pending ? 'Saving…' : 'Save'}
    </button>
  );
}

export function TicketDetails({ ticket, bays, mechanics }) {
  const [state, action] = useFormState(updateTicket, {});
  const [showFaceScanner, setShowFaceScanner] = useState(false);
  const [assignedName, setAssignedName] = useState('');

  // datetime-local wants the local wall clock, not an ISO string in UTC.
  const promised = ticket.promised_ready_at
    ? (() => {
        const d = new Date(ticket.promised_ready_at);
        const pad = (n) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      })()
    : '';

  return (
    <form action={action} className="card">
      <input type="hidden" name="ticket_id" value={ticket.id} />
      <h3 style={{ marginTop: 0 }}>Where and who</h3>

      {state?.error && <p className="form-error">{state.error}</p>}
      {state?.success && <p className="form-note">Saved.</p>}

      <label className="field">
        <span>Bay</span>
        <select className="select" name="bay_id" defaultValue={ticket.bay_id ?? ''}>
          <option value="">Not assigned</option>
          {bays.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      </label>

      <label className="field">
        <span>Mechanic</span>
        <div className="grid" style={{ gridTemplateColumns: '1fr auto', gap: '0.5rem' }}>
          <input
            className="input"
            name="assigned_name"
            list="dn-detail-mechanics"
            value={assignedName || ticket.assigned_name || ''}
            onChange={(e) => setAssignedName(e.target.value)}
            autoComplete="off"
          />
          <button 
            type="button" 
            className="btn btn--ghost" 
            onClick={() => setShowFaceScanner(true)}
            style={{ color: 'var(--brand)' }}
          >
            <Icon name="scan" size={20} />
          </button>
        </div>
        <datalist id="dn-detail-mechanics">
          {mechanics.map((m) => (
            <option key={m.id} value={m.full_name} />
          ))}
        </datalist>
      </label>

      {showFaceScanner && (
        <FaceScanner 
          mechanics={mechanics} 
          onIdentified={(name) => {
            setAssignedName(name);
            setShowFaceScanner(false);
          }} 
          onClose={() => setShowFaceScanner(false)} 
        />
      )}

      <label className="field">
        <span>Keys</span>
        <input className="input" name="keys_location" defaultValue={ticket.keys_location ?? ''} placeholder="Hook 3" />
      </label>

      <label className="field">
        <span>Ready by</span>
        <input className="input" name="promised_ready_at" type="datetime-local" defaultValue={promised} />
      </label>

      <label className="field">
        <span>Notes</span>
        <input className="input" name="notes" defaultValue={ticket.notes ?? ''} />
      </label>

      <Save />
    </form>
  );
}

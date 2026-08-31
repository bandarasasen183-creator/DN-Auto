'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { updateBooking } from '../../actions';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn" disabled={pending}>
      {pending ? 'Saving…' : 'Save changes'}
    </button>
  );
}

export default function ManageBooking({ booking, workers, bays, statuses }) {
  const [state, action] = useFormState(updateBooking, {});

  return (
    <section className="card rise">
      <h3>Manage this booking</h3>

      {state?.error && <p className="form-error">{state.error}</p>}
      {state?.success && <p className="form-note">Saved.</p>}

      <form action={action}>
        <input type="hidden" name="booking_id" value={booking.id} />

        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
          <label className="field">
            <span>Status</span>
            <select className="select" name="status" defaultValue={booking.status}>
              {statuses.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Mechanic</span>
            <select className="select" name="assigned_worker_id" defaultValue={booking.assigned_worker_id ?? ''}>
              <option value="">Unassigned</option>
              {workers.map((w) => (
                <option key={w.id} value={w.id}>{w.full_name}</option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Bay</span>
            <select className="select" name="bay_id" defaultValue={booking.bay_id ?? ''}>
              <option value="">No bay</option>
              {bays.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </label>
        </div>

        <label className="field">
          <span>Workshop note (internal — the customer never sees this)</span>
          <input className="input" name="internal_note" defaultValue={booking.internal_notes ?? ''} />
        </label>

        <SubmitButton />
      </form>
    </section>
  );
}

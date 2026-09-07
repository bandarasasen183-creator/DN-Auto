'use client';

import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import Icon from '@/components/Icon';
import { openTicket } from '../actions';

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn--lg" disabled={pending}>
      {pending ? 'Opening…' : 'Open the ticket'}
    </button>
  );
}

/** Two hours from now, rounded to the next quarter, for the datetime input. */
function defaultPromise() {
  const d = new Date(Date.now() + 2 * 3600_000);
  d.setMinutes(Math.ceil(d.getMinutes() / 15) * 15, 0, 0);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function TicketForm({ bays, mechanics, bookings, preselectedBooking }) {
  const [state, action] = useFormState(openTicket, {});
  const [bookingId, setBookingId] = useState(preselectedBooking || '');
  const [promise, setPromise] = useState(false);

  const booking = bookings.find((b) => b.id === bookingId);

  return (
    <form action={action} className="grid" style={{ gridTemplateColumns: 'minmax(0, 2fr) minmax(280px, 1fr)', alignItems: 'start' }}>
      <div className="card rise">
        {state?.error && <p className="form-error">{state.error}</p>}

        {bookings.length > 0 && (
          <>
            <label className="field">
              <span>Booked in today?</span>
              <select
                className="select"
                name="booking_id"
                value={bookingId}
                onChange={(e) => setBookingId(e.target.value)}
              >
                <option value="">No — walk-in</option>
                {bookings.map((b) => (
                  <option key={b.id} value={b.id}>
                    {new Date(b.scheduled_for).toLocaleTimeString('en-LK', { timeStyle: 'short' })}
                    {' — '}
                    {b.profiles?.full_name}
                    {b.vehicles ? ` (${b.vehicles.registration})` : ''}
                  </option>
                ))}
              </select>
            </label>
            <p className="small muted" style={{ marginTop: '-0.5rem' }}>
              Only today&apos;s bookings are listed.
            </p>
          </>
        )}

        <h3>The car</h3>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
          <label className="field">
            <span>Registration</span>
            <input
              className="input"
              name="registration"
              key={`reg-${bookingId}`}
              defaultValue={booking?.vehicles?.registration ?? ''}
              placeholder="CAB-1234"
              style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}
              autoComplete="off"
              required
            />
          </label>
          <label className="field">
            <span>Make</span>
            <input className="input" name="make" key={`mk-${bookingId}`} defaultValue={booking?.vehicles?.make ?? ''} placeholder="Toyota" />
          </label>
          <label className="field">
            <span>Model</span>
            <input className="input" name="model" key={`md-${bookingId}`} defaultValue={booking?.vehicles?.model ?? ''} placeholder="Aqua" />
          </label>
          <label className="field">
            <span>Colour</span>
            <input className="input" name="colour" placeholder="Silver" />
          </label>
        </div>

        <h3 style={{ marginTop: '1.25rem' }}>The customer</h3>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))' }}>
          <label className="field">
            <span>Name</span>
            <input className="input" name="customer_name" key={`nm-${bookingId}`} defaultValue={booking?.profiles?.full_name ?? ''} />
          </label>
          <label className="field">
            <span>Phone</span>
            <input className="input" name="customer_phone" type="tel" key={`ph-${bookingId}`} defaultValue={booking?.profiles?.phone ?? ''} placeholder="077 123 4567" />
          </label>
          <label className="field">
            <span>Email (optional)</span>
            <input className="input" name="customer_email" type="email" />
          </label>
        </div>
        <p className="small muted" style={{ marginTop: '-0.5rem' }}>
          A phone number is all we need — it&apos;s how we tell them the car is
          ready. Anything else is theirs to offer.
        </p>

        <h3 style={{ marginTop: '1.25rem' }}>What&apos;s wrong?</h3>
        <label className="field">
          <span>In the customer&apos;s words</span>
          <textarea
            className="input"
            name="complaint"
            rows={3}
            placeholder="Makes a grinding noise going round left corners. Started last week."
            required
          />
        </label>
        <p className="small muted" style={{ marginTop: '-0.5rem' }}>
          Write what they said, not what you think it is. What you find goes on
          the bill — this is what&apos;s useful if the car comes back.
        </p>

        <label className="field">
          <span>Notes for the team (optional)</span>
          <input className="input" name="notes" placeholder="Customer waiting in reception." />
        </label>
      </div>

      <aside className="card rise rise-1">
        <h3>Where and who</h3>

        <label className="field">
          <span>Bay</span>
          <select className="select" name="bay_id" defaultValue="">
            <option value="">Not assigned</option>
            {bays.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Mechanic</span>
          <input
            className="input"
            name="assigned_name"
            list="dn-ticket-mechanics"
            placeholder="Name"
            autoComplete="off"
          />
          <datalist id="dn-ticket-mechanics">
            {mechanics.map((m) => (
              <option key={m.id} value={m.full_name} />
            ))}
          </datalist>
        </label>

        <label className="field">
          <span>Keys</span>
          <input className="input" name="keys_location" placeholder="Hook 3" />
        </label>
        <p className="small muted" style={{ marginTop: '-0.5rem' }}>
          Sounds trivial until there are six cars in.
        </p>

        <hr style={{ border: 0, borderTop: '1px dashed var(--steel-200)', margin: '1.25rem 0' }} />

        <label className="row" style={{ gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
          <input type="checkbox" checked={promise} onChange={(e) => setPromise(e.target.checked)} />
          <span>Told them a time?</span>
        </label>

        {promise ? (
          <label className="field">
            <span>Ready by</span>
            <input
              className="input"
              name="promised_ready_at"
              type="datetime-local"
              defaultValue={defaultPromise()}
            />
          </label>
        ) : (
          <p className="small muted">
            Leave this off unless somebody actually promised a time. A missed
            promise the customer remembers is worse than never giving one.
          </p>
        )}

        <Submit />
        <p className="small muted" style={{ marginTop: '1rem', marginBottom: 0 }}>
          <Icon name="info" size={13} /> The bill comes later — pick this ticket
          from the billing screen when the work is done.
        </p>
      </aside>
    </form>
  );
}

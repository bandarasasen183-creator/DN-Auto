'use client';

import { useState, useMemo } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import Icon from '@/components/Icon';
import { createInvoice } from '../actions';
import { formatLKR } from '@/lib/business';

const BLANK = { description: '', kind: 'labour', quantity: 1, price: '' };

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn--lg" disabled={pending}>
      {pending ? 'Raising…' : 'Raise bill'}
    </button>
  );
}

export default function InvoiceBuilder({ services, bookings, preselectedBooking }) {
  const [items, setItems] = useState([{ ...BLANK }]);
  const [bookingId, setBookingId] = useState(preselectedBooking || '');
  const [state, action] = useFormState(createInvoice, {});

  const subtotal = useMemo(
    () =>
      items.reduce(
        (sum, i) => sum + (Number(i.price) || 0) * (Number(i.quantity) || 1),
        0
      ),
    [items]
  );

  function update(index, key, value) {
    setItems((rows) => rows.map((row, i) => (i === index ? { ...row, [key]: value } : row)));
  }

  /** Picking a service fills the line — faster than typing it at the counter. */
  function applyService(index, serviceId) {
    const service = services.find((s) => s.id === serviceId);
    if (!service) return;
    setItems((rows) =>
      rows.map((row, i) =>
        i === index
          ? { ...row, description: service.name, price: service.base_price_cents / 100 }
          : row
      )
    );
  }

  const booking = bookings.find((b) => b.id === bookingId);

  return (
    <form action={action} className="grid" style={{ gridTemplateColumns: 'minmax(0, 2fr) minmax(300px, 1fr)', alignItems: 'start' }}>
      <div className="card rise">
        {state?.error && <p className="form-error">{state.error}</p>}

        <h3>Who is this for?</h3>
        <label className="field">
          <span>Against a job (optional)</span>
          <select
            className="select"
            name="booking_id"
            value={bookingId}
            onChange={(e) => setBookingId(e.target.value)}
          >
            <option value="">Walk-in — no booking</option>
            {bookings.map((b) => (
              <option key={b.id} value={b.id}>
                {b.reference} — {b.profiles?.full_name}
                {b.vehicles ? ` (${b.vehicles.registration})` : ''}
              </option>
            ))}
          </select>
        </label>

        {!booking && (
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
            <label className="field">
              <span>Customer name</span>
              <input className="input" name="customer_name" placeholder="Walk-in customer" />
            </label>
            <label className="field">
              <span>Phone</span>
              <input className="input" name="customer_phone" type="tel" />
            </label>
          </div>
        )}

        <label className="field">
          <span>Vehicle</span>
          <input
            className="input"
            name="vehicle_note"
            defaultValue={
              booking?.vehicles
                ? `${booking.vehicles.make} ${booking.vehicles.model} · ${booking.vehicles.registration}`
                : ''
            }
            placeholder="Toyota Aqua · CAB-1234"
          />
        </label>

        <h3 style={{ marginTop: '1.5rem' }}>What are we charging for?</h3>

        {items.map((item, i) => (
          <div key={i} className="billline">
            <label className="field">
              <span>Quick add</span>
              <select className="select" value="" onChange={(e) => applyService(i, e.target.value)}>
                <option value="">Choose a service…</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Description</span>
              <input
                className="input"
                name="item_description"
                value={item.description}
                onChange={(e) => update(i, 'description', e.target.value)}
                placeholder="Front brake pads (genuine)"
              />
            </label>

            <label className="field">
              <span>Type</span>
              <select
                className="select"
                name="item_kind"
                value={item.kind}
                onChange={(e) => update(i, 'kind', e.target.value)}
              >
                <option value="labour">Labour</option>
                <option value="part">Part</option>
              </select>
            </label>

            <label className="field">
              <span>Qty</span>
              <input
                className="input"
                name="item_quantity"
                type="number"
                min="1"
                step="1"
                value={item.quantity}
                onChange={(e) => update(i, 'quantity', e.target.value)}
              />
            </label>

            <label className="field">
              <span>Unit price (LKR)</span>
              <input
                className="input"
                name="item_price"
                type="number"
                min="0"
                step="0.01"
                value={item.price}
                onChange={(e) => update(i, 'price', e.target.value)}
              />
            </label>

            <button
              type="button"
              className="btn btn--ghost small"
              style={{ marginBottom: '1rem' }}
              onClick={() => setItems((rows) => rows.filter((_, x) => x !== i))}
              disabled={items.length === 1}
              aria-label={`Remove line ${i + 1}`}
            >
              <Icon name="close" size={14} />
            </button>
          </div>
        ))}

        <button
          type="button"
          className="btn btn--ghost small"
          onClick={() => setItems((rows) => [...rows, { ...BLANK }])}
        >
          <Icon name="plus" size={14} /> Add another line
        </button>

        <label className="field" style={{ marginTop: '1.5rem' }}>
          <span>Note on the bill (optional)</span>
          <input className="input" name="notes" placeholder="Discs still within spec — no need to replace." />
        </label>
      </div>

      <aside className="card rise rise-1">
        <h3>Total</h3>

        <label className="field">
          <span>Promo code</span>
          <input
            className="input"
            name="promo_code"
            placeholder="AVURUDU"
            style={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}
            autoComplete="off"
          />
        </label>
        <p className="small muted">
          Any discount is applied when the bill is raised, and shows as its own line.
        </p>

        <dl className="summary" style={{ marginTop: '1rem' }}>
          <div>
            <dt>Subtotal</dt>
            <dd style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem' }}>
              {formatLKR(subtotal * 100)}
            </dd>
          </div>
        </dl>

        <Submit />
        <p className="small muted" style={{ marginTop: '1rem', marginBottom: 0 }}>
          You&apos;ll take payment on the next screen — card machine, cash or transfer.
        </p>
      </aside>
    </form>
  );
}

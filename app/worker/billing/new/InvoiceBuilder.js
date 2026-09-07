'use client';

import { useState, useMemo } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import Icon from '@/components/Icon';
import { createInvoice } from '../actions';
import { formatLKR } from '@/lib/business';

/**
 * A blank line is a custom line. Picking from the catalogue fills it in;
 * typing straight over it is just as valid, because half of what a
 * workshop charges for was never on a price list.
 */
const BLANK = { description: '', kind: 'labour', quantity: 1, price: '', warranty: '' };

/** What the warranty box pre-fills to. The mechanic can change it. */
const DEFAULT_WARRANTY = { part: 6, labour: 0 };

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn--lg" disabled={pending}>
      {pending ? 'Raising…' : 'Raise bill'}
    </button>
  );
}

export default function InvoiceBuilder({ services, bookings, preselectedBooking, mechanics = [] }) {
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

  /**
   * Switching between part and labour re-suggests the warranty, but only
   * while the mechanic hasn't set one themselves — once they've typed a
   * number, changing the type must not quietly overwrite it.
   */
  function updateKind(index, kind) {
    setItems((rows) =>
      rows.map((row, i) => {
        if (i !== index) return row;
        const untouched = String(row.warranty) === String(DEFAULT_WARRANTY[row.kind]);
        return {
          ...row,
          kind,
          warranty: row.warranty === '' || untouched ? DEFAULT_WARRANTY[kind] : row.warranty,
        };
      })
    );
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
            <label className="field">
              <span>Email (optional)</span>
              <input className="input" name="customer_email" type="email" placeholder="For the service history" />
            </label>
          </div>
        )}

        <div className="grid" style={{ gridTemplateColumns: 'minmax(160px, 1fr) minmax(200px, 2fr)' }}>
          <label className="field">
            <span>Registration</span>
            <input
              className="input"
              name="registration"
              defaultValue={booking?.vehicles?.registration ?? ''}
              placeholder="CAB-1234"
              style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}
              autoComplete="off"
            />
          </label>
          <label className="field">
            <span>Vehicle</span>
            <input
              className="input"
              name="vehicle_note"
              defaultValue={
                booking?.vehicles
                  ? `${booking.vehicles.make} ${booking.vehicles.model}`
                  : ''
              }
              placeholder="Toyota Aqua"
            />
          </label>
        </div>
        <p className="small muted" style={{ marginTop: '-0.5rem' }}>
          The plate is how this job is found again — it&apos;s what warranties and
          service history are looked up by.
        </p>

        {/*
          Typed, not picked from a list of accounts. Plenty of people who
          work on a car here will never have a login, and the register is
          worth less if half the jobs say "not recorded" because of it.
          A name matching a staff account is linked to it automatically.
        */}
        <label className="field">
          <span>Who did the work?</span>
          <input
            className="input"
            name="performed_by_name"
            list="dn-mechanics"
            placeholder="Name of the mechanic"
            autoComplete="off"
          />
          <datalist id="dn-mechanics">
            {mechanics.map((m) => (
              <option key={m.id} value={m.full_name} />
            ))}
          </datalist>
        </label>

        <h3 style={{ marginTop: '1.5rem' }}>What are we charging for?</h3>
        <p className="small muted" style={{ marginTop: '-0.5rem' }}>
          Pick from the catalogue to fill a line quickly, or just type — anything
          can be charged for, whether or not it&apos;s on the price list.
        </p>

        {items.map((item, i) => (
          <div key={i} className="billline">
            <label className="field">
              <span>Quick add</span>
              <select className="select" value="" onChange={(e) => applyService(i, e.target.value)}>
                <option value="">Custom line — type it below</option>
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
                onChange={(e) => updateKind(i, e.target.value)}
              >
                <option value="labour">Labour</option>
                <option value="part">Part</option>
              </select>
            </label>

            <label className="field">
              <span>Warranty (months)</span>
              <input
                className="input"
                name="item_warranty_months"
                type="number"
                min="0"
                step="1"
                value={item.warranty}
                onChange={(e) => update(i, 'warranty', e.target.value)}
                placeholder={String(DEFAULT_WARRANTY[item.kind])}
                title="0 means no cover on this line. Parts default to 6 months."
              />
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

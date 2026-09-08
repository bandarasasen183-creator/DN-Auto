'use client';

import { useState, useMemo } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import Icon from '@/components/Icon';
import { createInvoice } from '../actions';
import { formatLKR } from '@/lib/business';
import FaceScanner from '@/components/FaceScanner';

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

export default function InvoiceBuilder({
  services,
  bookings,
  preselectedBooking,
  mechanics = [],
  tickets = [],
  preselectedTicket = '',
}) {
  const [items, setItems] = useState([{ ...BLANK }]);
  const [bookingId, setBookingId] = useState(preselectedBooking || '');
  const [ticketId, setTicketId] = useState(preselectedTicket || '');
  const [showFaceScanner, setShowFaceScanner] = useState(false);
  const [assignedName, setAssignedName] = useState('');
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
  const ticket = tickets.find((t) => t.id === ticketId);

  // Details already typed when the car arrived. Retyping them at the
  // counter is how a bill ends up under a slightly different name to the
  // ticket, and then neither can be found.
  const known = ticket ?? booking;

  return (
    <form action={action} className="grid" style={{ gridTemplateColumns: 'minmax(0, 2fr) minmax(300px, 1fr)', alignItems: 'start' }}>
      <div className="card rise">
        {state?.error && <p className="form-error">{state.error}</p>}

        <h3>Who is this for?</h3>

        {tickets.length > 0 && (
          <label className="field">
            <span>A car in the workshop</span>
            <select
              className="select"
              name="ticket_id"
              value={ticketId}
              onChange={(e) => {
                setTicketId(e.target.value);
                if (e.target.value) setBookingId('');
              }}
            >
              <option value="">Not from a ticket</option>
              {tickets.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.registration} — {t.customer_name || 'walk-in'} ({t.complaint.slice(0, 40)}
                  {t.complaint.length > 40 ? '…' : ''})
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="field">
          <span>Against a booking (today only)</span>
          <select
            className="select"
            name="booking_id"
            value={bookingId}
            onChange={(e) => {
              setBookingId(e.target.value);
              if (e.target.value) setTicketId('');
            }}
            disabled={Boolean(ticketId)}
          >
            <option value="">
              {bookings.length === 0 ? 'No bookings today' : 'Walk-in — no booking'}
            </option>
            {bookings.map((b) => (
              <option key={b.id} value={b.id}>
                {new Date(b.scheduled_for).toLocaleTimeString('en-LK', { timeStyle: 'short' })} —{' '}
                {b.profiles?.full_name}
                {b.vehicles ? ` (${b.vehicles.registration})` : ''}
              </option>
            ))}
          </select>
        </label>

        {!known && (
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
            <label className="field">
              <span>Customer name</span>
              <input className="input" name="customer_name" placeholder="Walk-in customer" />
            </label>
            <label className="field">
              <span>Phone</span>
              <input className="input" name="customer_phone" type="tel" placeholder="+94 7X XXX XXXX" required />
            </label>
          </div>
        )}

        {!known && (
          <div className="stack" style={{ '--gap': '0.5rem', marginTop: '1rem', marginBottom: '1.5rem' }}>
            <label className="checkbox">
              <input type="checkbox" name="service_updates_opt_in" defaultChecked value="yes" />
              <span>Send me warranty and service reminders about my vehicle</span>
            </label>
            <label className="checkbox">
              <input type="checkbox" name="marketing_opt_in" value="yes" />
              <span>Send me occasional offers from DN Auto</span>
            </label>
          </div>
        )}

        {ticket && (
          <p className="form-note">
            From ticket <strong>{ticket.number}</strong> — {ticket.complaint}
            {ticket.assigned_name ? ` · worked on by ${ticket.assigned_name}` : ''}
          </p>
        )}

        <div className="grid" style={{ gridTemplateColumns: 'minmax(160px, 1fr) minmax(200px, 2fr)' }}>
          <label className="field">
            <span>Registration</span>
            <input
              className="input"
              name="registration"
              key={`reg-${ticketId}-${bookingId}`}
              defaultValue={ticket?.registration ?? booking?.vehicles?.registration ?? ''}
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
              key={`veh-${ticketId}-${bookingId}`}
              defaultValue={
                ticket
                  ? [ticket.make, ticket.model].filter(Boolean).join(' ')
                  : booking?.vehicles
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
          <div className="grid" style={{ gridTemplateColumns: '1fr auto', gap: '0.5rem' }}>
            <input
              className="input"
              name="performed_by_name"
              list="dn-mechanics"
              key={`by-${ticketId}`}
              value={assignedName || ticket?.assigned_name || ''}
              onChange={(e) => setAssignedName(e.target.value)}
              placeholder="Name of the mechanic"
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
          <datalist id="dn-mechanics">
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

        <h3 style={{ marginTop: '1.5rem' }}>What are we charging for?</h3>
        <p className="small muted" style={{ marginTop: '-0.5rem' }}>
          Pick from the catalogue to fill a line quickly, or just type — anything
          can be charged for, whether or not it&apos;s on the price list.
        </p>

        {items.map((item, i) => (
          <div key={i} className="stack" style={{ '--gap': '0.75rem', padding: '1rem', backgroundColor: 'var(--surface-sunken)', borderRadius: '12px', marginBottom: '1rem' }}>
            <div className="grid" style={{ gridTemplateColumns: '1fr auto', alignItems: 'end', gap: '1rem' }}>
              <label className="field" style={{ margin: 0 }}>
                <span>Quick add from catalogue</span>
                <select className="select" value="" onChange={(e) => applyService(i, e.target.value)}>
                  <option value="">Custom line — type it below</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="btn btn--ghost small"
                style={{ color: 'var(--red-600)' }}
                onClick={() => setItems((rows) => rows.filter((_, x) => x !== i))}
                disabled={items.length === 1}
                aria-label={`Remove line ${i + 1}`}
              >
                <Icon name="close" size={14} /> Remove
              </button>
            </div>

            <label className="field" style={{ margin: 0 }}>
              <span>Description</span>
              <input
                className="input"
                name="item_description"
                value={item.description}
                onChange={(e) => update(i, 'description', e.target.value)}
                placeholder="Front brake pads (genuine)"
              />
            </label>

            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.75rem' }}>
              <label className="field" style={{ margin: 0 }}>
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

              <label className="field" style={{ margin: 0 }}>
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

              <label className="field" style={{ margin: 0 }}>
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

              <label className="field" style={{ margin: 0 }}>
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
            </div>
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

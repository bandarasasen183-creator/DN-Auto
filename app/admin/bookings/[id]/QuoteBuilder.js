'use client';

import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { createQuote } from '../../actions';
import { formatLKR } from '@/lib/business';
import Icon from '@/components/Icon';

const BLANK = { description: '', kind: 'labour', price: '' };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn" disabled={pending}>
      {pending ? 'Sending…' : 'Send quote to customer'}
    </button>
  );
}

export default function QuoteBuilder({ bookingId }) {
  const [items, setItems] = useState([{ ...BLANK }]);
  const [state, action] = useFormState(createQuote, {});

  const total = items.reduce((sum, i) => sum + (Number(i.price) || 0), 0);

  function update(index, key, value) {
    setItems((rows) => rows.map((row, i) => (i === index ? { ...row, [key]: value } : row)));
  }

  return (
    <section className="card rise">
      <h3>Build a quote</h3>
      <p className="small muted">
        Parts automatically carry the workshop&apos;s 6-month warranty. The customer approves
        or declines before any work starts.
      </p>

      {state?.error && <p className="form-error">{state.error}</p>}
      {state?.success && <p className="form-note">Quote sent — the booking is now awaiting approval.</p>}

      <form action={action}>
        <input type="hidden" name="booking_id" value={bookingId} />

        {items.map((item, i) => (
          <div key={i} className="grid" style={{ gridTemplateColumns: '2fr 1fr 1fr auto', gap: '0.5rem', alignItems: 'end' }}>
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
              <span>Price (LKR)</span>
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
          + Add another line
        </button>

        <label className="field" style={{ marginTop: '1rem' }}>
          <span>Note for the customer</span>
          <input className="input" name="notes" placeholder="Discs are still within spec — no need to replace." />
        </label>

        <div className="row" style={{ justifyContent: 'space-between', marginTop: '1rem' }}>
          <strong style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem' }}>
            Total {formatLKR(total * 100)}
          </strong>
          <SubmitButton />
        </div>
      </form>
    </section>
  );
}

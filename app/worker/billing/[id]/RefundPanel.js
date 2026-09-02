'use client';

import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import Icon from '@/components/Icon';
import { refundPayment } from '../actions';

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn small" style={{ background: 'var(--bad)', color: '#fff' }} disabled={pending}>
      {pending ? 'Refunding…' : 'Refund'}
    </button>
  );
}

/** A refund is its own record — the original payment is never edited. */
export default function RefundPanel({ payment }) {
  const [open, setOpen] = useState(false);
  const [state, action] = useFormState(refundPayment, {});

  if (state?.success) {
    return <span className="small" style={{ color: 'var(--ok)' }}>{state.notice}</span>;
  }

  if (!open) {
    return (
      <button type="button" className="btn btn--ghost small" onClick={() => setOpen(true)}>
        <Icon name="download" size={13} /> Refund
      </button>
    );
  }

  return (
    <form action={action} className="refundform">
      {state?.error && <p className="form-error small">{state.error}</p>}
      <input type="hidden" name="payment_id" value={payment.id} />

      <input
        className="input small"
        name="amount_lkr"
        type="number"
        min="0"
        step="0.01"
        defaultValue={(payment.amount_cents / 100).toFixed(2)}
        aria-label="Refund amount"
        required
      />
      <input className="input small" name="reason" placeholder="Why?" aria-label="Reason" required />

      <div className="row">
        <Submit />
        <button type="button" className="btn btn--ghost small" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </form>
  );
}

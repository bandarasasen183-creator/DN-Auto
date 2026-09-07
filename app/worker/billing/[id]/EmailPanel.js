'use client';

import { useFormState, useFormStatus } from 'react-dom';
import Icon from '@/components/Icon';
import { emailServiceHistory } from '../actions';

function Send() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn--ghost small" disabled={pending}>
      <Icon name="mail" size={14} />
      {pending ? 'Sending…' : 'Email it'}
    </button>
  );
}

/**
 * Emails the customer everything on record for this vehicle, not just
 * today's bill — which is what somebody actually wants when they ask for
 * "the paperwork": what has been done to the car, and what is still
 * under warranty.
 */
export default function EmailPanel({ invoice }) {
  const [state, action] = useFormState(emailServiceHistory, {});

  if (!invoice.registration) {
    return (
      <section className="card">
        <h3>Service history</h3>
        <p className="small muted" style={{ marginBottom: 0 }}>
          This bill has no registration on it, so there is nothing to look the
          history up by. Add the plate when raising the bill and it can be
          emailed from here.
        </p>
      </section>
    );
  }

  return (
    <section className="card">
      <h3>Service history</h3>
      <p className="small muted">
        Everything recorded against <strong>{invoice.registration}</strong>, with any
        warranties still in date.
      </p>

      <form action={action}>
        <input type="hidden" name="invoice_id" value={invoice.id} />
        <input type="hidden" name="registration" value={invoice.registration} />
        <input type="hidden" name="customer_name" value={invoice.customer_name ?? ''} />

        {state?.error && <p className="form-error">{state.error}</p>}
        {state?.success && <p className="form-note">{state.notice}</p>}

        <label className="field">
          <span>Send to</span>
          <input
            className="input"
            name="email"
            type="email"
            defaultValue={invoice.customer_email ?? ''}
            placeholder="customer@example.com"
            required
          />
        </label>

        <Send />
      </form>
    </section>
  );
}

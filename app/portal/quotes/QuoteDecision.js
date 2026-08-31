'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { respondToQuote } from '../actions';

function Buttons() {
  const { pending } = useFormStatus();
  return (
    <div className="row" style={{ marginTop: '1rem' }}>
      <button type="submit" name="decision" value="approved" className="btn" disabled={pending}>
        {pending ? 'Sending…' : 'Approve — go ahead'}
      </button>
      <button type="submit" name="decision" value="rejected" className="btn btn--ghost" disabled={pending}>
        Decline
      </button>
    </div>
  );
}

export default function QuoteDecision({ quoteId }) {
  const [state, action] = useFormState(respondToQuote, {});

  if (state?.success) {
    return (
      <p className={state.decision === 'approved' ? 'form-note' : 'form-error'} style={{ marginTop: '1rem' }}>
        {state.decision === 'approved'
          ? 'Approved — we’ll get started and keep you posted.'
          : 'Declined. We’ll call you to talk through the options.'}
      </p>
    );
  }

  return (
    <form action={action}>
      {state?.error && <p className="form-error">{state.error}</p>}
      <input type="hidden" name="quote_id" value={quoteId} />
      <Buttons />
    </form>
  );
}

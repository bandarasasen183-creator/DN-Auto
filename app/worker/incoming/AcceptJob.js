'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { acceptJob } from '../actions';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn" disabled={pending}>
      {pending ? 'Accepting…' : 'Accept this job'}
    </button>
  );
}

export default function AcceptJob({ bookingId }) {
  const [state, action] = useFormState(acceptJob, {});

  if (state?.success) {
    return <p className="form-note" style={{ marginTop: '1rem', marginBottom: 0 }}>Accepted — it&apos;s in your jobs now.</p>;
  }

  return (
    <form action={action} style={{ marginTop: '1rem' }}>
      {state?.error && <p className="form-error">{state.error}</p>}
      <input type="hidden" name="booking_id" value={bookingId} />
      <SubmitButton />
    </form>
  );
}

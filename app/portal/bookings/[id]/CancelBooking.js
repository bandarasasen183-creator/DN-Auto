'use client';

import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { cancelBooking } from '../../actions';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn" style={{ background: 'var(--bad)', color: '#fff', width: '100%' }} disabled={pending}>
      {pending ? 'Cancelling…' : 'Cancel this booking'}
    </button>
  );
}

export default function CancelBooking({ bookingId }) {
  const [open, setOpen] = useState(false);
  const [state, action] = useFormState(cancelBooking, {});

  if (state?.success) {
    return <p className="form-note">Your booking has been cancelled.</p>;
  }

  return (
    <section className="card">
      <h3>Need to cancel?</h3>
      {!open ? (
        <>
          <p className="small muted">
            You can cancel free of charge until we start work on your vehicle.
          </p>
          <button type="button" className="btn btn--ghost" style={{ width: '100%' }} onClick={() => setOpen(true)}>
            Cancel booking
          </button>
        </>
      ) : (
        <form action={action}>
          {state?.error && <p className="form-error">{state.error}</p>}
          <input type="hidden" name="booking_id" value={bookingId} />
          <label className="field">
            <span>Reason (optional)</span>
            <input className="input" name="reason" placeholder="Change of plan" />
          </label>
          <SubmitButton />
          <button type="button" className="btn btn--ghost small" style={{ width: '100%', marginTop: '0.5rem' }} onClick={() => setOpen(false)}>
            Keep my booking
          </button>
        </form>
      )}
    </section>
  );
}

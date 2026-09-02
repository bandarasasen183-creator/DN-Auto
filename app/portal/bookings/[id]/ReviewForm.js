'use client';

import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import Icon from '@/components/Icon';
import { submitReview } from '../../actions';

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn" disabled={pending}>
      {pending ? 'Sending…' : 'Send feedback'}
    </button>
  );
}

/** Shown on a completed booking the customer hasn't reviewed yet. */
export default function ReviewForm({ bookingId }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [state, action] = useFormState(submitReview, {});

  if (state?.success) {
    return (
      <section className="card">
        <p className="form-note" style={{ marginBottom: 0 }}>
          Thank you — that means a lot. The workshop reads every one.
        </p>
      </section>
    );
  }

  return (
    <section className="card">
      <h3>How did we do?</h3>
      <p className="small muted">
        Your feedback goes to the workshop. It only appears on the public site if you rate us
        well and the owner chooses to publish it.
      </p>

      {state?.error && <p className="form-error">{state.error}</p>}

      <form action={action}>
        <input type="hidden" name="booking_id" value={bookingId} />
        <input type="hidden" name="rating" value={rating} />

        <div className="ratepick" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              className="ratepick__star"
              data-filled={n <= (hover || rating)}
              onMouseEnter={() => setHover(n)}
              onClick={() => setRating(n)}
              aria-label={`${n} star${n === 1 ? '' : 's'}`}
              aria-pressed={rating === n}
            >
              <Icon name="star" size={26} />
            </button>
          ))}
        </div>

        <label className="field">
          <span>Anything you want to tell us? (optional)</span>
          <textarea className="textarea" name="body" placeholder="Sorted the brake noise first time and explained what was worn." />
        </label>

        <Submit />
      </form>
    </section>
  );
}

'use client';

import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { updateJobStatus } from '../../actions';

const OPTIONS = [
  { value: 'in_progress', label: 'Start work', hint: 'The customer sees "in progress".' },
  { value: 'awaiting_parts', label: 'Waiting on parts', hint: 'Use this when the job is paused for a part.' },
  { value: 'awaiting_approval', label: 'Needs customer approval', hint: 'Send when a quote is waiting on them.' },
  { value: 'completed', label: 'Mark complete', hint: 'Only once the vehicle is ready to collect.' },
];

function SubmitButton({ label }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn" disabled={pending}>
      {pending ? 'Saving…' : label}
    </button>
  );
}

export default function UpdateStatus({ bookingId, currentStatus }) {
  const [choice, setChoice] = useState('');
  const [state, action] = useFormState(updateJobStatus, {});

  const selected = OPTIONS.find((o) => o.value === choice);

  return (
    <section className="card rise">
      <h3>Update this job</h3>
      <p className="small muted">
        Whatever you write here goes straight to the customer&apos;s repair log — keep it plain
        and honest.
      </p>

      {state?.error && <p className="form-error">{state.error}</p>}
      {state?.success && <p className="form-note">Updated. The customer can see it now.</p>}

      <form action={action}>
        <input type="hidden" name="booking_id" value={bookingId} />

        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', marginBottom: '1rem' }}>
          {OPTIONS.filter((o) => o.value !== currentStatus).map((o) => (
            <button
              key={o.value}
              type="button"
              className="pick"
              data-selected={choice === o.value}
              onClick={() => setChoice(o.value)}
            >
              <strong>{o.label}</strong>
              <span className="small muted">{o.hint}</span>
            </button>
          ))}
        </div>

        <input type="hidden" name="status" value={choice} />

        <label className="field">
          <span>Note for the customer (optional)</span>
          <input
            className="input"
            name="note"
            placeholder="Front pads replaced, discs are still within spec."
          />
        </label>

        <SubmitButton label={selected ? selected.label : 'Choose an update'} />
      </form>
    </section>
  );
}

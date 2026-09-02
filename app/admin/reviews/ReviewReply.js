'use client';

import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { replyToReview } from '../actions';

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn small" disabled={pending}>
      {pending ? 'Saving…' : 'Save reply'}
    </button>
  );
}

export default function ReviewReply({ reviewId, reply }) {
  const [open, setOpen] = useState(false);
  const [state, action] = useFormState(replyToReview, {});

  if (!open) {
    return (
      <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
        {reply ? (
          <p className="small" style={{ margin: 0, color: 'var(--steel-400)' }}>
            <strong>Your reply:</strong> {reply}
          </p>
        ) : (
          <span className="small muted">No reply yet.</span>
        )}
        <button type="button" className="btn btn--ghost small" onClick={() => setOpen(true)}>
          {reply ? 'Edit reply' : 'Reply'}
        </button>
      </div>
    );
  }

  return (
    <form action={action} style={{ marginTop: '0.75rem' }}>
      {state?.error && <p className="form-error">{state.error}</p>}
      <input type="hidden" name="review_id" value={reviewId} />
      <label className="field">
        <span>Your reply (shown publicly under the review)</span>
        <textarea className="textarea" name="reply" defaultValue={reply ?? ''} />
      </label>
      <div className="row">
        <Submit />
        <button type="button" className="btn btn--ghost small" onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </form>
  );
}

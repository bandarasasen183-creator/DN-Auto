'use client';

import { useRef } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import Icon from '@/components/Icon';
import { replyToThread, updateThread } from '../actions';

function Send() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn" disabled={pending}>
      <Icon name="send" size={15} />
      {pending ? 'Sending…' : 'Send reply'}
    </button>
  );
}

export function ThreadActions({ thread }) {
  const [, action] = useFormState(updateThread, {});

  return (
    <form action={action} className="row" style={{ gap: '0.5rem', flexWrap: 'wrap' }}>
      <input type="hidden" name="thread_id" value={thread.id} />
      {thread.status === 'closed' ? (
        <button type="submit" name="status" value="open" className="btn btn--ghost small">
          <Icon name="inbox" size={14} /> Reopen
        </button>
      ) : (
        <button type="submit" name="status" value="closed" className="btn btn--ghost small">
          <Icon name="check" size={14} /> Mark done
        </button>
      )}
      {thread.status !== 'spam' && (
        <button type="submit" name="status" value="spam" className="btn btn--ghost small">
          <Icon name="alert" size={14} /> Spam
        </button>
      )}
    </form>
  );
}

export default function ReplyBox({ thread }) {
  const [state, action] = useFormState(replyToThread, {});
  const formRef = useRef(null);

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        await action(formData);
        formRef.current?.reset();
      }}
      className="card rise replybox"
    >
      <input type="hidden" name="thread_id" value={thread.id} />

      <h3 style={{ marginTop: 0 }}>Reply to {thread.from_name || thread.from_email}</h3>

      {state?.error && <p className="form-error">{state.error}</p>}
      {state?.success && <p className="form-note">Sent.</p>}

      <label className="field">
        <span className="sr-only">Your reply</span>
        <textarea
          className="input"
          name="body"
          rows={7}
          placeholder={
            'Thanks for getting in touch.\n\nThe battery we fitted is covered until ' +
            'March next year — bring the car in any Sunday and we will check it.'
          }
          required
        />
      </label>

      <p className="small muted">
        Sent from the workshop address, with the shop&apos;s name, address and phone
        number added underneath. It arrives under their original message rather
        than as a new email.
      </p>

      <Send />
    </form>
  );
}

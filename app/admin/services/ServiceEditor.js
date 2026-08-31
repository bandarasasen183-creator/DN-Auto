'use client';

import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { saveService } from '../actions';
import { formatLKR } from '@/lib/business';

function SubmitButton({ isNew }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn" disabled={pending}>
      {pending ? 'Saving…' : isNew ? 'Add service' : 'Save'}
    </button>
  );
}

/** Renders one service as a collapsed row that expands into an edit form. */
export default function ServiceEditor({ service }) {
  const isNew = !service;
  const [open, setOpen] = useState(isNew ? false : false);
  const [state, action] = useFormState(saveService, {});

  if (!open) {
    return (
      <button
        type="button"
        className="card card--hover row"
        style={{ justifyContent: 'space-between', textAlign: 'left', width: '100%', border: isNew ? '1px dashed var(--steel-300)' : undefined, cursor: 'pointer' }}
        onClick={() => setOpen(true)}
      >
        {isNew ? (
          <strong className="muted">+ Add a new service</strong>
        ) : (
          <>
            <div>
              <strong>{service.name}</strong>
              {!service.is_active && <span className="pill" style={{ marginLeft: '0.5rem' }}>Hidden</span>}
              <p className="small muted" style={{ margin: 0 }}>
                {service.category} · {service.duration_minutes} min
              </p>
            </div>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem' }}>
              {service.price_is_from ? 'From ' : ''}{formatLKR(service.base_price_cents)}
            </span>
          </>
        )}
      </button>
    );
  }

  return (
    <form action={action} className="card">
      {state?.error && <p className="form-error">{state.error}</p>}
      {state?.success && <p className="form-note">Saved.</p>}

      {service && <input type="hidden" name="id" value={service.id} />}

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        <label className="field">
          <span>Name</span>
          <input className="input" name="name" defaultValue={service?.name ?? ''} required />
        </label>
        <label className="field">
          <span>Category</span>
          <input className="input" name="category" defaultValue={service?.category ?? ''} />
        </label>
        <label className="field">
          <span>Price (LKR)</span>
          <input
            className="input"
            name="price_lkr"
            type="number"
            min="0"
            step="0.01"
            defaultValue={service ? service.base_price_cents / 100 : ''}
          />
        </label>
        <label className="field">
          <span>Duration (minutes)</span>
          <input className="input" name="duration_minutes" type="number" defaultValue={service?.duration_minutes ?? 60} />
        </label>
      </div>

      <label className="field">
        <span>Description</span>
        <textarea className="textarea" name="description" defaultValue={service?.description ?? ''} />
      </label>

      <div className="row" style={{ marginBottom: '1rem', flexWrap: 'wrap' }}>
        <label className="row small">
          <input type="checkbox" name="is_active" defaultChecked={service?.is_active ?? true} />
          Visible to customers
        </label>
        <label className="row small">
          <input type="checkbox" name="price_is_from" defaultChecked={service?.price_is_from ?? true} />
          Show as a &ldquo;from&rdquo; price
        </label>
      </div>

      <div className="row">
        <SubmitButton isNew={isNew} />
        <button type="button" className="btn btn--ghost" onClick={() => setOpen(false)}>
          Close
        </button>
      </div>
    </form>
  );
}

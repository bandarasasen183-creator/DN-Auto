'use client';

import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import Icon from '@/components/Icon';
import { savePromotion } from '../actions';

function Submit({ isNew }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn" disabled={pending}>
      {pending ? 'Saving…' : isNew ? 'Create promotion' : 'Save changes'}
    </button>
  );
}

export default function PromotionEditor({ promotion }) {
  const isNew = !promotion;
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState(promotion?.kind ?? 'percent');
  const [trigger, setTrigger] = useState(promotion?.trigger ?? 'code');
  const [state, action] = useFormState(savePromotion, {});

  if (!open) {
    return isNew ? (
      <button
        type="button"
        className="card card--hover center muted"
        style={{ border: '1px dashed var(--steel-300)', cursor: 'pointer' }}
        onClick={() => setOpen(true)}
      >
        <Icon name="plus" size={18} /> Add a promotion
      </button>
    ) : (
      <button
        type="button"
        className="btn btn--ghost small"
        style={{ marginTop: '1rem' }}
        onClick={() => setOpen(true)}
      >
        <Icon name="edit" size={14} /> Edit
      </button>
    );
  }

  // A percentage is entered whole; a fixed amount is entered in rupees.
  const valueDefault = promotion
    ? promotion.kind === 'percent'
      ? promotion.value
      : promotion.value / 100
    : '';

  return (
    <form action={action} className={isNew ? 'card' : ''} style={{ marginTop: isNew ? 0 : '1rem' }}>
      {state?.error && <p className="form-error">{state.error}</p>}
      {state?.success && <p className="form-note">Saved.</p>}

      {promotion && <input type="hidden" name="id" value={promotion.id} />}

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))' }}>
        <label className="field">
          <span>Name</span>
          <input className="input" name="name" defaultValue={promotion?.name ?? ''} required
                 placeholder="Avurudu service offer" />
        </label>

        <label className="field">
          <span>When it applies</span>
          <select className="select" name="trigger" value={trigger} onChange={(e) => setTrigger(e.target.value)}>
            <option value="code">Customer types a code</option>
            <option value="first_booking">Automatically, on a first booking</option>
            <option value="referral">Referral from another customer</option>
            <option value="always">Every booking, while it runs</option>
          </select>
        </label>

        {(trigger === 'code' || trigger === 'referral') && (
          <label className="field">
            <span>Code</span>
            <input
              className="input"
              name="code"
              defaultValue={promotion?.code ?? ''}
              placeholder="AVURUDU"
              style={{ textTransform: 'uppercase' }}
            />
          </label>
        )}

        <label className="field">
          <span>Discount type</span>
          <select className="select" name="kind" value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="percent">Percentage off</option>
            <option value="fixed">Fixed amount off</option>
          </select>
        </label>

        <label className="field">
          <span>{kind === 'percent' ? 'Percent off' : 'Amount off (LKR)'}</span>
          <input
            className="input"
            name="value"
            type="number"
            min="1"
            step={kind === 'percent' ? '1' : '0.01'}
            max={kind === 'percent' ? '100' : undefined}
            defaultValue={valueDefault}
            required
          />
        </label>

        {kind === 'percent' && (
          <label className="field">
            <span>Cap the discount at (LKR, optional)</span>
            <input
              className="input"
              name="max_discount_lkr"
              type="number"
              min="0"
              step="0.01"
              defaultValue={promotion?.max_discount_cents ? promotion.max_discount_cents / 100 : ''}
              placeholder="5000"
            />
          </label>
        )}

        <label className="field">
          <span>Minimum spend (LKR, optional)</span>
          <input
            className="input"
            name="min_spend_lkr"
            type="number"
            min="0"
            step="0.01"
            defaultValue={promotion?.min_spend_cents ? promotion.min_spend_cents / 100 : ''}
          />
        </label>

        <label className="field">
          <span>Starts</span>
          <input className="input" type="date" name="starts_on" defaultValue={promotion?.starts_on ?? ''} />
        </label>

        <label className="field">
          <span>Ends</span>
          <input className="input" type="date" name="ends_on" defaultValue={promotion?.ends_on ?? ''} />
        </label>

        <label className="field">
          <span>Total uses allowed (blank = unlimited)</span>
          <input className="input" type="number" min="1" name="usage_limit" defaultValue={promotion?.usage_limit ?? ''} />
        </label>

        <label className="field">
          <span>Uses per customer</span>
          <input className="input" type="number" min="1" name="per_customer_limit"
                 defaultValue={promotion?.per_customer_limit ?? 1} />
        </label>
      </div>

      <label className="field">
        <span>Description shown to customers</span>
        <textarea className="textarea" name="description" defaultValue={promotion?.description ?? ''} />
      </label>

      <label className="row small" style={{ marginBottom: '1rem' }}>
        <input type="checkbox" name="is_active" defaultChecked={promotion?.is_active ?? true} />
        Live
      </label>

      <div className="row">
        <Submit isNew={isNew} />
        <button type="button" className="btn btn--ghost" onClick={() => setOpen(false)}>Close</button>
      </div>
    </form>
  );
}

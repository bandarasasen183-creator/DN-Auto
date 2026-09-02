'use client';

import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { createTeamPromotion } from '../actions';

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn" style={{ width: '100%' }} disabled={pending}>
      {pending ? 'Creating…' : 'Create code'}
    </button>
  );
}

export default function TeamCodeForm({ isAdmin }) {
  const [kind, setKind] = useState('percent');
  const [state, action] = useFormState(createTeamPromotion, {});

  return (
    <form action={action} className="card rise rise-1">
      <h3>New code</h3>
      {state?.error && <p className="form-error">{state.error}</p>}
      {state?.success && <p className="form-note">Created — it works immediately.</p>}

      <label className="field">
        <span>Code the customer types</span>
        <input
          className="input"
          name="code"
          required
          placeholder="AVURUDU"
          style={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}
          autoComplete="off"
        />
      </label>

      <label className="field">
        <span>Name (for your records)</span>
        <input className="input" name="name" required placeholder="Avurudu service offer" />
      </label>

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <label className="field">
          <span>Type</span>
          <select className="select" name="kind" value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="percent">Percent off</option>
            <option value="fixed">Rupees off</option>
          </select>
        </label>
        <label className="field">
          <span>{kind === 'percent' ? 'Percent' : 'Amount (LKR)'}</span>
          <input className="input" name="value" type="number" min="1" step={kind === 'percent' ? '1' : '0.01'} required />
        </label>
      </div>

      {kind === 'percent' && !isAdmin && (
        <p className="small muted">
          Codes made at the counter cap at 25%. An admin can go higher from Admin →
          Promotions.
        </p>
      )}

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <label className="field">
          <span>Ends (optional)</span>
          <input className="input" type="date" name="ends_on" />
        </label>
        <label className="field">
          <span>Total uses</span>
          <input className="input" type="number" min="1" name="usage_limit" placeholder="Unlimited" />
        </label>
      </div>

      <Submit />
    </form>
  );
}

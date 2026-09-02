'use client';

import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import Icon from '@/components/Icon';
import KeepAwake from '@/components/KeepAwake';
import { settleTerminalRequest } from '../../../actions';
import { formatLKR, BUSINESS } from '@/lib/business';

function Confirm({ outcome, label, tone }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      name="outcome"
      value={outcome}
      className={`btn btn--lg ${tone === 'ghost' ? 'btn--ghost btn--onDark' : ''}`}
      disabled={pending}
    >
      {pending ? 'Saving…' : label}
    </button>
  );
}

export default function TerminalScreen({ request, mode, returnPath }) {
  const [state, action] = useFormState(settleTerminalRequest, {});
  const [showDecline, setShowDecline] = useState(false);

  return (
    <main className="terminal">
      <KeepAwake />
      <div className="terminal__card">
        <p className="terminal__brand">{BUSINESS.name}</p>

        <p className="terminal__label">Amount to pay</p>
        <p className="terminal__amount">{formatLKR(request.amountCents, { withDecimals: true })}</p>

        <p className="terminal__ref">
          {request.number}
          {request.customer ? ` · ${request.customer}` : ''}
          {request.vehicle ? ` · ${request.vehicle}` : ''}
        </p>

        {mode === 'push' ? (
          <div className="terminal__wait">
            <span className="terminal__pulse" aria-hidden />
            <p>Sent to {request.terminalCode ?? 'the card machine'}. Ask the customer to tap.</p>
          </div>
        ) : (
          <div className="terminal__manual">
            <Icon name="alert" size={20} />
            <p>
              Key <strong>{formatLKR(request.amountCents, { withDecimals: true })}</strong> into the
              card machine{request.terminalCode ? ` at ${request.terminalCode}` : ''}, then confirm
              below.
            </p>
          </div>
        )}

        {state?.error && <p className="form-error">{state.error}</p>}

        <form action={action} className="terminal__actions">
          <input type="hidden" name="request_id" value={request.id} />

          <label className="field">
            <span>Approval / slip number</span>
            <input
              className="input"
              name="provider_reference"
              placeholder="From the machine's slip"
              autoComplete="off"
            />
          </label>

          {showDecline && (
            <label className="field">
              <span>What happened?</span>
              <input className="input" name="reason" placeholder="Card declined" />
            </label>
          )}

          <div className="terminal__buttons">
            <Confirm outcome="paid" label="Payment went through" />
            <button
              type="button"
              className="btn btn--ghost btn--lg btn--onDark"
              onClick={() => setShowDecline(true)}
            >
              It failed
            </button>
            {showDecline && <Confirm outcome="declined" label="Record as declined" tone="ghost" />}
          </div>
        </form>

        <a className="terminal__back" href={returnPath}>
          <Icon name="chevronLeft" size={14} /> Back to the bill
        </a>
      </div>
    </main>
  );
}

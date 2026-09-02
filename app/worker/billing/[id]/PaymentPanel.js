'use client';

import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import Icon from '@/components/Icon';
import { requestCardPayment, recordCounterPayment } from '../actions';
import { formatLKR } from '@/lib/business';

function Submit({ idle, busy, big }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={`btn ${big ? 'btn--lg' : ''}`} disabled={pending} style={{ width: '100%' }}>
      {pending ? busy : idle}
    </button>
  );
}

/** Card machine first — it's what the tablet is for. Cash is the fallback. */
export default function PaymentPanel({ invoiceId, outstandingCents }) {
  const [mode, setMode] = useState('card');
  const [cardState, cardAction] = useFormState(requestCardPayment, {});
  const [cashState, cashAction] = useFormState(recordCounterPayment, {});

  return (
    <section className="card paypanel">
      <p className="small muted" style={{ margin: 0 }}>Amount due</p>
      <p className="paypanel__amount">{formatLKR(outstandingCents)}</p>

      <div className="tabs" style={{ marginBottom: '1rem' }}>
        <button type="button" className="tab" data-active={mode === 'card'} onClick={() => setMode('card')}>
          Card machine
        </button>
        <button type="button" className="tab" data-active={mode === 'cash'} onClick={() => setMode('cash')}>
          Cash / transfer
        </button>
      </div>

      {mode === 'card' ? (
        <form action={cardAction}>
          {cardState?.error && <p className="form-error">{cardState.error}</p>}
          <input type="hidden" name="invoice_id" value={invoiceId} />

          <label className="field">
            <span>Terminal / tablet</span>
            <input className="input" name="terminal_code" placeholder="Bay 1" autoComplete="off" />
          </label>
          <p className="small muted">
            Naming the tablet lets takings be split by bay at the end of the day.
          </p>

          <Submit idle="Pay now on the machine" busy="Sending…" big />
        </form>
      ) : (
        <form action={cashAction}>
          {cashState?.error && <p className="form-error">{cashState.error}</p>}
          {cashState?.success && <p className="form-note">Recorded.</p>}
          <input type="hidden" name="invoice_id" value={invoiceId} />

          <label className="field">
            <span>Amount taken (LKR)</span>
            <input
              className="input"
              name="amount_lkr"
              type="number"
              min="0"
              step="0.01"
              defaultValue={(outstandingCents / 100).toFixed(2)}
              required
            />
          </label>

          <label className="field">
            <span>Method</span>
            <select className="select" name="provider" defaultValue="cash">
              <option value="cash">Cash</option>
              <option value="bank_transfer">Bank transfer</option>
              <option value="payable_pos">Payable POS terminal</option>
            </select>
          </label>

          <label className="field">
            <span>Reference (optional)</span>
            <input className="input" name="provider_reference" />
          </label>

          <Submit idle="Record payment" busy="Recording…" />
        </form>
      )}

      <p className="small muted" style={{ marginTop: '1rem', marginBottom: 0 }}>
        <Icon name="info" size={14} /> Part payments are fine — the balance stays on the bill.
      </p>
    </section>
  );
}

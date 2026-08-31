'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { recordPayment } from '../actions';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn" style={{ width: '100%' }} disabled={pending}>
      {pending ? 'Recording…' : 'Record payment'}
    </button>
  );
}

export default function RecordPayment({ bookings }) {
  const [state, action] = useFormState(recordPayment, {});

  return (
    <form action={action} className="card rise rise-2">
      <h3>Record a payment</h3>
      <p className="small muted">
        Use this for cash and for POS slips. Gateway payments will land here automatically
        once the merchant accounts are live.
      </p>

      {state?.error && <p className="form-error">{state.error}</p>}
      {state?.success && <p className="form-note">Recorded.</p>}

      <label className="field">
        <span>Booking</span>
        <select className="select" name="booking_id" required defaultValue="">
          <option value="" disabled>Choose a booking</option>
          {bookings.map((b) => (
            <option key={b.id} value={b.id}>
              {b.reference} — {b.profiles?.full_name}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span>Amount (LKR)</span>
        <input className="input" name="amount_lkr" type="number" min="0" step="0.01" required />
      </label>

      <label className="field">
        <span>Paid by</span>
        <select className="select" name="provider" defaultValue="cash">
          <option value="cash">Cash</option>
          <option value="payable_pos">Payable POS terminal</option>
          <option value="webxpay">WEBXPAY</option>
          <option value="koko">Koko</option>
          <option value="bank_transfer">Bank transfer</option>
        </select>
      </label>

      <label className="field">
        <span>Reference (slip / transaction no.)</span>
        <input className="input" name="provider_reference" />
      </label>

      <SubmitButton />
    </form>
  );
}

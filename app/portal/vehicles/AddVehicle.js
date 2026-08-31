'use client';

import { useRef } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { addVehicle } from '../actions';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn" style={{ width: '100%' }} disabled={pending}>
      {pending ? 'Saving…' : 'Add vehicle'}
    </button>
  );
}

export default function AddVehicle() {
  const formRef = useRef(null);
  const [state, action] = useFormState(async (prev, data) => {
    const res = await addVehicle(prev, data);
    if (res?.success) formRef.current?.reset();
    return res;
  }, {});

  return (
    <form ref={formRef} action={action} className="card rise rise-1">
      <h3>Add a vehicle</h3>
      {state?.error && <p className="form-error">{state.error}</p>}
      {state?.success && <p className="form-note">Vehicle saved.</p>}

      <label className="field">
        <span>Make</span>
        <input className="input" name="make" placeholder="Toyota" required />
      </label>
      <label className="field">
        <span>Model</span>
        <input className="input" name="model" placeholder="Aqua" required />
      </label>
      <label className="field">
        <span>Year</span>
        <input className="input" name="year" type="number" placeholder="2016" />
      </label>
      <label className="field">
        <span>Registration</span>
        <input className="input" name="registration" placeholder="CAB-1234" required />
      </label>

      <SubmitButton />
      <p className="small muted" style={{ marginBottom: 0 }}>
        Petrol and hybrid-petrol only.
      </p>
    </form>
  );
}

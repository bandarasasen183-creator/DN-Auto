'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { signUp } from '../actions';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn" disabled={pending} style={{ width: '100%' }}>
      {pending ? 'Creating account…' : 'Create account'}
    </button>
  );
}

export default function SignupForm() {
  const [state, action] = useFormState(signUp, {});

  return (
    <form action={action} className="card" style={{ marginTop: '1.5rem' }}>
      {state?.error && (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      )}
      {state?.notice && (
        <p className="form-note" role="status">
          {state.notice}
        </p>
      )}

      <label className="field">
        <span>Full name</span>
        <input className="input" name="full_name" autoComplete="name" required />
      </label>

      <label className="field">
        <span>Email</span>
        <input className="input" type="email" name="email" autoComplete="email" required />
      </label>

      <label className="field">
        <span>Phone</span>
        <input
          className="input"
          type="tel"
          name="phone"
          autoComplete="tel"
          placeholder="07X XXX XXXX"
        />
      </label>

      <label className="field">
        <span>Password</span>
        <input
          className="input"
          type="password"
          name="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </label>

      <SubmitButton />

      <p className="small muted" style={{ marginBottom: 0, marginTop: '1rem' }}>
        Mechanic or admin? Your account is created for you by the workshop — sign in
        with the details you were given.
      </p>
    </form>
  );
}

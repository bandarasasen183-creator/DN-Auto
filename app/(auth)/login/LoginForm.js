'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { signIn } from '../actions';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn" disabled={pending} style={{ width: '100%' }}>
      {pending ? 'Signing in…' : 'Sign in'}
    </button>
  );
}

export default function LoginForm({ next, initialError }) {
  const [state, action] = useFormState(signIn, { error: initialError ?? null });

  return (
    <form action={action} className="card" style={{ marginTop: '1.5rem' }}>
      {state?.error && (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      )}

      <input type="hidden" name="next" value={next} />

      <label className="field">
        <span>Email</span>
        <input
          className="input"
          type="email"
          name="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
        />
      </label>

      <label className="field">
        <span>Password</span>
        <input
          className="input"
          type="password"
          name="password"
          autoComplete="current-password"
          required
          placeholder="••••••••"
        />
      </label>

      <SubmitButton />
    </form>
  );
}

'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { updateProfile, changePassword } from '@/app/portal/actions';

function Submit({ idle, busy }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn" disabled={pending}>
      {pending ? busy : idle}
    </button>
  );
}

/** Shared by all three portals — a profile is a profile whatever the role. */
export function ProfileForm({ profile }) {
  const [state, action] = useFormState(updateProfile, {});

  return (
    <form action={action} className="card">
      <h3>Your details</h3>
      {state?.error && <p className="form-error">{state.error}</p>}
      {state?.success && <p className="form-note">Saved.</p>}

      <label className="field">
        <span>Full name</span>
        <input className="input" name="full_name" defaultValue={profile.full_name} required />
      </label>
      <label className="field">
        <span>Phone</span>
        <input className="input" name="phone" type="tel" defaultValue={profile.phone ?? ''} placeholder="07X XXX XXXX" />
      </label>
      <label className="field">
        <span>Email</span>
        <input className="input" value={profile.email ?? ''} disabled />
      </label>
      <p className="small muted">
        Email is your sign-in and can&apos;t be changed here — ask the workshop if it needs
        moving.
      </p>

      <Submit idle="Save changes" busy="Saving…" />
    </form>
  );
}

export function PasswordForm() {
  const [state, action] = useFormState(changePassword, {});

  return (
    <form action={action} className="card">
      <h3>Change password</h3>
      {state?.error && <p className="form-error">{state.error}</p>}
      {state?.notice && <p className="form-note">{state.notice}</p>}

      <label className="field">
        <span>New password</span>
        <input className="input" type="password" name="password" minLength={8} required autoComplete="new-password" />
      </label>
      <label className="field">
        <span>Confirm password</span>
        <input className="input" type="password" name="confirm" minLength={8} required autoComplete="new-password" />
      </label>

      <Submit idle="Change password" busy="Changing…" />
    </form>
  );
}

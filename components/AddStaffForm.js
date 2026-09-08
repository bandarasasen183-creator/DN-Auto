'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { addStaffWithoutAccount } from '@/app/admin/actions';

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button className="btn" type="submit" disabled={pending}>
      {pending ? 'Adding...' : 'Add on'}
    </button>
  );
}

export default function AddStaffForm() {
  const [state, action] = useFormState(addStaffWithoutAccount, {});

  return (
    <form action={action} className="card rise" style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
      <div style={{ flex: 1 }}>
        <h3 style={{ marginTop: 0, marginBottom: '0.5rem' }}>Add mechanic (No login)</h3>
        <p className="small muted" style={{ margin: 0, marginBottom: '1rem' }}>
          Instantly add someone so they appear in the Face Scanner and ticket lists. They won&apos;t have an email or password.
        </p>
        {state?.error && <div className="form-error" style={{ marginBottom: '1rem' }}>{state.error}</div>}
        {state?.success && <div className="form-note" style={{ marginBottom: '1rem', color: 'var(--green-600)' }}>Worker added!</div>}
        <label className="field" style={{ margin: 0 }}>
          <span>Full Name</span>
          <input className="input" name="full_name" placeholder="John Doe" required />
        </label>
      </div>
      <Submit />
    </form>
  );
}

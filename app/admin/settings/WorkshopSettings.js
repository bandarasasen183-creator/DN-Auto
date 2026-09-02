'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { saveWorkshopSettings } from '../actions';

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn" disabled={pending}>
      {pending ? 'Saving…' : 'Save workshop settings'}
    </button>
  );
}

export default function WorkshopSettings({ settings }) {
  const [state, action] = useFormState(saveWorkshopSettings, {});

  return (
    <form action={action} className="card">
      <h3>Workshop details</h3>
      <p className="small muted">
        These appear on the public contact page. Leave a field blank and the site simply
        doesn&apos;t show it — better than a wrong number.
      </p>

      {state?.error && <p className="form-error">{state.error}</p>}
      {state?.success && <p className="form-note">Saved. The site updates immediately.</p>}

      <label className="field">
        <span>Phone</span>
        <input className="input" name="phone" defaultValue={settings.phone ?? ''} placeholder="+94 11 234 5678" />
      </label>
      <label className="field">
        <span>WhatsApp</span>
        <input className="input" name="whatsapp" defaultValue={settings.whatsapp ?? ''} placeholder="+94 77 123 4567" />
      </label>
      <label className="field">
        <span>Email</span>
        <input className="input" type="email" name="email" defaultValue={settings.email ?? ''} />
      </label>

      <label className="field">
        <span>Announcement banner</span>
        <input
          className="input"
          name="announcement"
          defaultValue={settings.announcement ?? ''}
          placeholder="Closed 13–15 April for Avurudu"
        />
      </label>
      <p className="small muted">
        Shown across the top of every public page while it has text in it. Clear the box to
        take it down.
      </p>

      <label className="row small" style={{ marginBottom: '1rem' }}>
        <input type="checkbox" name="accepting_bookings" defaultChecked={settings.accepting_bookings ?? true} />
        Accepting online bookings
      </label>

      <Submit />
    </form>
  );
}

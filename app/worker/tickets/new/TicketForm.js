'use client';

import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import Icon from '@/components/Icon';
import { openTicket, lookupCarsByPhone } from '../actions';
import { enqueue, newId } from '@/lib/offline/queue';

function Submit({ label }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn--lg" disabled={pending}>
      {pending ? 'Opening…' : label}
    </button>
  );
}

export default function TicketForm({ bays, mechanics, bookings, preselectedBooking }) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [knownCars, setKnownCars] = useState([]);
  
  // Final form state
  const [state, action] = useFormState(openTicket, {});
  const [queued, setQueued] = useState(null);

  const handleNext = async (e) => {
    e.preventDefault();
    if (!phone) return;
    const cars = await lookupCarsByPhone(phone);
    setKnownCars(cars);
    setStep(2);
  };

  async function submit(formData) {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      const registration = String(formData.get('registration') ?? '').trim().toUpperCase();
      const complaint = String(formData.get('complaint') ?? '').trim();
      if (!registration || !complaint) {
        setQueued({ error: 'A plate and what is wrong — both are needed.' });
        return;
      }

      const row = await enqueue({
        id: newId(),
        kind: 'ticket.open',
        payload: {
          registration,
          complaint,
          customer_name: formData.get('customer_name') || null,
          customer_phone: formData.get('customer_phone') || null,
          marketing_opt_in: formData.get('marketing_opt_in') || null,
          service_updates_opt_in: formData.get('service_updates_opt_in') || null,
          notes: formData.get('notes') || null,
          opened_at: new Date().toISOString(),
        },
      });

      setQueued({ registration, id: row.id });
      return;
    }

    await action(formData);
  }

  if (queued?.registration) {
    return (
      <div className="card rise center" style={{ maxWidth: '32rem', margin: '0 auto' }}>
        <div className="tick"><Icon name="check" size={28} /></div>
        <h3>Ticket saved on this tablet</h3>
        <p className="muted">
          {queued.registration} is booked in. There&apos;s no connection right now,
          so it will appear on the board — for everyone — as soon as the Wi-Fi
          is back.
        </p>
        <button type="button" className="btn" onClick={() => setQueued(null)}>
          Book another car in
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto' }}>
      <div className="card rise">
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--surface-sunken)', paddingBottom: '1rem' }}>
          <div style={{ background: 'var(--brand)', color: 'white', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
            {step}
          </div>
          <h2 style={{ margin: '0 0 0 1rem' }}>{step === 1 ? 'Customer details' : 'Vehicle & Complaint'}</h2>
        </div>

        {step === 1 ? (
          <form onSubmit={handleNext} className="stack" style={{ '--gap': '1.5rem' }}>
            <div className="grid" style={{ gridTemplateColumns: '1fr' }}>
              <label className="field">
                <span>Customer Name (optional)</span>
                <input 
                  className="input" 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  placeholder="Walk-in customer" 
                  autoFocus
                />
              </label>
              <label className="field">
                <span>Phone (required)</span>
                <input 
                  className="input" 
                  type="tel" 
                  value={phone} 
                  onChange={e => setPhone(e.target.value)} 
                  placeholder="+94 7X XXX XXXX" 
                  required 
                />
              </label>
            </div>
            
            <button type="submit" className="btn btn--lg" style={{ width: '100%' }}>Next <Icon name="arrowRight" size={16} /></button>
          </form>
        ) : (
          <form action={submit} className="stack" style={{ '--gap': '1.5rem' }}>
            {state?.error && <p className="form-error">{state.error}</p>}
            {queued?.error && <p className="form-error">{queued.error}</p>}

            {/* Hidden fields carried over from Step 1 */}
            <input type="hidden" name="customer_name" value={name} />
            <input type="hidden" name="customer_phone" value={phone} />

            <div className="stack" style={{ '--gap': '0.5rem' }}>
              <label className="checkbox">
                <input type="checkbox" name="service_updates_opt_in" defaultChecked value="yes" />
                <span>Send me warranty and service reminders about my vehicle</span>
              </label>
              <label className="checkbox">
                <input type="checkbox" name="marketing_opt_in" value="yes" />
                <span>Send me occasional offers from DN Auto</span>
              </label>
            </div>

            <hr style={{ border: 'none', borderBottom: '1px solid var(--surface-sunken)', margin: '0' }} />

            <label className="field">
              <span>Vehicle Registration</span>
              {knownCars.length > 0 ? (
                <div style={{ position: 'relative' }}>
                  <input 
                    className="input" 
                    name="registration" 
                    placeholder="CAB-1234" 
                    style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }} 
                    list="known-cars"
                    autoComplete="off"
                    required 
                  />
                  <datalist id="known-cars">
                    {knownCars.map(c => (
                      <option key={c.registration} value={c.registration}>
                        {c.make} {c.model}
                      </option>
                    ))}
                  </datalist>
                  <p className="small muted" style={{ marginTop: '0.5rem' }}>
                    We found cars linked to this phone number. Select one or type a new plate.
                  </p>
                </div>
              ) : (
                <input 
                  className="input" 
                  name="registration" 
                  placeholder="CAB-1234" 
                  style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }} 
                  autoComplete="off"
                  required 
                />
              )}
            </label>

            <label className="field">
              <span>What&apos;s wrong?</span>
              <textarea
                className="input"
                name="complaint"
                rows={3}
                placeholder="Makes a grinding noise going round left corners. Started last week."
                required
              />
            </label>

            <label className="field">
              <span>Internal Notes (optional)</span>
              <textarea
                className="input"
                name="notes"
                rows={2}
              />
            </label>

            <div className="row" style={{ marginTop: '1rem' }}>
              <button type="button" className="btn btn--ghost" onClick={() => setStep(1)}>Back</button>
              <div style={{ flex: 1 }}></div>
              <Submit label="Open the ticket" />
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

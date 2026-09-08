'use client';

import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import Icon from '@/components/Icon';
import { openTicket, lookupCarsByPhone } from '../actions';
import { enqueue, newId } from '@/lib/offline/queue';

function Submit({ label }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn--lg" disabled={pending} style={{ width: '100%' }}>
      {pending ? 'Opening…' : label} <Icon name="arrowRight" size={16} />
    </button>
  );
}

export default function TicketForm({ bays, mechanics, bookings, preselectedBooking }) {
  const [state, submit] = useFormState(openTicket, {});
  const [queued, setQueued] = useState(null);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [knownCars, setKnownCars] = useState([]);
  const [selectedCar, setSelectedCar] = useState('');
  const [customPlate, setCustomPlate] = useState('');
  const [serviceOptIn, setServiceOptIn] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);

  const handlePhoneChange = async (e) => {
    const p = e.target.value;
    setPhone(p);
    if (p.length >= 9) {
      const cars = await lookupCarsByPhone(p);
      setKnownCars(cars || []);
    } else {
      setKnownCars([]);
    }
  };

  async function handleAction(formData) {
    if (!navigator.onLine) {
      const registration = String(formData.get('registration') ?? '').trim();
      const id = newId();
      await enqueue('ticket_created', {
        id,
        customer_name: formData.get('customer_name') || null,
        customer_phone: formData.get('customer_phone') || null,
        registration,
        complaint: formData.get('complaint') || null,
        marketing_opt_in: formData.get('marketing_opt_in') || null,
        service_updates_opt_in: formData.get('service_updates_opt_in') || null,
        notes: formData.get('notes') || null,
        opened_at: new Date().toISOString(),
      });

      setQueued({ registration, id });
      return;
    }

    await submit(formData);
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
        <button type="button" className="btn" onClick={() => {
          setQueued(null);
          setPhone('');
          setName('');
          setSelectedCar('');
          setCustomPlate('');
          setKnownCars([]);
        }}>
          Book another car in
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <form action={handleAction} className="stack" style={{ '--gap': '1.5rem' }}>
        {state?.error && <p className="form-error">{state.error}</p>}
        {queued?.error && <p className="form-error">{queued.error}</p>}

        {/* Hidden fields needed for form submission */}
        <input type="hidden" name="registration" value={selectedCar || customPlate} />
        {serviceOptIn && <input type="hidden" name="service_updates_opt_in" value="yes" />}
        {marketingOptIn && <input type="hidden" name="marketing_opt_in" value="yes" />}

        <div className="card rise">
          <h3 style={{ marginTop: 0, marginBottom: '1.25rem' }}>Customer Details</h3>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <label className="field" style={{ margin: 0 }}>
              <span>Phone (required)</span>
              <input 
                className="input" 
                type="tel" 
                name="customer_phone"
                value={phone} 
                onChange={handlePhoneChange} 
                placeholder="+94 7X XXX XXXX" 
                required 
                autoFocus
              />
            </label>
            <label className="field" style={{ margin: 0 }}>
              <span>Name (optional)</span>
              <input 
                className="input" 
                name="customer_name"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Walk-in customer" 
              />
            </label>
          </div>
        </div>

        <div className="card rise">
          <h3 style={{ marginTop: 0, marginBottom: '1.25rem' }}>Vehicle Details</h3>
          <div className="field" style={{ margin: 0 }}>
            {knownCars.length > 0 ? (
              <div className="stack" style={{ '--gap': '0.75rem' }}>
                <span className="small muted">Select from known vehicles or enter a new one:</span>
                {knownCars.map(c => (
                  <button
                    type="button"
                    key={c.registration}
                    onClick={() => { setSelectedCar(c.registration); setCustomPlate(''); }}
                    style={{
                      padding: '1rem',
                      borderRadius: '12px',
                      border: selectedCar === c.registration ? '2px solid #eab308' : '1px solid var(--surface-sunken)',
                      backgroundColor: selectedCar === c.registration ? '#fefce8' : '#f4f4f5',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <strong style={{ display: 'block', fontSize: '1.2rem', marginBottom: '4px' }}>{c.registration}</strong>
                    <span className="small muted">{c.make} {c.model}</span>
                  </button>
                ))}
                
                <div style={{ marginTop: '0.5rem', borderTop: '1px solid var(--surface-sunken)', paddingTop: '1rem' }}>
                  <span className="small muted" style={{ display: 'block', marginBottom: '0.5rem' }}>Or enter a different plate:</span>
                  <input 
                    className="input" 
                    value={customPlate}
                    onChange={(e) => { setCustomPlate(e.target.value); setSelectedCar(''); }}
                    placeholder="CAB-1234" 
                    style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }} 
                    autoComplete="off"
                    required={!selectedCar}
                  />
                </div>
              </div>
            ) : (
              <input 
                className="input" 
                value={customPlate}
                onChange={(e) => setCustomPlate(e.target.value)}
                placeholder="Registration (e.g. CAB-1234)" 
                style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }} 
                autoComplete="off"
                required={!selectedCar}
              />
            )}
          </div>

          <div className="stack" style={{ '--gap': '0.5rem', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--surface-sunken)' }}>
            <label className="checkbox">
              <input type="checkbox" checked={serviceOptIn} onChange={e => setServiceOptIn(e.target.checked)} />
              <span>Send me warranty & service reminders</span>
            </label>
            <label className="checkbox">
              <input type="checkbox" checked={marketingOptIn} onChange={e => setMarketingOptIn(e.target.checked)} />
              <span>Send me occasional DN Auto offers</span>
            </label>
          </div>
        </div>

        <div className="card rise">
          <h3 style={{ marginTop: 0, marginBottom: '1.25rem' }}>Job Details</h3>
          <label className="field">
            <span>What&apos;s wrong? (Required)</span>
            <textarea
              className="input"
              name="complaint"
              rows={2}
              placeholder="Makes a grinding noise going round left corners..."
              required
            />
          </label>

          <label className="field" style={{ marginTop: '1rem' }}>
            <span>Internal Notes (optional)</span>
            <textarea
              className="input"
              name="notes"
              rows={2}
            />
          </label>
        </div>

        <Submit label="Open the ticket" />
      </form>
    </div>
  );
}

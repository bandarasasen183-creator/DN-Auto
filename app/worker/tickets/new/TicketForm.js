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
  const [selectedCar, setSelectedCar] = useState('');
  const [customPlate, setCustomPlate] = useState('');
  
  // Marketing preferences
  const [serviceOptIn, setServiceOptIn] = useState(true);
  const [marketingOptIn, setMarketingOptIn] = useState(false);

  // Final form state
  const [state, action] = useFormState(openTicket, {});
  const [queued, setQueued] = useState(null);

  const handleNext1 = async (e) => {
    e.preventDefault();
    if (!phone) return;
    const cars = await lookupCarsByPhone(phone);
    setKnownCars(cars);
    setStep(2);
  };

  const handleNext2 = (e) => {
    e.preventDefault();
    if (!selectedCar && !customPlate) return;
    setStep(3);
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
          <h2 style={{ margin: '0 0 0 1rem' }}>
            {step === 1 && 'Customer details'}
            {step === 2 && 'Vehicle'}
            {step === 3 && 'Complaint'}
          </h2>
        </div>

        {step === 1 && (
          <form onSubmit={handleNext1} className="stack" style={{ '--gap': '1.5rem' }}>
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
        )}

        {step === 2 && (
          <form onSubmit={handleNext2} className="stack" style={{ '--gap': '1.5rem' }}>
            <div className="field">
              <span>Select Vehicle</span>
              {knownCars.length > 0 ? (
                <div className="stack" style={{ '--gap': '0.75rem' }}>
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
                    />
                  </div>
                </div>
              ) : (
                <input 
                  className="input" 
                  value={customPlate}
                  onChange={(e) => setCustomPlate(e.target.value)}
                  placeholder="CAB-1234" 
                  style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }} 
                  autoComplete="off"
                  autoFocus
                  required 
                />
              )}
            </div>

            <hr style={{ border: 'none', borderBottom: '1px solid var(--surface-sunken)', margin: '0' }} />

            <div className="stack" style={{ '--gap': '0.75rem' }}>
              <label className="checkbox">
                <input type="checkbox" checked={serviceOptIn} onChange={e => setServiceOptIn(e.target.checked)} />
                <span style={{ whiteSpace: 'nowrap' }}>Send me warranty & service reminders</span>
              </label>
              <label className="checkbox">
                <input type="checkbox" checked={marketingOptIn} onChange={e => setMarketingOptIn(e.target.checked)} />
                <span style={{ whiteSpace: 'nowrap' }}>Send me occasional DN Auto offers</span>
              </label>
            </div>

            <div className="row" style={{ marginTop: '1rem' }}>
              <button type="button" className="btn btn--ghost" onClick={() => setStep(1)}>Back</button>
              <div style={{ flex: 1 }}></div>
              <button type="submit" className="btn btn--lg" disabled={!selectedCar && !customPlate}>Next <Icon name="arrowRight" size={16} /></button>
            </div>
          </form>
        )}

        {step === 3 && (
          <form action={submit} className="stack" style={{ '--gap': '1.5rem' }}>
            {state?.error && <p className="form-error">{state.error}</p>}
            {queued?.error && <p className="form-error">{queued.error}</p>}

            {/* Hidden fields carried over from Steps 1 & 2 */}
            <input type="hidden" name="customer_name" value={name} />
            <input type="hidden" name="customer_phone" value={phone} />
            <input type="hidden" name="registration" value={selectedCar || customPlate} />
            {serviceOptIn && <input type="hidden" name="service_updates_opt_in" value="yes" />}
            {marketingOptIn && <input type="hidden" name="marketing_opt_in" value="yes" />}

            <label className="field">
              <span>What&apos;s wrong?</span>
              <textarea
                className="input"
                name="complaint"
                rows={3}
                placeholder="Makes a grinding noise going round left corners. Started last week."
                autoFocus
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
              <button type="button" className="btn btn--ghost" onClick={() => setStep(2)}>Back</button>
              <div style={{ flex: 1 }}></div>
              <Submit label="Open the ticket" />
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

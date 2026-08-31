'use client';

import { useState, useMemo, useRef } from 'react';
import Link from 'next/link';
import ProgressBar from '@/components/ProgressBar';
import { createBooking } from '../actions';
import { formatLKR, validateSlot, HOURS, EXCLUSIONS } from '@/lib/business';

const STEPS = ['Service', 'Vehicle', 'Date & time', 'Details', 'Confirm'];

/** Times we can offer for a given date, from the opening hours table. */
function slotsFor(dateString) {
  if (!dateString) return [];
  const day = HOURS[new Date(`${dateString}T00:00`).getDay()];
  if (!day || day.kind === 'closed') return [];

  const [openH] = day.open.split(':').map(Number);
  const [closeH] = day.close.split(':').map(Number);
  const times = [];
  for (let h = openH; h < closeH; h += 1) {
    times.push(`${String(h).padStart(2, '0')}:00`);
    times.push(`${String(h).padStart(2, '0')}:30`);
  }
  return times;
}

export default function BookingWizard({ services, vehicles, isExistingCustomer }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    service_id: '',
    vehicle_id: '',
    make: '',
    model: '',
    year: '',
    registration: '',
    date: '',
    time: '',
    notes: '',
  });
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [pending, setPending] = useState(false);
  const headingRef = useRef(null);

  const set = (key) => (e) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const service = services.find((s) => s.id === form.service_id);
  const times = useMemo(() => slotsFor(form.date), [form.date]);

  const slotCheck = useMemo(() => {
    if (!form.date || !form.time) return null;
    return validateSlot(new Date(`${form.date}T${form.time}`), { isExistingCustomer });
  }, [form.date, form.time, isExistingCustomer]);

  /** Picking a saved vehicle fills the manual fields, so step 5 can show them. */
  function chooseVehicle(id) {
    const v = vehicles.find((x) => x.id === id);
    setForm((f) => ({
      ...f,
      vehicle_id: id,
      make: v?.make ?? '',
      model: v?.model ?? '',
      year: v?.year ? String(v.year) : '',
      registration: v?.registration ?? '',
    }));
  }

  function validateStep() {
    if (step === 0 && !form.service_id) return 'Choose the service you need.';
    if (step === 1 && (!form.make || !form.model || !form.registration))
      return 'Tell us the make, model and registration of the vehicle.';
    if (step === 2) {
      if (!form.date || !form.time) return 'Pick a date and a time.';
      if (slotCheck && !slotCheck.ok) return slotCheck.reason;
    }
    return null;
  }

  function next() {
    const problem = validateStep();
    if (problem) return setError(problem);
    setError(null);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
    headingRef.current?.focus();
  }

  function back() {
    setError(null);
    setStep((s) => Math.max(s - 1, 0));
  }

  async function submit() {
    setPending(true);
    setError(null);
    const data = new FormData();
    Object.entries(form).forEach(([k, v]) => data.set(k, v));
    const res = await createBooking(null, data);
    setPending(false);
    if (res?.error) return setError(res.error);
    setResult(res);
  }

  if (result?.success) {
    return (
      <div className="card center rise" style={{ maxWidth: 560, margin: '2rem auto' }}>
        <div className="tick" aria-hidden>✓</div>
        <h3>Booking requested</h3>
        <p className="muted">
          Your reference is <strong>{result.reference}</strong>. We&apos;ll confirm your slot
          shortly — you&apos;ll see the status change in your portal.
        </p>
        <div className="row" style={{ justifyContent: 'center' }}>
          <Link href="/portal/bookings" className="btn">View my bookings</Link>
          <Link href="/portal" className="btn btn--ghost">Back to overview</Link>
        </div>
      </div>
    );
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="wizard">
      <ProgressBar steps={STEPS} current={step} />

      <div className="card wizard__panel" key={step}>
        <h3 tabIndex={-1} ref={headingRef}>{STEPS[step]}</h3>

        {error && <p className="form-error" role="alert">{error}</p>}

        {/* ---- 1. Service ---- */}
        {step === 0 && (
          <>
            <p className="muted small">
              Guide prices only — you get a written quote before any work starts.
            </p>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))' }}>
              {services.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className="pick"
                  data-selected={form.service_id === s.id}
                  onClick={() => setForm((f) => ({ ...f, service_id: s.id }))}
                >
                  <strong>{s.name}</strong>
                  <span className="small muted">{s.description}</span>
                  <span className="pick__price">
                    {s.price_is_from ? 'From ' : ''}{formatLKR(s.base_price_cents)}
                  </span>
                </button>
              ))}
            </div>
            <p className="small muted" style={{ marginTop: '1rem' }}>
              We don&apos;t do: {EXCLUSIONS.join(' · ')}.
            </p>
          </>
        )}

        {/* ---- 2. Vehicle ---- */}
        {step === 1 && (
          <>
            {vehicles.length > 0 && (
              <>
                <p className="small muted">Pick one of your vehicles, or add a new one below.</p>
                <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: '1.5rem' }}>
                  {vehicles.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      className="pick"
                      data-selected={form.vehicle_id === v.id}
                      onClick={() => chooseVehicle(v.id)}
                    >
                      <strong>{v.make} {v.model}</strong>
                      <span className="small muted">{v.registration}</span>
                    </button>
                  ))}
                </div>
              </>
            )}

            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
              <label className="field">
                <span>Make</span>
                <input className="input" value={form.make} onChange={set('make')} placeholder="Toyota" />
              </label>
              <label className="field">
                <span>Model</span>
                <input className="input" value={form.model} onChange={set('model')} placeholder="Aqua" />
              </label>
              <label className="field">
                <span>Year</span>
                <input className="input" type="number" value={form.year} onChange={set('year')} placeholder="2016" />
              </label>
              <label className="field">
                <span>Registration</span>
                <input className="input" value={form.registration} onChange={set('registration')} placeholder="CAB-1234" />
              </label>
            </div>
            <p className="small muted">
              Petrol and hybrid-petrol vehicles only — we don&apos;t work on diesel.
            </p>
          </>
        )}

        {/* ---- 3. Date & time ---- */}
        {step === 2 && (
          <>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
              <label className="field">
                <span>Date</span>
                <input
                  className="input"
                  type="date"
                  min={today}
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value, time: '' }))}
                />
              </label>
            </div>

            {form.date && times.length === 0 && (
              <p className="form-error">We&apos;re closed that day. Sunday is our main service day.</p>
            )}

            {times.length > 0 && (
              <div className="slots">
                {times.map((t) => (
                  <button
                    key={t}
                    type="button"
                    className="slot"
                    data-selected={form.time === t}
                    onClick={() => setForm((f) => ({ ...f, time: t }))}
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}

            {slotCheck && !slotCheck.ok && (
              <p className="form-error" style={{ marginTop: '1rem' }}>{slotCheck.reason}</p>
            )}
            {slotCheck?.ok && slotCheck.isEmergency && (
              <p className="form-note" style={{ marginTop: '1rem' }}>
                Weekday evening slot — this is booked as an emergency repair.
              </p>
            )}
          </>
        )}

        {/* ---- 4. Details ---- */}
        {step === 3 && (
          <label className="field">
            <span>What&apos;s wrong? (optional)</span>
            <textarea
              className="textarea"
              value={form.notes}
              onChange={set('notes')}
              placeholder="Noise from the front left when braking, started about a week ago…"
            />
          </label>
        )}

        {/* ---- 5. Confirm ---- */}
        {step === 4 && (
          <dl className="summary">
            <div><dt>Service</dt><dd>{service?.name}</dd></div>
            <div><dt>Guide price</dt><dd>{service ? `${service.price_is_from ? 'From ' : ''}${formatLKR(service.base_price_cents)}` : '—'}</dd></div>
            <div><dt>Vehicle</dt><dd>{form.make} {form.model} {form.year && `(${form.year})`} · {form.registration}</dd></div>
            <div>
              <dt>When</dt>
              <dd>
                {new Date(`${form.date}T${form.time}`).toLocaleString('en-LK', {
                  dateStyle: 'full',
                  timeStyle: 'short',
                })}
              </dd>
            </div>
            {form.notes && <div><dt>Notes</dt><dd>{form.notes}</dd></div>}
          </dl>
        )}

        <div className="row wizard__nav">
          <button type="button" className="btn btn--ghost" onClick={back} disabled={step === 0 || pending}>
            Back
          </button>
          {step < STEPS.length - 1 ? (
            <button type="button" className="btn" onClick={next}>Continue</button>
          ) : (
            <button type="button" className="btn" onClick={submit} disabled={pending}>
              {pending ? 'Sending…' : 'Confirm booking'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

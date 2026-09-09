'use client';

import { useEffect, useRef, useState, useLayoutEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useFormState, useFormStatus } from 'react-dom';
import Icon from '@/components/Icon';
import KeepAwake from '@/components/KeepAwake';
import { formatLKR } from '@/lib/business';
import { completeHandover, releaseHandover } from '../../actions';
import { enqueue, newId } from '@/lib/offline/queue';
import AnimatedTick from '@/components/AnimatedTick';
import CustomerFeedback from '@/components/CustomerFeedback';

const METHODS = [
  { value: 'webxpay', label: 'Card', icon: 'receipt', hint: 'Taken on the machine' },
  { value: 'cash', label: 'Cash', icon: 'cash', hint: 'Into the till' },
  { value: 'bank_transfer', label: 'Transfer', icon: 'send', hint: 'Straight to the account' },
];

/**
 * Signature pad.
 *
 * Drawn with pointer events so a finger, a stylus and a mouse all behave
 * the same. The canvas is sized to its box at device pixel ratio —
 * without that, a signature on a 10" tablet comes out as a blurry smear.
 */
function SignaturePad({ onChange }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const dirty = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function resize() {
      const rect = canvas.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      canvas.width = rect.width * ratio;
      canvas.height = rect.height * ratio;
      const ctx = canvas.getContext('2d');
      ctx.scale(ratio, ratio);
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#1c1917';
    }

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  function position(event) {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function start(event) {
    event.preventDefault();
    const canvas = canvasRef.current;
    canvas.setPointerCapture(event.pointerId);
    drawing.current = true;
    const { x, y } = position(event);
    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function move(event) {
    if (!drawing.current) return;
    event.preventDefault();
    const { x, y } = position(event);
    const ctx = canvasRef.current.getContext('2d');
    ctx.lineTo(x, y);
    ctx.stroke();
    dirty.current = true;
  }

  function end() {
    if (!drawing.current) return;
    drawing.current = false;
    if (dirty.current) onChange(canvasRef.current.toDataURL('image/png'));
  }

  function clear() {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    dirty.current = false;
    onChange('');
  }

  return (
    <div className="signature">
      <canvas
        ref={canvasRef}
        className="signature__pad"
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
        onPointerCancel={end}
      />
      <div className="signature__foot">
        <span className="small muted">Sign above</span>
        <button type="button" className="btn btn--ghost small" onClick={clear}>
          <Icon name="close" size={14} /> Clear
        </button>
      </div>
    </div>
  );
}

function Finish({ disabled }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn--lg" disabled={pending || disabled}>
      {pending ? 'Saving…' : 'Next'}
      {!pending && <Icon name="arrowRight" size={16} />}
    </button>
  );
}

/**
 * The staff release button.
 *
 * Press and hold rather than tap, because the customer is holding the
 * tablet when this screen appears and a single stray tap would put them
 * back into a portal listing every other customer.
 */
function ReleaseButton() {
  const { pending } = useFormStatus();
  const [held, setHeld] = useState(0);
  const timer = useRef(null);

  useEffect(() => () => clearInterval(timer.current), []);

  function begin() {
    clearInterval(timer.current);
    timer.current = setInterval(() => setHeld((h) => Math.min(100, h + 4)), 40);
  }
  function cancel() {
    clearInterval(timer.current);
    setHeld(0);
  }

  return (
    <button
      type="submit"
      className="btn btn--ghost hold"
      disabled={pending || held < 100}
      onPointerDown={begin}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      style={{ '--held': `${held}%` }}
    >
      <span className="hold__fill" aria-hidden />
      <span className="hold__label">
        {pending ? 'Closing…' : held >= 100 ? 'Release — tap now' : 'Staff: press and hold'}
      </span>
    </button>
  );
}

export default function HandoverFlow({ invoice, outstandingCents }) {
  const router = useRouter();
  const [method, setMethod] = useState('webxpay');
  const [signature, setSignature] = useState('');
  const [online, setOnline] = useState(true);
  const [queued, setQueued] = useState(false);
  const [state, action] = useFormState(completeHandover, {});
  const [releaseState, releaseAction] = useFormState(releaseHandover, {});
  const [phase, setPhase] = useState(outstandingCents <= 0 ? 'review' : 'form');

  // This app never touches the card machine — WEBXPAY has no API — so
  // "complete" only records that a payment happened and the customer
  // signed for it. That's what makes it safe to queue offline: the risk
  // of a retry is a duplicate row in the ledger, not a duplicate charge.
  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  useEffect(() => {
    if (state?.success || queued) {
      if (phase === 'form') {
        setPhase('tick');
        const t = setTimeout(() => setPhase('review'), 2500);
        return () => clearTimeout(t);
      }
    }
  }, [state?.success, queued, phase]);

  async function submit(formData) {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      await enqueue({
        id: newId(),
        kind: 'handover.complete',
        payload: {
          invoice_id: invoice.id,
          method: String(formData.get('method') ?? 'cash'),
          amount_cents: Math.round(Number(formData.get('amount_lkr') ?? 0) * 100),
          signature: String(formData.get('signature') ?? ''),
          signed_name: String(formData.get('signed_name') ?? '').trim() || null,
          reference: String(formData.get('provider_reference') ?? '').trim() || null,
        },
      });
      setQueued(true);
      return;
    }

    await action(formData);
  }

  if (phase === 'tick') {
    return (
      <div className="handover handover--done">
        <KeepAwake />
        <AnimatedTick />
        <h1>Thank you</h1>
        <p className="muted">Your payment has been recorded.</p>
      </div>
    );
  }

  if (phase === 'review') {
    return (
      <div className="handover handover--done" style={{ minHeight: '50vh', justifyContent: 'center' }}>
        <KeepAwake />
        <CustomerFeedback onFinish={(rating, reason) => {
          // If we want to submit the review to the server, we would do it here.
          // Since walk-ins might not have bookings, we just skip the server insert 
          // to avoid constraint errors, and move to release phase.
          setPhase('release');
        }} />
      </div>
    );
  }

  if (phase === 'release') {
    return (
      <div className="handover handover--done">
        <KeepAwake />
        <div className="tick tick--xl" aria-hidden>
          <Icon name="check" size={64} />
        </div>
        <h1>All done</h1>
        <p className="muted">
          Please hand the tablet back to the team.
        </p>
        <form
          action={async (formData) => {
            if (typeof navigator !== 'undefined' && !navigator.onLine) {
              await enqueue({
                id: newId(),
                kind: 'handover.release',
                payload: { invoice_id: invoice.id },
              });
              router.push(`/worker/billing/${invoice.id}?settled=paid`);
              return;
            }
            await releaseAction(formData);
          }}
          className="handover__release"
        >
          <input type="hidden" name="invoice_id" value={invoice.id} />
          {releaseState?.error && <p className="form-error">{releaseState.error}</p>}
          <ReleaseButton />
        </form>
      </div>
    );
  }

  return (
    <form action={submit} className="handover">
      <KeepAwake />
      <input type="hidden" name="invoice_id" value={invoice.id} />
      <input type="hidden" name="signature" value={signature} />

      <div style={{ marginBottom: '0.5rem' }}>
        <Link
          href={`/worker/billing/${invoice.id}`}
          className="btn btn--ghost small"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            color: 'var(--steel-300)',
            background: 'var(--surface-sunken)',
            padding: '0.35rem 0.75rem',
            borderRadius: '6px',
            textDecoration: 'none',
            fontWeight: 600,
          }}
        >
          <Icon name="chevronLeft" size={16} />
          <span>Back to bill</span>
        </Link>
      </div>

      <header className="handover__head">
        <div>
          <p className="small muted" style={{ margin: 0 }}>{invoice.number}</p>
          <h1 style={{ margin: 0 }}>{formatLKR(outstandingCents)}</h1>
        </div>
        {invoice.registration && <span className="plate">{invoice.registration}</span>}
      </header>

      {state?.error && <p className="form-error">{state.error}</p>}

      {!online && (
        <p className="form-note">
          <strong>No connection</strong> — this will be saved on the tablet and
          sent the moment the Wi-Fi is back. Take the payment on the card
          machine or in cash exactly as usual first.
        </p>
      )}

      <fieldset className="handover__methods">
        <legend className="small muted">How was this paid?</legend>
        {METHODS.map((m) => (
          <label key={m.value} className={`choice ${method === m.value ? 'choice--on' : ''}`}>
            <input
              type="radio"
              name="method"
              value={m.value}
              checked={method === m.value}
              onChange={() => setMethod(m.value)}
            />
            <Icon name={m.icon} size={22} />
            <strong>{m.label}</strong>
            <span className="small muted">{m.hint}</span>
          </label>
        ))}
      </fieldset>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
        <label className="field">
          <span>Amount taken (LKR)</span>
          <input
            className="input"
            name="amount_lkr"
            type="number"
            min="0"
            step="0.01"
            defaultValue={(outstandingCents / 100).toFixed(2)}
          />
        </label>
        {method === 'webxpay' && (
          <label className="field">
            <span>Machine reference</span>
            <input className="input" name="provider_reference" placeholder="From the slip" autoComplete="off" />
          </label>
        )}
        <label className="field">
          <span>Customer name</span>
          <input
            className="input"
            name="signed_name"
            defaultValue={invoice.customer_name ?? ''}
            placeholder="Who is signing"
          />
        </label>
      </div>

      <SignaturePad onChange={setSignature} />

      <p className="small muted">
        Signing confirms the work listed on the bill was done and the amount above
        was paid.
      </p>

      <Finish disabled={!signature} />
    </form>
  );
}

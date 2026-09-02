'use client';

import { useState, useEffect, useTransition } from 'react';
import Icon from '@/components/Icon';
import { previewPromotion } from '../actions';
import { formatLKR } from '@/lib/business';

/**
 * Offers step of the wizard.
 *
 * On arrival it asks the server what this customer already qualifies for — a
 * first-time booking gets its discount without anyone typing anything — and
 * the panel animates in when there is something to celebrate.
 */
export default function DiscountStep({ serviceId, code, onCodeChange, onResolved }) {
  const [input, setInput] = useState(code ?? '');
  const [result, setResult] = useState(null);
  const [pending, startTransition] = useTransition();
  const [checkedAuto, setCheckedAuto] = useState(false);

  async function check(withCode) {
    const data = new FormData();
    data.set('promo_code', withCode ?? '');
    data.set('service_id', serviceId ?? '');
    const res = await previewPromotion(null, data);
    setResult(res);
    onResolved?.(res);
    return res;
  }

  // Automatic offers apply themselves — the customer shouldn't have to hunt.
  useEffect(() => {
    if (checkedAuto) return;
    setCheckedAuto(true);
    startTransition(() => { check(''); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkedAuto]);

  function apply(e) {
    e.preventDefault();
    onCodeChange(input.trim().toUpperCase());
    startTransition(() => { check(input.trim().toUpperCase()); });
  }

  function clear() {
    setInput('');
    onCodeChange('');
    startTransition(() => { check(''); });
  }

  return (
    <>
      <p className="small muted">
        Discounts are applied to your quote automatically — you never have to remind us.
      </p>

      {pending && !result && (
        <div className="skeleton skeleton--card" style={{ marginBottom: '1rem' }} />
      )}

      {result?.ok && (
        <div className="offer" key={result.label}>
          <span className="offer__burst" aria-hidden />
          <span className="offer__icon" aria-hidden><Icon name="star" size={24} /></span>
          <div>
            <strong className="offer__value">{result.value}</strong>
            <p className="offer__label">{result.label}</p>
            {result.reason && result.reason !== result.label && (
              <p className="small muted" style={{ margin: 0 }}>{result.reason}</p>
            )}
          </div>
          {result.amountCents > 0 && (
            <span className="offer__amount">
              −{formatLKR(result.amountCents)}
              <span className="small muted"> off the guide price</span>
            </span>
          )}
        </div>
      )}

      {result && !result.ok && (
        <p className={code ? 'form-error' : 'small muted'} style={{ marginTop: '0.5rem' }}>
          {result.reason}
        </p>
      )}

      <form onSubmit={apply} style={{ marginTop: '1.25rem' }}>
        <label className="field" style={{ marginBottom: '0.6rem' }}>
          <span>Have a code or a friend&apos;s referral code?</span>
          <div className="codeentry">
            <input
              className="input"
              value={input}
              onChange={(e) => setInput(e.target.value.toUpperCase())}
              placeholder="DN4KQ2E"
              aria-label="Promotion or referral code"
              autoComplete="off"
              spellCheck={false}
            />
            <button type="submit" className="btn" disabled={pending || !input.trim()}>
              {pending ? 'Checking…' : 'Apply'}
            </button>
          </div>
        </label>

        {code && (
          <button type="button" className="btn btn--ghost small" onClick={clear}>
            <Icon name="close" size={14} /> Remove code
          </button>
        )}
      </form>

      <p className="small muted" style={{ marginTop: '1.25rem' }}>
        The discount comes off the written quote once a mechanic has seen the vehicle, so the
        figure above is against the guide price.
      </p>
    </>
  );
}

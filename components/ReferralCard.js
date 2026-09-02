'use client';

import { useState } from 'react';
import Icon from '@/components/Icon';

/** The customer's referral code, with a copy button that confirms itself. */
export default function ReferralCard({ code }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // Clipboard access can be refused; the code is on screen either way.
      setCopied(false);
    }
  }

  return (
    <section className="referral">
      <span className="referral__glow" aria-hidden />
      <div>
        <p className="eyebrow" style={{ color: 'var(--amber-400)' }}>Invite a friend</p>
        <h3 style={{ color: '#fff', margin: '0 0 0.35rem' }}>Give 5%, get LKR 1,000</h3>
        <p className="small" style={{ color: 'var(--steel-300)', margin: 0, maxWidth: '46ch' }}>
          Share your code. Your friend gets 5% off their first booking, and we take
          LKR 1,000 off your next one.
        </p>
      </div>

      <div className="referral__code">
        <code>{code}</code>
        <button type="button" className="btn btn--ghost small" onClick={copy}>
          <Icon name={copied ? 'check' : 'receipt'} size={14} />
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
    </section>
  );
}

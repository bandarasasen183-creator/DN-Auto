'use client';

import { useState } from 'react';
import { formatLKR } from '@/lib/business';

export default function CommissionDisplay({ invoice, role }) {
  const [show, setShow] = useState(false);
  
  const totalCommission = invoice.invoice_items?.reduce((sum, item) => sum + (item.commission_amount_cents || 0), 0) || 0;
  
  if (totalCommission <= 0) return null;

  if (role === 'admin') {
    return (
      <div className="card" style={{ marginTop: '1.5rem', background: '#f8fafc' }}>
        <h3 style={{ marginTop: 0 }}>Staff Commission</h3>
        <div className="row" style={{ justifyContent: 'space-between', fontSize: '1.25rem' }}>
          <strong>Total</strong>
          <strong style={{ color: 'var(--ok)' }}>{formatLKR(totalCommission)}</strong>
        </div>
      </div>
    );
  }

  // Worker view
  if (!show) {
    return (
      <div style={{ marginTop: '2rem', textAlign: 'center' }}>
        <button 
          className="btn btn--ghost small" 
          onClick={() => {
            if (window.confirm("Are you sure you want to show the commission amount?")) {
              setShow(true);
            }
          }}
          style={{ opacity: 0.3 }}
        >
          Show Commission
        </button>
      </div>
    );
  }

  return (
    <div className="card rise" style={{ marginTop: '2rem', background: '#f8fafc' }}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h3 style={{ margin: 0 }}>Your Commission</h3>
        <button className="btn btn--ghost small" onClick={() => setShow(false)}>Hide</button>
      </div>
      <div className="row" style={{ justifyContent: 'space-between', fontSize: '1.25rem', marginTop: '1rem' }}>
        <strong>Total for this job</strong>
        <strong style={{ color: 'var(--ok)' }}>{formatLKR(totalCommission)}</strong>
      </div>
    </div>
  );
}

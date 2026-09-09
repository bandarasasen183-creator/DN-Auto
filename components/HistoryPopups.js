'use client';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import Icon from './Icon';
import { fetchInvoiceDetails } from '@/app/worker/popup-actions';
import { formatLKR } from '@/lib/business';
import Link from 'next/link';

export default function HistoryPopups() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  
  const popupType = searchParams.get('popup'); // 'invoice' 
  const popupId = searchParams.get('popupId');

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [closing, setClosing] = useState(false);
  
  useEffect(() => {
    async function load() {
      if (popupType === 'invoice' && popupId) {
        setClosing(false);
        setLoading(true);
        const inv = await fetchInvoiceDetails(popupId);
        setData(inv);
        setLoading(false);
      } else {
        setData(null);
      }
    }
    load();
  }, [popupType, popupId]);

  if (!popupType || !popupId || closing) return null;

  const close = () => {
    setClosing(true);
    // Remove query params
    const params = new URLSearchParams(searchParams);
    params.delete('popup');
    params.delete('popupId');
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '1rem'
      }}
      onClick={close}
    >
      <div 
        className="card rise" 
        style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0 }}>Past Job Details</h2>
          <button className="btn btn--ghost small" onClick={close} style={{ padding: '0.5rem' }}>
            <Icon name="close" size={24} />
          </button>
        </div>
        
        {loading ? (
          <p className="muted">Loading...</p>
        ) : data ? (
          <div className="stack" style={{ '--gap': '1.5rem' }}>
            <div className="grid cols-2">
              <div>
                <p className="muted small" style={{ margin: 0 }}>Job / Invoice No.</p>
                <strong>{data.number}</strong>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p className="muted small" style={{ margin: 0 }}>Date</p>
                <strong>{new Date(data.created_at).toLocaleDateString('en-LK', { dateStyle: 'medium' })}</strong>
              </div>
            </div>
            
            <div className="grid cols-2">
              <div>
                <p className="muted small" style={{ margin: 0 }}>Vehicle</p>
                <strong>{data.registration}</strong> {data.make} {data.model}
              </div>
              <div style={{ textAlign: 'right' }}>
                <p className="muted small" style={{ margin: 0 }}>Mechanic</p>
                <strong>{data.mechanic?.full_name || 'Unknown'}</strong>
              </div>
            </div>

            <div>
              <p className="muted small" style={{ margin: '0 0 0.5rem' }}>Items</p>
              <ul className="small" style={{ margin: 0, paddingLeft: '1.25rem' }}>
                {data.invoice_items?.map((item) => (
                  <li key={item.id} style={{ marginBottom: '0.5rem' }}>
                    <div className="row" style={{ justifyContent: 'space-between' }}>
                      <span>
                        {item.description}
                        {item.warranty_months > 0 && (
                          <span className="pill" style={{ marginLeft: '0.5rem', background: 'var(--amber-100)', color: 'var(--amber-800)' }}>
                            {item.warranty_months}m warranty
                          </span>
                        )}
                      </span>
                      <strong>{formatLKR((item.price_cents * item.quantity) || 0)}</strong>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="row" style={{ justifyContent: 'space-between', borderTop: '1px solid var(--steel-200)', paddingTop: '1rem', fontSize: '1.25rem' }}>
              <strong>Total</strong>
              <strong>{formatLKR(data.total_cents)}</strong>
            </div>

            <div className="row" style={{ justifyContent: 'center', marginTop: '1rem' }}>
              <Link href={`/worker/billing/${data.id}`} className="btn" onClick={close}>
                Open Full Invoice Page
              </Link>
            </div>
          </div>
        ) : (
          <p className="form-error">Could not load invoice.</p>
        )}
      </div>
    </div>
  );
}

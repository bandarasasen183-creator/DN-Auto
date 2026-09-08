import Icon from '@/components/Icon';
import { BUSINESS } from '@/lib/business';

export const metadata = { title: 'No connection' };

/**
 * Shown when the tablet asks for a page it has never loaded and there is
 * no connection to fetch it with.
 *
 * Pages that have been opened before are served from the cache instead,
 * so this is the exception rather than the offline experience.
 */
export default function OfflinePage() {
  return (
    <main className="handover-screen">
      <div className="card rise center" style={{ maxWidth: '30rem' }}>
        <div className="tick" style={{ background: 'rgb(245 165 36 / 0.14)', color: 'var(--amber-600, #92400e)' }}>
          <Icon name="alert" size={28} />
        </div>

        <h1 style={{ fontFamily: 'var(--font-display)' }}>No connection</h1>

        <p className="muted">
          This page hasn&apos;t been opened on this tablet before, so there&apos;s no
          copy saved to show you.
        </p>

        <p className="small muted">
          Pages you have already visited still work — go back and try{' '}
          <strong>In the workshop</strong>. Tickets you open or move while
          offline are saved on the tablet and sent the moment the Wi-Fi comes
          back. Taking a payment needs a connection.
        </p>

        <p className="small muted" style={{ marginBottom: 0 }}>
          If it stays down, the workshop phone is {BUSINESS.contact.phone}.
        </p>
      </div>
    </main>
  );
}

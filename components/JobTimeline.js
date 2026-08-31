import { STATUS_LABELS } from '@/lib/business';

/**
 * The customer-facing repair log. Reads straight from booking_events, which a
 * database trigger writes on every status change.
 */
export default function JobTimeline({ events, flow, current }) {
  if (!events.length) {
    return <p className="muted small">No updates yet.</p>;
  }

  const currentIndex = flow.indexOf(current);

  return (
    <>
      {currentIndex >= 0 && (
        <div className="progress__rail" style={{ marginBottom: '1.5rem' }}>
          <div
            className="progress__fill"
            style={{ width: `${((currentIndex + 1) / flow.length) * 100}%` }}
          />
        </div>
      )}

      <ol className="timeline">
        {events.map((e, i) => (
          <li key={e.id} className="timeline__item" data-latest={i === events.length - 1}>
            <div className="timeline__dot" aria-hidden />
            <div>
              <strong>{e.message ?? STATUS_LABELS[e.to_status] ?? 'Update'}</strong>
              <p className="small muted" style={{ margin: 0 }}>
                {new Date(e.created_at).toLocaleString('en-LK', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </>
  );
}

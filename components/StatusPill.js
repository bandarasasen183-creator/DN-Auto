import { STATUS_LABELS } from '@/lib/business';

/** One consistent status chip everywhere a booking status is shown. */
export function statusTone(status) {
  if (status === 'completed') return 'pill--ok';
  if (status === 'cancelled' || status === 'no_show') return 'pill--bad';
  if (status === 'awaiting_approval' || status === 'awaiting_parts') return 'pill--warn';
  return 'pill--info';
}

export default function StatusPill({ status }) {
  return <span className={`pill ${statusTone(status)}`}>{STATUS_LABELS[status] ?? status}</span>;
}

/**
 * Tickets — one car, in the workshop, now.
 *
 * A booking is a promise about the future and a bill is a record of the
 * past. The ticket is the present, and it is what the workshop is asked
 * about all day: is that car ready yet?
 */

export const TICKET_STATUS = {
  waiting: { label: 'Waiting', pill: 'pill--warn', order: 0 },
  in_progress: { label: 'In progress', pill: 'pill--info', order: 1 },
  ready: { label: 'Ready', pill: 'pill--ok', order: 2 },
  collected: { label: 'Collected', pill: '', order: 3 },
  cancelled: { label: 'Cancelled', pill: '', order: 4 },
};

/** The statuses that mean the car is physically here. */
export const OPEN_STATUSES = ['waiting', 'in_progress', 'ready'];

/** What a mechanic can move a ticket to from where it is. */
export const NEXT_STATUS = {
  waiting: ['in_progress', 'cancelled'],
  in_progress: ['ready', 'waiting'],
  ready: ['collected', 'in_progress'],
  collected: [],
  cancelled: ['waiting'],
};

/**
 * How long the car has been here, in words.
 *
 * Deliberately coarse. "About 2 hours" is what somebody says out loud;
 * "2h 14m" invites an argument about the fourteen minutes.
 */
export function elapsed(from, to = new Date()) {
  const start = new Date(from);
  const minutes = Math.max(0, Math.round((to - start) / 60000));

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours < 8) {
    return rest >= 15 && rest < 45
      ? `${hours}½ hours`
      : `${rest >= 45 ? hours + 1 : hours} hour${hours === 1 && rest < 45 ? '' : 's'}`;
  }

  const days = Math.round(hours / 24);
  if (days < 1) return `${hours} hours`;
  return days === 1 ? 'since yesterday' : `${days} days`;
}

/**
 * Exact duration between two timestamps.
 */
export function duration(from, to) {
  if (!from || !to) return null;
  const minutes = Math.max(0, Math.round((new Date(to) - new Date(from)) / 60000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest > 0 ? `${hours}h ${rest}m` : `${hours}h`;
}

/**
 * Is a promised time in trouble?
 *
 * Returns 'late', 'soon' (within half an hour) or null. Only ever
 * non-null when somebody actually made a promise — an unpromised ticket
 * is never "late", because nothing was said to the customer.
 */
export function promiseState(ticket, now = new Date()) {
  if (!ticket?.promised_ready_at) return null;
  if (['ready', 'collected', 'cancelled'].includes(ticket.status)) return null;

  const due = new Date(ticket.promised_ready_at);
  const minutes = (due - now) / 60000;
  if (minutes < 0) return 'late';
  if (minutes <= 30) return 'soon';
  return null;
}

/** Start of today, local time. Used to scope "what's on today". */
export function startOfToday(now = new Date()) {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfToday(now = new Date()) {
  const d = new Date(now);
  d.setHours(23, 59, 59, 999);
  return d;
}

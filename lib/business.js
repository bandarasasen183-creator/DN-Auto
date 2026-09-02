/**
 * Single source of truth for the workshop's real-world facts and rules.
 * Everything user-facing (booking validation, opening hours, service scope)
 * reads from here so the site can never contradict itself.
 */

export const BUSINESS = {
  name: 'DN Auto Repairs And Imports',
  shortName: 'DN Auto',
  established: 2019,
  address: {
    line1: 'Church Rd',
    city: 'Kadawatha',
    postcode: '11850',
    province: 'Western Province',
    district: 'Gampaha',
    country: 'Sri Lanka',
  },
  mapsUrl:
    'https://www.google.com/maps/place/DN+Auto+Repair+And+Imports/@7.0170803,79.960933,17z',
  currency: 'LKR',
  partsWarrantyMonths: 6,

  /**
   * Contact details.
   *
   * TODO: replace the placeholders with the workshop's real numbers before
   * this goes anywhere near a customer. They are deliberately left obvious
   * rather than invented — a wrong phone number is worse than none.
   */
  contact: {
    phone: '+94 XX XXX XXXX',        // TODO: the workshop's phone number
    whatsapp: '+94 XX XXX XXXX',     // TODO: WhatsApp, if different
    email: 'hello@dnauto.lk',        // TODO: the workshop's email address
  },
};

/** Why customers pick us — used on the home and about pages. */
export const PROMISES = [
  {
    title: 'Certified mechanics',
    body: 'The people touching your car are trained and time-served, not learning on your engine.',
  },
  {
    title: 'Real diagnostics',
    body: 'Proper OBD equipment and live data. We find the fault before replacing anything.',
  },
  {
    title: 'Genuine parts',
    body: `Genuine parts with a ${6}-month minimum warranty, recorded on your quote.`,
  },
  {
    title: 'Transparent pricing',
    body: 'A written quote before work starts. You approve it, or you do not — nothing in between.',
  },
];

/** The workshop's process, shown on the home page. */
export const PROCESS = [
  { step: 'Book', body: 'Pick a service and a slot online. Takes about a minute.' },
  { step: 'Inspect', body: 'A mechanic looks at the vehicle and diagnoses it properly.' },
  { step: 'Quote', body: 'You get an itemised quote in LKR. Nothing happens until you approve.' },
  { step: 'Repair', body: 'We do the work, and you follow the status live from your portal.' },
  { step: 'Collect', body: 'Pay, collect, and keep the full repair history on your account.' },
];

/**
 * Opening hours, indexed by JS day number (0 = Sunday).
 *  - Sunday is the main service day.
 *  - Mon–Fri is emergency work only, from 18:00, for existing customers.
 *  - Saturday is closed.
 */
export const HOURS = {
  0: { label: 'Sunday', open: '08:00', close: '17:00', kind: 'full' },
  1: { label: 'Monday', open: '18:00', close: '21:00', kind: 'emergency' },
  2: { label: 'Tuesday', open: '18:00', close: '21:00', kind: 'emergency' },
  3: { label: 'Wednesday', open: '18:00', close: '21:00', kind: 'emergency' },
  4: { label: 'Thursday', open: '18:00', close: '21:00', kind: 'emergency' },
  5: { label: 'Friday', open: '18:00', close: '21:00', kind: 'emergency' },
  6: { label: 'Saturday', open: null, close: null, kind: 'closed' },
};

/** Work we do not take on, with the wording we use when declining it. */
export const OUT_OF_SCOPE = [
  { term: 'a/c', label: 'A/C repair' },
  { term: 'air con', label: 'A/C repair' },
  { term: 'aircon', label: 'A/C repair' },
  { term: 'alignment', label: 'Wheel alignment' },
  { term: 'balanc', label: 'Wheel balancing' },
  { term: 'tyre', label: 'Tyre fitting' },
  { term: 'tire', label: 'Tyre fitting' },
  { term: 'diesel', label: 'Diesel vehicles' },
];

export const EXCLUSIONS = [
  'A/C repair',
  'Wheel alignment',
  'Wheel balancing',
  'Tyre fitting',
  'Diesel vehicles',
];

/** Returns the out-of-scope label if the text asks for work we don't do. */
export function findOutOfScope(text) {
  if (!text) return null;
  const haystack = text.toLowerCase();
  const hit = OUT_OF_SCOPE.find((rule) => haystack.includes(rule.term));
  return hit ? hit.label : null;
}

/**
 * Validates a requested slot against opening hours.
 * `isExistingCustomer` matters because weekday evenings are reserved for
 * existing customers with an emergency.
 */
export function validateSlot(date, { isExistingCustomer = false } = {}) {
  const when = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(when.getTime())) {
    return { ok: false, reason: 'That date and time could not be read.' };
  }
  if (when.getTime() < Date.now()) {
    return { ok: false, reason: 'Please choose a time in the future.' };
  }

  const day = HOURS[when.getDay()];
  if (day.kind === 'closed') {
    return { ok: false, reason: 'We are closed on Saturdays.' };
  }

  const minutes = when.getHours() * 60 + when.getMinutes();
  const toMinutes = (hhmm) => {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
  };

  if (minutes < toMinutes(day.open) || minutes >= toMinutes(day.close)) {
    return {
      ok: false,
      reason:
        day.kind === 'emergency'
          ? `${day.label} slots run from ${day.open} to ${day.close} and are for emergency repairs.`
          : `${day.label} slots run from ${day.open} to ${day.close}.`,
    };
  }

  if (day.kind === 'emergency' && !isExistingCustomer) {
    return {
      ok: false,
      reason:
        'Weekday evenings are emergency repairs for existing customers only. Please pick a Sunday slot.',
      suggestSunday: true,
    };
  }

  return { ok: true, isEmergency: day.kind === 'emergency' };
}

/** LKR cents -> "LKR 12,000.00" */
export function formatLKR(cents, { withDecimals = false } = {}) {
  const amount = (Number(cents) || 0) / 100;
  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
    minimumFractionDigits: withDecimals ? 2 : 0,
    maximumFractionDigits: withDecimals ? 2 : 0,
  }).format(amount);
}

/** Human labels for the booking_status enum. */
export const STATUS_LABELS = {
  requested: 'Requested',
  confirmed: 'Confirmed',
  assigned: 'Assigned',
  accepted: 'Accepted by mechanic',
  in_progress: 'In progress',
  awaiting_parts: 'Awaiting parts',
  awaiting_approval: 'Awaiting your approval',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No show',
};

/** The order a healthy job moves through, for progress indicators. */
export const STATUS_FLOW = [
  'requested',
  'confirmed',
  'assigned',
  'accepted',
  'in_progress',
  'completed',
];

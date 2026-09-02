/**
 * Card terminal delivery.
 *
 * The app never speaks to a card machine directly. It writes a row into
 * `terminal_requests` with everything the machine needs, and one of these
 * adapters delivers it. That keeps the workflow, the audit trail and the
 * receipt identical whichever kind of terminal the workshop ends up with.
 *
 * Two modes:
 *
 *   'push'   The terminal exposes an API. The app sends the amount and
 *            reference, the machine wakes up showing the total, the customer
 *            taps, and the terminal reports back. Nobody keys anything in.
 *
 *   'manual' The terminal is standalone, as many Sri Lankan POS terminals
 *            are. The tablet shows the amount and reference in large type,
 *            the mechanic keys it into the machine, then confirms in the app.
 *            One extra step; everything else is the same.
 *
 * WEBXPAY's terminal is 'manual' until we have their integration documents.
 * When those arrive, filling in `push` below is the only change needed —
 * no schema change, and nothing in the portals moves.
 */

export class TerminalNotConfiguredError extends Error {
  constructor(label) {
    super(`${label} has no terminal integration configured yet.`);
    this.name = 'TerminalNotConfiguredError';
  }
}

const WEBXPAY_TERMINAL_URL = process.env.WEBXPAY_TERMINAL_URL;
const WEBXPAY_TERMINAL_KEY = process.env.WEBXPAY_TERMINAL_KEY;

const webxpayTerminal = {
  label: 'WEBXPAY card terminal',
  provider: 'webxpay',

  /** 'push' the moment credentials exist; 'manual' until then. */
  get mode() {
    return WEBXPAY_TERMINAL_URL && WEBXPAY_TERMINAL_KEY ? 'push' : 'manual';
  },

  /**
   * Sends an amount to the machine.
   * In manual mode this is a no-op that succeeds — the request stays queued
   * and the tablet displays it, which is exactly the intended behaviour.
   */
  async send({ amountCents, reference, terminalCode }) {
    if (this.mode === 'manual') {
      return {
        delivered: false,
        mode: 'manual',
        instruction: 'Key this amount into the card machine, then confirm below.',
      };
    }

    // TODO(webxpay): POST the amount, currency and reference to the terminal
    // endpoint, per WEBXPAY's terminal integration documents. Verify their
    // response signature before treating a payment as taken — an unverified
    // "paid" callback is an open till.
    throw new TerminalNotConfiguredError('WEBXPAY card terminal');
  },

  /** Confirms the outcome the machine reported. */
  async verify(payload) {
    if (this.mode === 'manual') {
      throw new Error('Manual terminals are confirmed by the mechanic, not by callback.');
    }
    // TODO(webxpay): verify the signature, then return the settled amount.
    throw new TerminalNotConfiguredError('WEBXPAY card terminal');
  },
};

const TERMINALS = { webxpay: webxpayTerminal };

export function getTerminal(provider = 'webxpay') {
  const terminal = TERMINALS[provider];
  if (!terminal) throw new Error(`Unknown terminal provider: ${provider}`);
  return terminal;
}

/** For the admin screen: what the workshop's terminal can currently do. */
export function terminalStatus() {
  return Object.entries(TERMINALS).map(([key, t]) => ({
    key,
    label: t.label,
    mode: t.mode,
    note:
      t.mode === 'push'
        ? 'Amounts are sent to the machine automatically.'
        : 'The tablet shows the amount to key into the machine. Add WEBXPAY_TERMINAL_URL and WEBXPAY_TERMINAL_KEY to send it automatically.',
  }));
}

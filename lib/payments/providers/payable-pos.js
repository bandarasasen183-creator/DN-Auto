import { ProviderNotConfiguredError } from './_contract';

/**
 * Payable POS terminal — a card machine physically in the workshop.
 *
 * Unlike the redirect gateways, the customer never leaves the workshop: the
 * terminal captures the card and prints a slip. The web app's job is to
 * record the slip number against the booking, which admin can already do by
 * hand today. If Payable's terminal API is wired up later, createCharge can
 * push the amount to the terminal so the mechanic doesn't key it in.
 */

const TERMINAL_ID = process.env.PAYABLE_TERMINAL_ID;
const API_KEY = process.env.PAYABLE_API_KEY;

export const payablePos = {
  label: 'Payable POS terminal',
  kind: 'terminal',
  note:
    'Card terminal in the workshop. Slips can be recorded by hand today; ' +
    'add PAYABLE_TERMINAL_ID and PAYABLE_API_KEY to push amounts to the terminal.',

  // The terminal itself works without any of this — only the push integration
  // needs credentials.
  isConfigured: () => Boolean(TERMINAL_ID && API_KEY),

  async createCharge({ amountCents }) {
    if (!payablePos.isConfigured()) throw new ProviderNotConfiguredError('Payable POS');

    // TODO(payable): push the amount to the terminal and poll for the result.
    throw new Error('Payable terminal push is not implemented yet.');
  },

  async verifyCallback(payload) {
    if (!payablePos.isConfigured()) throw new ProviderNotConfiguredError('Payable POS');
    throw new Error('Payable callback verification is not implemented yet.');
  },

  async refund({ amountCents }) {
    // Terminal refunds are done on the terminal itself, then recorded here.
    return { reference: null, status: 'refunded', amountCents };
  },
};

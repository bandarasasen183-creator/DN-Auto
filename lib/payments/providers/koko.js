import { ProviderNotConfiguredError } from './_contract';

/**
 * Koko — Sri Lankan buy-now-pay-later, redirect flow.
 *
 * NOT LIVE, same as WEBXPAY: no merchant account yet. Koko splits the bill
 * into instalments for the customer while settling the full amount to the
 * merchant, so from this app's point of view it behaves like any other
 * redirect gateway — one charge, one callback, one settled amount.
 */

const MERCHANT_ID = process.env.KOKO_MERCHANT_ID;
const SECRET = process.env.KOKO_SECRET;

export const koko = {
  label: 'Koko',
  kind: 'redirect',
  note:
    'Pay in instalments. Waiting on the merchant account — add ' +
    'KOKO_MERCHANT_ID and KOKO_SECRET to switch it on.',

  isConfigured: () => Boolean(MERCHANT_ID && SECRET),

  async createCharge({ bookingId, amountCents, currency = 'LKR', customer }) {
    if (!koko.isConfigured()) throw new ProviderNotConfiguredError('Koko');

    // TODO(koko): create the order, sign it, return the checkout redirect URL.
    throw new Error('Koko charge creation is not implemented yet.');
  },

  async verifyCallback(payload) {
    if (!koko.isConfigured()) throw new ProviderNotConfiguredError('Koko');

    // TODO(koko): verify the callback signature before recording anything.
    throw new Error('Koko callback verification is not implemented yet.');
  },

  async refund({ providerReference, amountCents }) {
    if (!koko.isConfigured()) throw new ProviderNotConfiguredError('Koko');
    throw new Error('Koko refunds are not implemented yet.');
  },
};

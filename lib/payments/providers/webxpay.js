import { ProviderNotConfiguredError } from './_contract';

/**
 * WEBXPAY — Sri Lankan card gateway, redirect flow.
 *
 * NOT LIVE. The workshop has no merchant account yet, so every method that
 * would move money throws rather than pretending. What is real here is the
 * shape: when the credentials arrive, the three TODOs below are the only
 * places that change, and nothing outside this file needs touching.
 *
 * WEBXPAY's integration signs the payment payload with an RSA public key the
 * merchant is issued, and posts the customer to a hosted checkout page. The
 * gateway then calls back to a return URL with a signed response.
 */

const MERCHANT_ID = process.env.WEBXPAY_MERCHANT_ID;
const SECRET = process.env.WEBXPAY_SECRET;

export const webxpay = {
  label: 'WEBXPAY',
  kind: 'redirect',
  note:
    'Card payments online. Waiting on the merchant account — add ' +
    'WEBXPAY_MERCHANT_ID and WEBXPAY_SECRET to switch it on.',

  isConfigured: () => Boolean(MERCHANT_ID && SECRET),

  async createCharge({ bookingId, amountCents, currency = 'LKR', customer }) {
    if (!webxpay.isConfigured()) throw new ProviderNotConfiguredError('WEBXPAY');

    // TODO(webxpay): build and RSA-sign the payment payload, then return the
    // hosted checkout URL to redirect the customer to.
    throw new Error('WEBXPAY charge creation is not implemented yet.');
  },

  async verifyCallback(payload) {
    if (!webxpay.isConfigured()) throw new ProviderNotConfiguredError('WEBXPAY');

    // TODO(webxpay): verify the gateway's signature before trusting a single
    // field of this payload. An unverified callback is an open till.
    throw new Error('WEBXPAY callback verification is not implemented yet.');
  },

  async refund({ providerReference, amountCents }) {
    if (!webxpay.isConfigured()) throw new ProviderNotConfiguredError('WEBXPAY');
    throw new Error('WEBXPAY refunds are not implemented yet.');
  },
};

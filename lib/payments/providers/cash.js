/** Cash taken at the counter. Always available; we only record it. */
export const cash = {
  label: 'Cash',
  kind: 'offline',
  note: 'Recorded by hand when the customer pays at the workshop.',

  isConfigured: () => true,

  async createCharge({ amountCents }) {
    // Nothing to authorise — the money is already in the till by the time
    // this is called.
    return {
      reference: null,
      status: 'paid',
      amountCents,
    };
  },

  async verifyCallback() {
    throw new Error('Cash payments have no gateway callback.');
  },

  async refund({ amountCents }) {
    return { reference: null, status: 'refunded', amountCents };
  },
};

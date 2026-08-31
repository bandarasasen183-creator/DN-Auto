/** Direct bank transfer. Reconciled by hand against the statement. */
export const bankTransfer = {
  label: 'Bank transfer',
  kind: 'offline',
  note: 'Reconciled against the bank statement and recorded by admin.',

  isConfigured: () => true,

  async createCharge({ amountCents }) {
    return { reference: null, status: 'pending', amountCents };
  },

  async verifyCallback() {
    throw new Error('Bank transfers have no gateway callback.');
  },

  async refund({ amountCents }) {
    return { reference: null, status: 'refunded', amountCents };
  },
};

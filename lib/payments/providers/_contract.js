/**
 * The contract every payment provider implements.
 *
 *   label        Human name shown in the admin UI.
 *   kind         'offline'  — money changes hands in the workshop; we only record it.
 *                'redirect' — the customer is sent to the gateway and comes back.
 *                'terminal' — a card terminal in the workshop captures it.
 *   note         Why it is or isn't usable yet, shown to admin.
 *
 *   isConfigured()            -> boolean. Are the credentials present?
 *   createCharge(input)       -> { reference, redirectUrl?, status }
 *   verifyCallback(payload)   -> { reference, status, amountCents, raw }
 *   refund(input)             -> { reference, status }
 *
 * `input` always carries { bookingId, amountCents, currency, customer }.
 * Amounts are LKR cents, matching the database. Nothing here should ever see
 * or return a float.
 */

/** Thrown when a provider is used before its credentials exist. */
export class ProviderNotConfiguredError extends Error {
  constructor(label) {
    super(
      `${label} has no merchant credentials configured yet. ` +
        'Add them to the environment, then this provider becomes selectable.'
    );
    this.name = 'ProviderNotConfiguredError';
  }
}

/**
 * Payment provider registry.
 *
 * The workshop has no merchant credentials yet, so nothing here talks to a
 * real gateway. What it does do is fix the *shape* of the integration: every
 * provider is an object with the same four methods, and the rest of the app
 * only ever sees that interface. When the WEBXPAY or Koko merchant account
 * arrives, you fill in one adapter file — no schema change, no changes in the
 * portals.
 */

import { cash } from './providers/cash';
import { webxpay } from './providers/webxpay';
import { koko } from './providers/koko';
import { payablePos } from './providers/payable-pos';
import { bankTransfer } from './providers/bank-transfer';

const PROVIDERS = {
  cash,
  webxpay,
  koko,
  payable_pos: payablePos,
  bank_transfer: bankTransfer,
};

export function getProvider(key) {
  const provider = PROVIDERS[key];
  if (!provider) throw new Error(`Unknown payment provider: ${key}`);
  return provider;
}

/** Providers that are configured and can actually take money right now. */
export function availableProviders() {
  return Object.entries(PROVIDERS)
    .filter(([, p]) => p.isConfigured())
    .map(([key, p]) => ({ key, label: p.label, kind: p.kind }));
}

/** Every provider, including ones still waiting on credentials. */
export function allProviders() {
  return Object.entries(PROVIDERS).map(([key, p]) => ({
    key,
    label: p.label,
    kind: p.kind,
    configured: p.isConfigured(),
    note: p.note,
  }));
}

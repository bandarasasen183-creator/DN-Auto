/**
 * Recording a handover — shared by the live form and the offline queue.
 *
 * WEBXPAY have confirmed the card machine has no API, so this app never
 * touches money directly. "Complete" only records that a mechanic took a
 * payment on the machine or in cash, and that the customer signed to say
 * they agree with what's on the bill. That is what makes it safe to do
 * with no connection: the risk of a retried request is a duplicate row
 * in the ledger, not a duplicate charge to a customer.
 *
 * `clientId`, when given, is what makes a retry safe. It becomes the
 * payment's own id, so the same action arriving twice — a retried fetch,
 * two tabs flushing at once — writes the same row rather than two
 * payments for one handover.
 */
export async function recordHandover(supabase, { invoiceId, method, amountCents, signature, signedName, reference, clientId }) {
  if (!Number.isFinite(amountCents) || amountCents <= 0) {
    return { error: 'Enter what was paid.' };
  }
  if (!signature?.startsWith('data:image/png')) {
    return { error: 'Ask the customer to sign before finishing.' };
  }

  const { data: invoice } = await supabase
    .from('invoices')
    .select('id, total_cents, paid_cents, signed_at')
    .eq('id', invoiceId)
    .maybeSingle();

  if (!invoice) return { error: 'That bill no longer exists.' };

  // A retry of a request already recorded. Not an error — the queue is
  // meant to be safe to flush twice.
  if (clientId) {
    const { data: already } = await supabase
      .from('payments')
      .select('id')
      .eq('client_id', clientId)
      .maybeSingle();
    if (already) return { success: true, duplicate: true };
  }

  const { error: payError } = await supabase.from('payments').insert({
    invoice_id: invoice.id,
    provider: method,
    status: 'paid',
    amount_cents: Math.round(amountCents),
    provider_reference: reference,
    paid_at: new Date().toISOString(),
    ...(clientId ? { client_id: clientId } : {}),
  });

  // The unique index on client_id doing its job: two copies of the same
  // queued action landed at once and the second lost the race. Fine —
  // the first already wrote the row.
  if (payError && payError.code === '23505') return { success: true, duplicate: true };
  if (payError) return { error: payError.message };

  // The signature is written once — a later handover on the same
  // already-signed bill (should not happen, but a stale retry might try)
  // must not overwrite an existing customer signature with a blank replay.
  if (!invoice.signed_at) {
    const { error } = await supabase
      .from('invoices')
      .update({
        signature_png: signature,
        signed_name: signedName ?? null,
        signed_at: new Date().toISOString(),
      })
      .eq('id', invoice.id);

    if (error) return { error: error.message };
  }

  return { success: true };
}

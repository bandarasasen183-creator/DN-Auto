import { createClient } from '@/lib/supabase/server';
import { getSessionUser } from '@/lib/auth/session';
import { formatPlate } from '@/lib/service-history';
import { NEXT_STATUS } from '@/lib/tickets';
import { recordHandover } from '@/lib/handover';

/**
 * Replays one action a tablet took while it had no connection.
 *
 * Runs as the signed-in user, so row-level security applies exactly as it
 * would have online — being offline earns nobody extra permissions.
 *
 * Everything here must be safe to receive twice. The tablet retries on a
 * flaky connection, and two tabs can flush at once, so "did this already
 * happen?" is answered by the client-generated id rather than assumed.
 */
export const dynamic = 'force-dynamic';

const KINDS = ['ticket.open', 'ticket.move', 'ticket.update', 'handover.complete', 'handover.release'];

export async function POST(request) {
  const session = await getSessionUser();
  const profile = session?.profile;

  if (!profile || !profile.is_active || !['worker', 'admin'].includes(profile.role)) {
    // 401 keeps it in the queue — the session may just need refreshing,
    // and throwing away a mechanic's morning would be unforgivable.
    return Response.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.id || !KINDS.includes(body.kind)) {
    return Response.json({ error: 'Unrecognised action.' }, { status: 400 });
  }

  const supabase = createClient();
  const { id, kind, payload } = body;

  try {
    if (kind === 'ticket.open') {
      const registration = formatPlate(payload?.registration);
      const complaint = String(payload?.complaint ?? '').trim();
      if (!registration || !complaint) {
        return Response.json({ error: 'A ticket needs a plate and a complaint.' }, { status: 400 });
      }

      // The queue id IS the ticket id. Replaying the same action cannot
      // create a second ticket, because the primary key already exists.
      const { data: existing } = await supabase
        .from('tickets')
        .select('id')
        .eq('id', id)
        .maybeSingle();

      if (existing) return Response.json({ ok: true, duplicate: true });

      const { error } = await supabase.from('tickets').insert({
        id,
        registration,
        complaint,
        make: payload.make || null,
        model: payload.model || null,
        colour: payload.colour || null,
        customer_name: payload.customer_name || null,
        customer_phone: payload.customer_phone || null,
        keys_location: payload.keys_location || null,
        assigned_name: payload.assigned_name || null,
        notes: payload.notes || null,
        bay_id: payload.bay_id || null,
        // The time the car actually arrived, not the time the Wi-Fi came
        // back. Otherwise every ticket raised during an outage looks like
        // it turned up at once, and "how long has that been here?" lies.
        opened_at: payload.opened_at ?? new Date().toISOString(),
        opened_by: profile.id,
      });

      if (error) throw error;
      return Response.json({ ok: true });
    }

    if (kind === 'ticket.move') {
      const { data: ticket } = await supabase
        .from('tickets')
        .select('id, status')
        .eq('id', payload?.ticket_id)
        .maybeSingle();

      if (!ticket) {
        return Response.json({ error: 'That ticket no longer exists.' }, { status: 400 });
      }

      // Already where it was headed — an earlier flush got there first.
      if (ticket.status === payload.status) {
        return Response.json({ ok: true, duplicate: true });
      }

      // The move may no longer be legal: somebody at the desk moved the
      // ticket on while the tablet was offline. The desk saw the car more
      // recently than the queue did, so the desk wins.
      if (!(NEXT_STATUS[ticket.status] ?? []).includes(payload.status)) {
        return Response.json(
          { error: `Already moved on — it is ${ticket.status} now.` },
          { status: 400 }
        );
      }

      const { error } = await supabase
        .from('tickets')
        .update({ status: payload.status })
        .eq('id', ticket.id);

      if (error) throw error;
      return Response.json({ ok: true });
    }

    if (kind === 'handover.complete') {
      // The action's own id is what makes this idempotent — see
      // lib/handover.js. It is not the payment's primary key by
      // coincidence; it is deliberately the same value the tablet
      // generated before it ever left the device.
      const result = await recordHandover(supabase, {
        invoiceId: payload?.invoice_id,
        method: payload?.method ?? 'cash',
        amountCents: Number(payload?.amount_cents ?? 0),
        signature: payload?.signature ?? '',
        signedName: payload?.signed_name ?? null,
        reference: payload?.reference ?? null,
        clientId: id,
      });

      if (result.error) return Response.json({ error: result.error }, { status: 400 });
      return Response.json({ ok: true, duplicate: Boolean(result.duplicate) });
    }

    if (kind === 'handover.release') {
      // Idempotent by nature — setting the same "handed back" timestamp
      // and person twice changes nothing the first write didn't already
      // do, so this needs no client id to be safe against a retry.
      const { error } = await supabase
        .from('invoices')
        .update({ handed_back_at: new Date().toISOString(), handed_back_by: profile.id })
        .eq('id', payload?.invoice_id)
        .is('handed_back_at', null);

      if (error) throw error;
      return Response.json({ ok: true });
    }

    if (kind === 'ticket.update') {
      // Absolute values, never deltas, so replaying it changes nothing
      // the first replay didn't already do.
      const patch = {};
      for (const field of ['keys_location', 'assigned_name', 'notes', 'bay_id']) {
        if (field in (payload ?? {})) patch[field] = payload[field] || null;
      }
      if (Object.keys(patch).length === 0) return Response.json({ ok: true });

      const { error } = await supabase
        .from('tickets')
        .update(patch)
        .eq('id', payload.ticket_id);

      if (error) throw error;
      return Response.json({ ok: true });
    }
  } catch (error) {
    // 500 keeps it queued for another go.
    return Response.json({ error: error.message ?? 'Sync failed.' }, { status: 500 });
  }

  return Response.json({ error: 'Unhandled action.' }, { status: 400 });
}

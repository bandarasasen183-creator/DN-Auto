import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { getTerminal } from '@/lib/payments/terminal';
import TerminalScreen from './TerminalScreen';

export const metadata = { title: 'Take payment' };

/**
 * The full-screen "tap your card" view, sized for a tablet held up to the
 * customer. Deliberately outside the portal shell — nothing to tap by
 * accident while the card machine is in someone's hand.
 */
export default async function PayPage({ params }) {
  await requireRole(['worker', 'admin'], {
    from: `/worker/billing/${params.id}/pay/${params.requestId}`,
  });
  const supabase = createClient();

  const { data: request } = await supabase
    .from('terminal_requests')
    .select('id, invoice_id, amount_cents, status, terminal_code, return_path, provider, invoices(number, customer_name, vehicle_note)')
    .eq('id', params.requestId)
    .maybeSingle();

  if (!request || request.invoice_id !== params.id) notFound();

  const terminal = getTerminal(request.provider);

  return (
    <TerminalScreen
      request={{
        id: request.id,
        amountCents: Number(request.amount_cents),
        status: request.status,
        terminalCode: request.terminal_code,
        number: request.invoices?.number,
        customer: request.invoices?.customer_name,
        vehicle: request.invoices?.vehicle_note,
      }}
      mode={terminal.mode}
      returnPath={request.return_path ?? `/worker/billing/${params.id}`}
    />
  );
}

import Link from 'next/link';
import PortalShell from '@/components/PortalShell';
import Icon from '@/components/Icon';
import { requireRole } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { emailStatus } from '@/lib/email';
import { WORKER_NAV } from '../nav';

export const metadata = { title: 'Mailbox' };

const TABS = [
  { key: 'open', label: 'Open' },
  { key: 'closed', label: 'Closed' },
  { key: 'spam', label: 'Spam' },
];

function when(value) {
  const date = new Date(value);
  const today = new Date();
  const sameDay = date.toDateString() === today.toDateString();
  return sameDay
    ? date.toLocaleTimeString('en-LK', { timeStyle: 'short' })
    : date.toLocaleDateString('en-LK', { day: 'numeric', month: 'short' });
}

export default async function MailPage({ searchParams }) {
  const { profile } = await requireRole(['worker', 'admin'], { from: '/worker/mail' });
  const supabase = createClient();

  const tab = TABS.some((t) => t.key === searchParams?.tab) ? searchParams.tab : 'open';

  const { data: threads } = await supabase
    .from('email_threads')
    .select('id, subject, from_email, from_name, registration, is_unread, last_message_at, assignee:profiles!email_threads_assigned_to_fkey(full_name)')
    .eq('status', tab)
    .order('last_message_at', { ascending: false })
    .limit(100);

  const status = emailStatus();

  return (
    <PortalShell
      profile={profile}
      nav={WORKER_NAV}
      current="/worker/mail"
      title="Mailbox"
      subtitle="Mail sent to the workshop, answered from here."
    >
      {!status.receiving && (
        <p className="form-note rise">
          <strong>Receiving isn&apos;t switched on yet.</strong> Mail will only arrive
          here once the MX record points at Resend and{' '}
          <code>RESEND_WEBHOOK_SECRET</code> is set. Until then this list stays
          empty — see DEPLOYMENT.md.
        </p>
      )}

      <nav className="tabs">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/worker/mail?tab=${t.key}`}
            className={`tabs__tab ${tab === t.key ? 'tabs__tab--on' : ''}`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {(threads ?? []).length === 0 ? (
        <div className="card empty center">
          <Icon name="mail" size={28} />
          <h3>Nothing here</h3>
          <p className="muted small">
            {tab === 'open'
              ? 'No conversations waiting on an answer.'
              : `No ${tab} conversations.`}
          </p>
        </div>
      ) : (
        <ul className="maillist card rise">
          {threads.map((thread) => (
            <li key={thread.id} className={thread.is_unread ? 'maillist__row is-unread' : 'maillist__row'}>
              <Link href={`/worker/mail/${thread.id}`}>
                <span className="maillist__who">
                  {thread.is_unread && <span className="dot" aria-label="Unread" />}
                  <strong>{thread.from_name || thread.from_email}</strong>
                  <span className="small muted">{thread.from_email}</span>
                </span>

                <span className="maillist__subject">
                  {thread.subject || '(no subject)'}
                  {thread.registration && (
                    <span className="pill" style={{ marginLeft: '0.5rem' }}>
                      {thread.registration}
                    </span>
                  )}
                </span>

                <span className="maillist__meta small muted">
                  {thread.assignee?.full_name && <span>{thread.assignee.full_name}</span>}
                  <time dateTime={thread.last_message_at}>{when(thread.last_message_at)}</time>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </PortalShell>
  );
}

import Link from 'next/link';
import { notFound } from 'next/navigation';
import PortalShell from '@/components/PortalShell';
import Icon from '@/components/Icon';
import { requireRole } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { WORKER_NAV } from '../../nav';
import ReplyBox, { ThreadActions } from './ReplyBox';

export const metadata = { title: 'Conversation' };

function stamp(value) {
  return new Date(value).toLocaleString('en-LK', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export default async function ThreadPage({ params }) {
  const { profile } = await requireRole(['worker', 'admin'], {
    from: `/worker/mail/${params.id}`,
  });
  const supabase = createClient();

  const { data: thread } = await supabase
    .from('email_threads')
    .select(`
      id, subject, from_email, from_name, registration, status, is_unread,
      contact_id, customer_id, created_at
    `)
    .eq('id', params.id)
    .maybeSingle();

  if (!thread) notFound();

  const { data: messages } = await supabase
    .from('email_messages')
    .select(`
      id, direction, from_email, from_name, subject, html, text_body,
      status, failure_reason, created_at,
      sender:profiles!email_messages_sent_by_fkey(full_name),
      email_attachments(id, filename, content_type, size_bytes)
    `)
    .eq('thread_id', thread.id)
    .order('created_at');

  // Opening it is reading it. Done here rather than behind a button
  // because a thread you have looked at is not still waiting for you.
  if (thread.is_unread) {
    await supabase.from('email_threads').update({ is_unread: false }).eq('id', thread.id);
  }

  return (
    <PortalShell
      profile={profile}
      nav={WORKER_NAV}
      current="/worker/mail"
      title={thread.subject || '(no subject)'}
      subtitle={`${thread.from_name ? `${thread.from_name} · ` : ''}${thread.from_email}`}
      actions={<ThreadActions thread={thread} />}
    >
      <p>
        <Link href="/worker/mail" className="btn btn--ghost small">
          <Icon name="chevronLeft" size={14} /> Mailbox
        </Link>
      </p>

      {thread.registration && (
        <p className="form-note rise">
          About <strong>{thread.registration}</strong>. The service history and any
          live warranties for this vehicle are on record — check before answering.
        </p>
      )}

      <ol className="thread">
        {(messages ?? []).map((message) => (
          <li
            key={message.id}
            className={`thread__msg thread__msg--${message.direction}`}
          >
            <header>
              <strong>
                {message.direction === 'outbound'
                  ? (message.sender?.full_name ?? 'The workshop')
                  : (message.from_name || message.from_email)}
              </strong>
              <time className="small muted" dateTime={message.created_at}>
                {stamp(message.created_at)}
              </time>
            </header>

            {message.status === 'failed' && (
              <p className="form-error">
                This never sent — {message.failure_reason ?? 'unknown error'}. Send it
                again below.
              </p>
            )}

            {/* Inbound mail is somebody else's HTML, so it is shown as text
                rather than rendered. Nobody who emails the workshop gets to
                run markup inside the portal. */}
            <div className="thread__body">
              {message.text_body
                ? message.text_body
                : message.html
                  ? message.html.replace(/<[^>]+>/g, ' ').replace(/\s{2,}/g, ' ').trim()
                  : '(empty message)'}
            </div>

            {(message.email_attachments ?? []).length > 0 && (
              <ul className="thread__files small">
                {message.email_attachments.map((file) => (
                  <li key={file.id}>
                    <Icon name="download" size={13} /> {file.filename}
                    {file.size_bytes ? (
                      <span className="muted"> · {Math.ceil(file.size_bytes / 1024)} KB</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ol>

      <ReplyBox thread={thread} />
    </PortalShell>
  );
}

'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/session';
import { sendEmail, fromAddress, EmailNotConfiguredError } from '@/lib/email';
import { BUSINESS } from '@/lib/business';

const TEAM = ['worker', 'admin'];

/** Turns a typed reply into something that reads as a real email. */
function renderReply(body, thread) {
  const paragraphs = body
    .trim()
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px;">${escapeHtml(p).replace(/\n/g, '<br>')}</p>`)
    .join('');

  return `
  <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;
              font-size:15px;line-height:1.6;color:#1c1917;max-width:600px;">
    ${paragraphs}
    <p style="margin:24px 0 0;padding-top:14px;border-top:1px solid #e7e2dc;
              font-size:13px;color:#6b6560;">
      ${escapeHtml(BUSINESS.name)}<br>
      ${escapeHtml(BUSINESS.address.line1)}, ${escapeHtml(BUSINESS.address.city)}
      ${escapeHtml(BUSINESS.address.postcode)}<br>
      ${escapeHtml(BUSINESS.contact.phone)}
      ${thread.registration ? `<br>Re: ${escapeHtml(thread.registration)}` : ''}
    </p>
  </div>`;
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Replies to a thread.
 *
 * The RFC threading headers are carried across deliberately: without
 * In-Reply-To and References the answer lands in the customer's mailbox
 * as a brand new conversation, detached from the question they asked,
 * which is exactly the thing that makes a business look disorganised.
 */
export async function replyToThread(_prevState, formData) {
  const { profile } = await requireRole(TEAM);
  const supabase = createClient();

  const threadId = String(formData.get('thread_id') ?? '');
  const body = String(formData.get('body') ?? '').trim();

  if (!body) return { error: 'Write something first.' };

  const { data: thread } = await supabase
    .from('email_threads')
    .select('id, subject, from_email, registration')
    .eq('id', threadId)
    .maybeSingle();

  if (!thread) return { error: 'That conversation no longer exists.' };

  // Thread against the most recent message we have, whichever way it went.
  const { data: last } = await supabase
    .from('email_messages')
    .select('rfc_message_id, reference_ids')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const references = [...(last?.reference_ids ?? []), last?.rfc_message_id].filter(Boolean);
  const subject = /^re:/i.test(thread.subject ?? '')
    ? thread.subject
    : `Re: ${thread.subject ?? '(no subject)'}`;

  const html = renderReply(body, thread);

  let resendId = null;
  let status = 'sent';
  let failure = null;
  let notConfigured = false;

  try {
    const result = await sendEmail({
      to: thread.from_email,
      subject,
      html,
      text: body,
      replyTo: BUSINESS.contact.email,
      headers: {
        ...(last?.rfc_message_id ? { 'In-Reply-To': last.rfc_message_id } : {}),
        ...(references.length ? { References: references.join(' ') } : {}),
      },
    });
    resendId = result.id;
  } catch (err) {
    status = 'failed';
    failure = err.message;
    notConfigured = err instanceof EmailNotConfiguredError;
  }

  // Written down either way. A reply that failed to send is something
  // somebody has to know about, not something to lose.
  await supabase.from('email_messages').insert({
    thread_id: threadId,
    direction: 'outbound',
    from_email: fromAddress(),
    from_name: BUSINESS.name,
    to_emails: [thread.from_email],
    subject,
    html,
    text_body: body,
    resend_id: resendId,
    in_reply_to: last?.rfc_message_id ?? null,
    reference_ids: references,
    sent_by: profile.id,
    status,
    failure_reason: failure,
  });

  revalidatePath(`/worker/mail/${threadId}`);
  revalidatePath('/worker/mail');

  if (status === 'failed') {
    return { error: notConfigured ? failure : `Not sent — ${failure}` };
  }
  return { success: true };
}

/** Marks a thread read, closed, reopened or as spam. */
export async function updateThread(_prevState, formData) {
  await requireRole(TEAM);
  const supabase = createClient();

  const threadId = String(formData.get('thread_id') ?? '');
  const patch = {};

  const status = String(formData.get('status') ?? '');
  if (['open', 'closed', 'spam'].includes(status)) patch.status = status;
  if (formData.get('read') !== null) patch.is_unread = false;

  const assign = String(formData.get('assigned_to') ?? '');
  if (assign) patch.assigned_to = assign === 'none' ? null : assign;

  if (Object.keys(patch).length === 0) return {};

  const { error } = await supabase.from('email_threads').update(patch).eq('id', threadId);
  if (error) return { error: error.message };

  revalidatePath('/worker/mail');
  revalidatePath(`/worker/mail/${threadId}`);
  return { success: true };
}

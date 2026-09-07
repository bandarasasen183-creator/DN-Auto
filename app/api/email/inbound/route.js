import { createServiceClient } from '@/lib/supabase/service';
import { getReceivedEmail, verifyWebhook } from '@/lib/email';
import { normalisePlate } from '@/lib/service-history';

/**
 * Mail arriving at the workshop.
 *
 * Resend takes delivery, stores the message and posts here. The payload
 * is metadata only, so the body is pulled back through the Receiving API
 * before anything is written down.
 *
 * Runs as the service role: this is a machine-to-machine call with no
 * signed-in user, so there is no session for row-level security to read.
 * The signature check above it is therefore the only thing standing
 * between this route and anyone who guesses the URL — it is not optional,
 * and the route refuses to run without a secret configured.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Subjects thread better with the Re:/Fwd: noise stripped off. */
function baseSubject(subject = '') {
  return subject.replace(/^((re|fwd|fw)\s*:\s*)+/i, '').trim().toLowerCase();
}

/** "Dilan Perera <dilan@example.com>" -> both halves. */
function parseAddress(value = '') {
  const match = String(value).match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  if (match) return { name: match[1].trim() || null, email: match[2].trim().toLowerCase() };
  return { name: null, email: String(value).trim().toLowerCase() };
}

function asArray(value) {
  if (!value) return [];
  return (Array.isArray(value) ? value : [value]).map((v) =>
    typeof v === 'string' ? v : (v?.address ?? v?.email ?? '')
  ).filter(Boolean);
}

/** Pulls anything that looks like a registration out of the text. */
function findPlate(text = '') {
  // Sri Lankan plates are broadly two-or-three letters then four digits,
  // written with or without a dash. Deliberately conservative: a wrong
  // guess attaches a stranger's email to somebody's vehicle history.
  const match = String(text).match(/\b([A-Z]{2,3})[\s-]?(\d{4})\b/i);
  return match ? `${match[1].toUpperCase()}-${match[2]}` : null;
}

export async function POST(request) {
  const rawBody = await request.text();

  let event;
  try {
    event = verifyWebhook({ rawBody, headers: request.headers });
  } catch (err) {
    // 401 rather than 400: this is "you are not Resend", and Resend's own
    // retries should not be triggered by it.
    return Response.json({ error: 'Bad signature.' }, { status: 401 });
  }

  if (event?.type !== 'email.received') {
    // Everything else Resend sends (deliveries, bounces, opens) is fine,
    // just not ours. 200 so it stops retrying.
    return Response.json({ ignored: event?.type ?? 'unknown' });
  }

  const supabase = createServiceClient();
  const emailId = event.data?.email_id;
  if (!emailId) return Response.json({ error: 'No email id.' }, { status: 400 });

  // Resend retries until we answer 200, so the same message arrives more
  // than once as a matter of course. The unique index does the real work;
  // this just saves fetching a body we already have.
  const { data: existing } = await supabase
    .from('email_messages')
    .select('id')
    .eq('resend_id', emailId)
    .maybeSingle();

  if (existing) return Response.json({ ok: true, duplicate: true });

  let mail;
  try {
    mail = await getReceivedEmail(emailId);
  } catch (err) {
    // A 500 here is correct: Resend will retry, and the message is safe
    // on their side in the meantime.
    return Response.json({ error: err.message }, { status: 500 });
  }

  const sender = parseAddress(
    typeof mail.from === 'string' ? mail.from : (mail.from?.address ?? '')
  );
  const headers = mail.headers ?? {};
  const rfcMessageId = headers['message-id'] ?? headers['Message-ID'] ?? null;
  const inReplyTo = headers['in-reply-to'] ?? headers['In-Reply-To'] ?? null;
  const referenceIds = String(headers.references ?? headers.References ?? '')
    .split(/\s+/)
    .filter(Boolean);

  // --- Which conversation is this? ------------------------------------
  //
  // The RFC headers first, because they are what the customer's own mail
  // client used and they are exact. Only if there are none do we fall
  // back to guessing from the sender and subject.
  let threadId = null;

  const candidates = [inReplyTo, ...referenceIds].filter(Boolean);
  if (candidates.length > 0) {
    const { data: parent } = await supabase
      .from('email_messages')
      .select('thread_id')
      .in('rfc_message_id', candidates)
      .limit(1)
      .maybeSingle();
    threadId = parent?.thread_id ?? null;
  }

  if (!threadId) {
    const { data: recent } = await supabase
      .from('email_threads')
      .select('id, subject')
      .ilike('from_email', sender.email)
      .gte('last_message_at', new Date(Date.now() - 30 * 864e5).toISOString())
      .order('last_message_at', { ascending: false })
      .limit(10);

    const match = (recent ?? []).find(
      (t) => baseSubject(t.subject) === baseSubject(mail.subject)
    );
    threadId = match?.id ?? null;
  }

  // --- New conversation ------------------------------------------------
  if (!threadId) {
    // Link it to somebody we already know, where the address matches.
    const [{ data: contact }, { data: customer }] = await Promise.all([
      supabase.from('contacts').select('id').ilike('email', sender.email).maybeSingle(),
      supabase.from('profiles').select('id').ilike('email', sender.email).maybeSingle(),
    ]);

    const plate = findPlate(`${mail.subject ?? ''} ${mail.text ?? ''}`);
    // Only attach a plate we have actually seen before — anything else is
    // a four-digit number that happened to look like one.
    let registration = null;
    if (plate) {
      const { data: known } = await supabase
        .from('vehicle_records')
        .select('registration')
        .eq('plate_key', normalisePlate(plate))
        .maybeSingle();
      registration = known?.registration ?? null;
    }

    const { data: thread, error } = await supabase
      .from('email_threads')
      .insert({
        subject: mail.subject ?? '(no subject)',
        from_email: sender.email,
        from_name: sender.name,
        contact_id: contact?.id ?? null,
        customer_id: customer?.id ?? null,
        registration,
      })
      .select('id')
      .single();

    if (error) return Response.json({ error: error.message }, { status: 500 });
    threadId = thread.id;
  }

  const { error: messageError } = await supabase.from('email_messages').insert({
    thread_id: threadId,
    direction: 'inbound',
    from_email: sender.email,
    from_name: sender.name,
    to_emails: asArray(mail.to),
    cc_emails: asArray(mail.cc),
    subject: mail.subject ?? null,
    html: mail.html ?? null,
    text_body: mail.text ?? null,
    resend_id: emailId,
    rfc_message_id: rfcMessageId,
    in_reply_to: inReplyTo,
    reference_ids: referenceIds,
    status: 'received',
  });

  // A duplicate slipping past the check above is not an error — it is the
  // unique index doing exactly what it is there for.
  if (messageError && messageError.code !== '23505') {
    return Response.json({ error: messageError.message }, { status: 500 });
  }

  if (!messageError && (event.data?.attachments ?? []).length > 0) {
    const { data: saved } = await supabase
      .from('email_messages')
      .select('id')
      .eq('resend_id', emailId)
      .maybeSingle();

    if (saved) {
      await supabase.from('email_attachments').insert(
        (mail.attachments ?? event.data.attachments).map((a) => ({
          message_id: saved.id,
          resend_attachment_id: a.id ?? null,
          filename: a.filename ?? 'attachment',
          content_type: a.content_type ?? a.contentType ?? null,
          size_bytes: a.size ?? null,
        }))
      );
    }
  }

  return Response.json({ ok: true });
}

/**
 * Sending email, through Resend.
 *
 * Same shape as the payment adapters: the rest of the app asks for an
 * email to be sent and doesn't care who sends it. If the key is missing
 * the app says so plainly rather than failing somewhere confusing, which
 * matters because a receipt that silently never arrives is worse than one
 * that visibly refused to send.
 */

const ENDPOINT = 'https://api.resend.com/emails';

export class EmailNotConfiguredError extends Error {
  constructor() {
    super(
      'Email is not set up yet. Add RESEND_API_KEY and RESEND_FROM to the ' +
        'environment, and verify dnauto.lk inside Resend.'
    );
    this.name = 'EmailNotConfiguredError';
  }
}

/** The address customers see. Must be on a domain verified in Resend. */
function fromAddress() {
  return process.env.RESEND_FROM || 'DN Auto Repairs <service@dnauto.lk>';
}

export function emailStatus() {
  const configured = Boolean(process.env.RESEND_API_KEY);
  return {
    configured,
    from: configured ? fromAddress() : null,
    provider: 'resend',
  };
}

/**
 * Sends one email.
 *
 * Returns the provider's id so it can be written against the message row —
 * without it there is no way to answer "did that receipt actually go?"
 * three weeks later.
 */
export async function sendEmail({ to, subject, html, text, replyTo }) {
  if (!process.env.RESEND_API_KEY) throw new EmailNotConfiguredError();
  if (!to) throw new Error('No address to send to.');

  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromAddress(),
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      // A plain-text part keeps it out of spam folders and readable on a
      // phone with images turned off.
      text: text ?? stripTags(html),
      ...(replyTo ? { reply_to: replyTo } : {}),
    }),
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(body?.message || `Resend refused that (${response.status}).`);
  }

  return { id: body?.id ?? null };
}

/** A crude text fallback — enough for a receipt, which is mostly a table. */
function stripTags(html = '') {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<\/(p|tr|h1|h2|h3|div)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

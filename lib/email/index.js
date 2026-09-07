/**
 * Sending and receiving email, through Resend.
 *
 * Same shape as the payment adapters: the rest of the app asks for an
 * email to be sent and doesn't care who sends it. If the key is missing
 * the app says so plainly rather than failing somewhere confusing — a
 * receipt that silently never arrives is worse than one that visibly
 * refused to send.
 *
 * Receiving works the other way round. Resend takes delivery, stores the
 * message, and posts us a webhook carrying metadata only. The body and
 * attachments are then pulled back through the Receiving API, which is
 * why this file needs the SDK rather than a single fetch.
 */

import { Resend } from 'resend';

export class EmailNotConfiguredError extends Error {
  constructor() {
    super(
      'Email is not set up yet. Add RESEND_API_KEY and RESEND_FROM to the ' +
        'environment, and verify the sending domain inside Resend.'
    );
    this.name = 'EmailNotConfiguredError';
  }
}

/** The address customers see. Must be on a domain verified in Resend. */
export function fromAddress() {
  return process.env.RESEND_FROM || 'DN Auto Repairs <service@send.dnauto.lk>';
}

function client() {
  if (!process.env.RESEND_API_KEY) throw new EmailNotConfiguredError();
  return new Resend(process.env.RESEND_API_KEY);
}

export function emailStatus() {
  const configured = Boolean(process.env.RESEND_API_KEY);
  return {
    configured,
    from: configured ? fromAddress() : null,
    // Receiving needs the webhook secret as well — without it we cannot
    // tell a real delivery from anyone who found the URL.
    receiving: configured && Boolean(process.env.RESEND_WEBHOOK_SECRET),
    provider: 'resend',
  };
}

/**
 * Sends one email.
 *
 * `headers` carries the RFC threading headers on a reply, which is what
 * makes our answer appear under the customer's original message in their
 * mail client rather than as a new conversation.
 */
export async function sendEmail({ to, subject, html, text, replyTo, headers, cc }) {
  const resend = client();
  if (!to) throw new Error('No address to send to.');

  const { data, error } = await resend.emails.send({
    from: fromAddress(),
    to: Array.isArray(to) ? to : [to],
    ...(cc?.length ? { cc } : {}),
    subject,
    html,
    // A plain-text part keeps it out of spam folders and readable on a
    // phone with images turned off.
    text: text ?? stripTags(html),
    ...(replyTo ? { replyTo } : {}),
    ...(headers ? { headers } : {}),
  });

  if (error) throw new Error(error.message || 'Resend refused that.');
  return { id: data?.id ?? null };
}

/**
 * Pulls a received message back.
 *
 * The webhook only tells us who sent what and whether there were
 * attachments; everything worth reading comes from here.
 */
export async function getReceivedEmail(emailId) {
  const resend = client();
  const { data, error } = await resend.emails.receiving.get(emailId);
  if (error) throw new Error(error.message || 'Could not fetch that email.');
  return data;
}

/**
 * A fresh download link for one attachment.
 *
 * Deliberately fetched on demand and never stored: Resend's URLs expire,
 * so a saved one is a link that works today and 404s next week.
 */
export async function getAttachmentUrl(emailId, attachmentId) {
  const resend = client();
  const { data, error } = await resend.emails.receiving.attachments.get({
    emailId,
    attachmentId,
  });
  if (error) throw new Error(error.message || 'Could not fetch that attachment.');
  return data?.download_url ?? data?.downloadUrl ?? null;
}

/**
 * Checks a webhook really came from Resend.
 *
 * Must be given the raw request body — parsing it to JSON first and
 * re-serialising changes the bytes and the signature no longer matches.
 */
export function verifyWebhook({ rawBody, headers }) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) throw new Error('RESEND_WEBHOOK_SECRET is not set.');

  const resend = new Resend(process.env.RESEND_API_KEY || 're_unused');
  return resend.webhooks.verify({
    payload: rawBody,
    headers: {
      id: headers.get('svix-id') ?? headers.get('webhook-id'),
      timestamp: headers.get('svix-timestamp') ?? headers.get('webhook-timestamp'),
      signature: headers.get('svix-signature') ?? headers.get('webhook-signature'),
    },
    webhookSecret: secret,
  });
}

/** A crude text fallback — enough for a receipt, which is mostly a table. */
export function stripTags(html = '') {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<\/(p|tr|h1|h2|h3|div)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

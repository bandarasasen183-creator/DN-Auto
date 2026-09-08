/**
 * Mocks the WhatsApp / SMS / Email notification flow.
 * In production, this would integrate with Twilio or similar.
 */
export async function sendNotification(phone, message) {
  if (!phone) return;
  console.log(`\n[MOCK WHATSAPP NOTIFICATION] to ${phone}:\n${message}\n`);
}

/**
 * Promotion rules.
 *
 * Discounts are decided on the server, never in the browser — the wizard shows
 * what a customer will get, but `resolvePromotion` is what actually decides,
 * and the booking action calls it again before writing anything.
 */

import { formatLKR } from '@/lib/business';

/** Human wording for a promotion's value, e.g. "5% off" or "LKR 1,000 off". */
export function describeValue(promo) {
  return promo.kind === 'percent'
    ? `${promo.value}% off`
    : `${formatLKR(promo.value)} off`;
}

/** What a promotion takes off a given subtotal, in LKR cents. */
export function discountFor(promo, subtotalCents) {
  if (!promo || subtotalCents <= 0) return 0;
  if (subtotalCents < (promo.min_spend_cents ?? 0)) return 0;

  const raw =
    promo.kind === 'percent'
      ? Math.round((subtotalCents * promo.value) / 100)
      : promo.value;

  const capped = promo.max_discount_cents
    ? Math.min(raw, Number(promo.max_discount_cents))
    : raw;

  // Never discount below zero, and never more than the job is worth.
  return Math.max(0, Math.min(capped, subtotalCents));
}

function withinDates(promo, today = new Date()) {
  const day = today.toISOString().slice(0, 10);
  if (promo.starts_on && promo.starts_on > day) return false;
  if (promo.ends_on && promo.ends_on < day) return false;
  return true;
}

/**
 * Decides which promotion a booking gets.
 *
 * Order matters: an explicitly typed code beats an automatic offer, because
 * someone who has been given a code expects that code to be the one used.
 * Returns { promo, referrerId, reason } or { promo: null, reason }.
 */
export async function resolvePromotion(supabase, { customerId, code }) {
  const typed = (code ?? '').trim().toUpperCase();

  // --- 1. A referral code belonging to another customer -----------------
  if (typed) {
    const { data: referrer } = await supabase
      .from('profiles')
      .select('id, full_name, referral_code')
      .eq('referral_code', typed)
      .maybeSingle();

    if (referrer) {
      if (referrer.id === customerId) {
        return { promo: null, reason: 'That is your own referral code.' };
      }

      const { data: referralPromo } = await supabase
        .from('promotions')
        .select('*')
        .eq('trigger', 'referral')
        .eq('is_active', true)
        .maybeSingle();

      if (!referralPromo || !withinDates(referralPromo)) {
        return { promo: null, reason: 'Referrals are not running at the moment.' };
      }

      // A referral is a welcome offer, so it is for new customers only.
      const { count } = await supabase
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .eq('customer_id', customerId);

      if ((count ?? 0) > 0) {
        return {
          promo: null,
          reason: 'Referral codes are for a first visit. Ask us about our other offers.',
        };
      }

      return {
        promo: referralPromo,
        referrerId: referrer.id,
        reason: `${referrer.full_name.split(' ')[0]} referred you — nice one.`,
      };
    }

    // --- 2. A plain promotional code -------------------------------------
    const { data: promo } = await supabase
      .from('promotions')
      .select('*')
      .eq('code', typed)
      .eq('is_active', true)
      .maybeSingle();

    if (!promo) return { promo: null, reason: 'That code was not recognised.' };
    if (!withinDates(promo)) return { promo: null, reason: 'That offer has ended.' };

    const { count: used } = await supabase
      .from('promotion_redemptions')
      .select('id', { count: 'exact', head: true })
      .eq('promotion_id', promo.id)
      .eq('customer_id', customerId);

    if ((used ?? 0) >= promo.per_customer_limit) {
      return { promo: null, reason: 'You have already used that code.' };
    }

    if (promo.usage_limit) {
      const { count: total } = await supabase
        .from('promotion_redemptions')
        .select('id', { count: 'exact', head: true })
        .eq('promotion_id', promo.id);
      if ((total ?? 0) >= promo.usage_limit) {
        return { promo: null, reason: 'That offer has been fully claimed.' };
      }
    }

    return { promo, reason: promo.name };
  }

  // --- 3. Automatic: first booking --------------------------------------
  const { count: bookingCount } = await supabase
    .from('bookings')
    .select('id', { count: 'exact', head: true })
    .eq('customer_id', customerId);

  if ((bookingCount ?? 0) === 0) {
    const { data: firstTime } = await supabase
      .from('promotions')
      .select('*')
      .eq('trigger', 'first_booking')
      .eq('is_active', true)
      .maybeSingle();

    if (firstTime && withinDates(firstTime)) {
      return { promo: firstTime, reason: 'First booking through the website.' };
    }
  }

  // --- 4. A seasonal offer running for everybody -------------------------
  const { data: always } = await supabase
    .from('promotions')
    .select('*')
    .eq('trigger', 'always')
    .eq('is_active', true)
    .order('value', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (always && withinDates(always)) {
    return { promo: always, reason: always.name };
  }

  return { promo: null, reason: null };
}

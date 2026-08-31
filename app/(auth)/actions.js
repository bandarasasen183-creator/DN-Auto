'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { ROLE_HOME } from '@/lib/auth/session';

/** Where to send someone after they authenticate. */
async function destinationFor(supabase, userId, requestedNext) {
  if (requestedNext && requestedNext.startsWith('/')) return requestedNext;
  const { data } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();
  return ROLE_HOME[data?.role] ?? '/';
}

export async function signIn(_prevState, formData) {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const next = String(formData.get('next') ?? '');

  if (!email || !password) {
    return { error: 'Enter your email and password.' };
  }

  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    // Deliberately vague: don't confirm whether an account exists.
    return { error: 'That email and password do not match an account.' };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_active')
    .eq('id', data.user.id)
    .single();

  if (profile && !profile.is_active) {
    await supabase.auth.signOut();
    return { error: 'This account has been disabled. Please call the workshop.' };
  }

  const destination = await destinationFor(supabase, data.user.id, next);
  revalidatePath('/', 'layout');
  redirect(destination);
}

export async function signUp(_prevState, formData) {
  const fullName = String(formData.get('full_name') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim();
  const phone = String(formData.get('phone') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!fullName || !email || !password) {
    return { error: 'Name, email and password are all required.' };
  }
  if (password.length < 8) {
    return { error: 'Please use a password of at least 8 characters.' };
  }

  const supabase = createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    // The database trigger clamps the role to 'customer'; staff accounts are
    // promoted by an admin, never self-selected at signup.
    options: { data: { full_name: fullName, phone } },
  });

  if (error) {
    return { error: error.message };
  }

  // With email confirmation on, there is no session yet.
  if (!data.session) {
    return {
      notice:
        'Account created. Check your email for the confirmation link, then sign in.',
    };
  }

  revalidatePath('/', 'layout');
  redirect('/portal');
}

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/login');
}

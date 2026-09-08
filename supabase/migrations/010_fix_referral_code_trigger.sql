-- =====================================================================
-- 010 — signup was silently failing for every new account
--
-- assign_referral_code() in 003 generates a code with gen_random_bytes(),
-- which belongs to pgcrypto. On Supabase pgcrypto lives in the
-- `extensions` schema, but the function is declared
-- `set search_path = public`, so inside it that name cannot be resolved.
--
-- The chain that broke:
--
--   signup -> handle_new_user() inserts into profiles
--          -> assign_referral_code() fires BEFORE INSERT
--          -> gen_random_bytes not found, exception raised
--          -> the profiles insert fails
--          -> the whole auth.users insert rolls back
--          -> no account is created, and the app gets a generic error
--             with nothing useful to show the person signing up
--
-- 003 itself appeared to run fine because its backfill is a plain DO
-- block, executed with the SQL editor's own search path — which does
-- include `extensions`. Only the trigger was affected, so the damage
-- didn't appear until somebody tried to sign up.
--
-- The fix drops the pgcrypto dependency rather than widening the search
-- path. md5() and random() are core Postgres: nothing to install, nothing
-- to resolve, and no way for this to break again on a fresh project where
-- an extension happens to be somewhere else. 005 already generates
-- warranty numbers this way, so this also makes the two consistent.
--
-- Run after 009. Safe to re-run.
-- =====================================================================

create or replace function assign_referral_code() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  candidate text;
  attempts  int := 0;
begin
  if new.referral_code is not null then return new; end if;

  loop
    -- Short, readable, and free of characters that get misheard on the
    -- phone: no O/0, no I/1.
    candidate := 'DN' || translate(
      upper(substr(md5(random()::text || clock_timestamp()::text), 1, 5)),
      'OI01', 'XYZW'
    );

    exit when not exists (select 1 from profiles where referral_code = candidate);

    -- A referral code is a nicety; an account is not. If we somehow
    -- cannot find a free code, the signup must still succeed rather than
    -- taking the customer's account down with it — which is the exact
    -- failure this migration exists to fix.
    attempts := attempts + 1;
    if attempts >= 10 then
      return new;
    end if;
  end loop;

  new.referral_code := candidate;
  return new;

exception
  -- Belt and braces. Whatever else this function ever manages to get
  -- wrong, it must not be the reason somebody cannot create an account.
  -- A missing referral code is invisible to the customer and fixable with
  -- one UPDATE; a failed signup is neither.
  when others then
    return new;
end $$;

-- Anyone whose signup happened to land while the old trigger was in place
-- has no code. Give them one.
do $$
declare
  r record;
  candidate text;
  attempts int;
begin
  for r in select id from profiles where referral_code is null loop
    attempts := 0;
    loop
      candidate := 'DN' || translate(
        upper(substr(md5(random()::text || clock_timestamp()::text), 1, 5)),
        'OI01', 'XYZW'
      );
      exit when not exists (select 1 from profiles where referral_code = candidate);
      attempts := attempts + 1;
      exit when attempts >= 10;
    end loop;
    update profiles set referral_code = candidate where id = r.id;
  end loop;
end $$;

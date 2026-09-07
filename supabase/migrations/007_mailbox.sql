-- =====================================================================
-- 007 — the mailbox
--
-- Mail sent to the workshop lands in the app rather than in somebody's
-- personal inbox, and is answered from the same place. Resend receives
-- it, tells us over a webhook, and we pull the body back.
--
-- Threads, not messages, because a customer asking about a warranty and
-- our answer three hours later are one conversation, and reading half of
-- it is worse than reading none.
--
-- Run after 006. Safe to re-run.
-- =====================================================================

create table if not exists email_threads (
  id            uuid primary key default uuid_generate_v4(),
  subject       text,

  -- Who we are talking to. Kept on the thread as well as the message so
  -- an inbox listing needs one query rather than one per row.
  from_email    text not null,
  from_name     text,

  -- Linked where we can. A thread from an address we already know belongs
  -- against that customer's history; one about a plate we know belongs
  -- against the vehicle. Neither is required — plenty of mail is from
  -- somebody we have never met.
  contact_id    uuid references contacts(id) on delete set null,
  customer_id   uuid references profiles(id) on delete set null,
  registration  text,
  plate_key     text generated always as
                  (upper(regexp_replace(coalesce(registration, ''), '[^A-Za-z0-9]', '', 'g'))) stored,

  status        text not null default 'open'
                  check (status in ('open', 'closed', 'spam')),
  assigned_to   uuid references profiles(id) on delete set null,

  -- Drives the inbox: newest conversation first, unread ones marked.
  last_message_at timestamptz not null default now(),
  is_unread     boolean not null default true,

  created_at    timestamptz not null default now()
);

create index if not exists email_threads_recent_idx
  on email_threads(status, last_message_at desc);
create index if not exists email_threads_from_idx on email_threads(lower(from_email));
create index if not exists email_threads_plate_idx on email_threads(plate_key);
create index if not exists email_threads_unread_idx
  on email_threads(is_unread) where is_unread;

create table if not exists email_messages (
  id            uuid primary key default uuid_generate_v4(),
  thread_id     uuid not null references email_threads(id) on delete cascade,
  direction     text not null check (direction in ('inbound', 'outbound')),

  from_email    text not null,
  from_name     text,
  to_emails     text[] not null default '{}',
  cc_emails     text[] not null default '{}',
  subject       text,
  html          text,
  text_body     text,

  -- Resend's own id. Unique, so a webhook delivered twice — which is
  -- normal, they retry until we answer 200 — cannot post the same mail
  -- into a thread twice.
  resend_id     text unique,

  -- Real RFC headers, which is what actually makes threading work in the
  -- customer's mail client as well as in ours.
  rfc_message_id text,
  in_reply_to   text,
  reference_ids text[] not null default '{}',

  -- Who in the workshop sent it. Null on anything inbound.
  sent_by       uuid references profiles(id) on delete set null,
  status        text not null default 'received'
                  check (status in ('received', 'sent', 'failed')),
  failure_reason text,

  created_at    timestamptz not null default now()
);

create index if not exists email_messages_thread_idx
  on email_messages(thread_id, created_at);
create index if not exists email_messages_rfc_idx on email_messages(rfc_message_id);

create table if not exists email_attachments (
  id                uuid primary key default uuid_generate_v4(),
  message_id        uuid not null references email_messages(id) on delete cascade,
  -- Resend stores the file. We keep the id and fetch a fresh download URL
  -- when somebody asks for it, because those URLs expire — storing one
  -- would give us a link that works today and 404s next week.
  resend_attachment_id text,
  filename          text not null,
  content_type      text,
  size_bytes        bigint,
  created_at        timestamptz not null default now()
);

create index if not exists email_attachments_message_idx
  on email_attachments(message_id);

-- ---------------------------------------------------------------------
-- Keep the thread's summary in step with its messages, so the inbox can
-- be listed without touching email_messages at all.
-- ---------------------------------------------------------------------
create or replace function touch_email_thread() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update email_threads
     set last_message_at = new.created_at,
         -- Our own replies do not make a thread unread again.
         is_unread = case when new.direction = 'inbound' then true else is_unread end,
         -- A closed thread that gets a reply is open again. Somebody is
         -- still waiting on an answer whatever we decided earlier.
         status = case
                    when new.direction = 'inbound' and status = 'closed' then 'open'
                    else status
                  end
   where id = new.thread_id;
  return new;
end $$;

drop trigger if exists email_messages_touch_thread on email_messages;
create trigger email_messages_touch_thread after insert on email_messages
  for each row execute function touch_email_thread();

-- ---------------------------------------------------------------------
-- Row Level Security.
--
-- Staff only, and deliberately no customer-facing policy: this is the
-- workshop's correspondence, and some of it will be about the customer
-- reading it rather than for them.
-- ---------------------------------------------------------------------
alter table email_threads     enable row level security;
alter table email_messages    enable row level security;
alter table email_attachments enable row level security;

drop policy if exists email_threads_staff on email_threads;
create policy email_threads_staff on email_threads for all
  using (is_staff()) with check (is_staff());

drop policy if exists email_messages_staff on email_messages;
create policy email_messages_staff on email_messages for all
  using (is_staff()) with check (is_staff());

drop policy if exists email_attachments_staff on email_attachments;
create policy email_attachments_staff on email_attachments for all
  using (is_staff()) with check (is_staff());

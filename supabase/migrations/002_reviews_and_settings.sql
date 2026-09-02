-- =====================================================================
-- 002 — customer reviews, workshop settings, and status notifications
-- Run after schema.sql. Safe to re-run.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Reviews. A customer can review a job once it is completed; admin decides
-- whether it appears on the public site, so the shopfront can never be
-- vandalised by whoever signed up last.
-- ---------------------------------------------------------------------
create table if not exists reviews (
  id           uuid primary key default uuid_generate_v4(),
  booking_id   uuid not null unique references bookings(id) on delete cascade,
  author_id    uuid not null references profiles(id) on delete cascade,
  rating       int not null check (rating between 1 and 5),
  body         text,
  is_published boolean not null default false,
  reply        text,
  created_at   timestamptz not null default now()
);
create index if not exists reviews_published_idx on reviews(is_published, created_at desc);

alter table reviews enable row level security;

drop policy if exists reviews_read on reviews;
create policy reviews_read on reviews for select
  using (is_published or author_id = auth.uid() or is_staff());

-- You may only review your own booking, and only once it is completed.
drop policy if exists reviews_author_insert on reviews;
create policy reviews_author_insert on reviews for insert
  with check (
    author_id = auth.uid()
    and exists (
      select 1 from bookings b
      where b.id = reviews.booking_id
        and b.customer_id = auth.uid()
        and b.status = 'completed'
    )
  );

drop policy if exists reviews_author_update on reviews;
create policy reviews_author_update on reviews for update
  using (author_id = auth.uid() and not is_published)
  with check (author_id = auth.uid());

drop policy if exists reviews_admin_all on reviews;
create policy reviews_admin_all on reviews for all
  using (is_admin()) with check (is_admin());

-- ---------------------------------------------------------------------
-- Workshop settings — one row admin can edit, so contact details and the
-- announcement banner do not need a code change.
-- ---------------------------------------------------------------------
create table if not exists workshop_settings (
  id                 int primary key default 1 check (id = 1),
  phone              text,
  whatsapp           text,
  email              text,
  announcement       text,
  accepting_bookings boolean not null default true,
  updated_at         timestamptz not null default now()
);

insert into workshop_settings (id) values (1) on conflict (id) do nothing;

alter table workshop_settings enable row level security;

drop policy if exists settings_read on workshop_settings;
create policy settings_read on workshop_settings for select using (true);

drop policy if exists settings_admin_write on workshop_settings;
create policy settings_admin_write on workshop_settings for all
  using (is_admin()) with check (is_admin());

-- ---------------------------------------------------------------------
-- Notify the customer whenever their booking changes status, so the bell is
-- driven by the database rather than by whichever screen did the update.
-- ---------------------------------------------------------------------
create or replace function notify_customer_of_status() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status then
    insert into notifications (user_id, title, body, link)
    values (
      new.customer_id,
      'Your booking was updated',
      'Reference ' || new.reference || ' is now: ' || replace(new.status::text, '_', ' '),
      '/portal/bookings/' || new.id
    );
  end if;
  return new;
end $$;

drop trigger if exists bookings_notify_customer on bookings;
create trigger bookings_notify_customer after update on bookings
  for each row execute function notify_customer_of_status();

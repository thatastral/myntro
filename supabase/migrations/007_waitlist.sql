-- Waitlist table for pre-launch username reservation + email collection

create table if not exists waitlist (
  id          uuid        default gen_random_uuid() primary key,
  email       text        not null unique,
  username    text        not null unique,
  created_at  timestamptz default now()
);

-- Lowercase + trim on insert
alter table waitlist
  add constraint waitlist_username_format
  check (username ~ '^[a-z0-9_]{3,30}$');

-- RLS: allow public inserts, no public reads
alter table waitlist enable row level security;

create policy "Anyone can join waitlist"
  on waitlist for insert
  with check (true);

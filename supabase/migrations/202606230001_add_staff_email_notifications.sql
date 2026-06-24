alter table public.staff_users
  add column if not exists email text;

create unique index if not exists staff_users_email_unique
  on public.staff_users (lower(email))
  where email is not null;

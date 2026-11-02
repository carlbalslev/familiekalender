begin;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

-- Filled separately through a trusted administrator connection. Never commit emails.
create table private.family_allowlist (
  email text primary key check (email = lower(email)),
  person text not null unique check (person in ('Carl','Hilda'))
);
alter table private.family_allowlist enable row level security;
revoke all on private.family_allowlist from public, anon, authenticated;

create table public.family_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  person text not null unique check (person in ('Carl','Hilda'))
);
alter table public.family_members enable row level security;
revoke all on public.family_members from anon, authenticated;
grant select on public.family_members to authenticated;
create policy "Read own membership" on public.family_members for select to authenticated using (user_id = (select auth.uid()));

create function private.is_family_member() returns boolean
language sql stable security definer set search_path = ''
as $$ select exists(select 1 from public.family_members where user_id = (select auth.uid())); $$;
revoke all on function private.is_family_member() from public, anon;
grant execute on function private.is_family_member() to authenticated;

-- Only the two administrator-approved addresses can register. Membership is
-- granted after email verification, never from user-editable metadata.
create function private.guard_family_signup() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not exists(select 1 from private.family_allowlist where email = lower(NEW.email)) then
    raise exception 'Registration is restricted' using errcode = '42501';
  end if;
  return NEW;
end; $$;
revoke all on function private.guard_family_signup() from public, anon, authenticated;
create trigger family_signup_guard before insert on auth.users for each row execute function private.guard_family_signup();

create function private.register_verified_family_member() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if NEW.email_confirmed_at is not null then
    insert into public.family_members(user_id, person)
    select NEW.id, person from private.family_allowlist where email = lower(NEW.email)
    on conflict (user_id) do nothing;
  end if;
  return NEW;
end; $$;
revoke all on function private.register_verified_family_member() from public, anon, authenticated;
create trigger family_verified_member after insert or update of email_confirmed_at on auth.users for each row execute function private.register_verified_family_member();

create table public.calendar_entries (
  day date not null,
  person text not null check (person in ('Carl','Hilda')),
  activity text not null default '' check (char_length(activity) <= 160 and activity !~ E'[\n\r]'),
  home_time time,
  dinner_home boolean not null default true,
  revision integer not null default 1,
  updated_at timestamptz not null default now(),
  primary key (day, person)
);
create function public.bump_calendar_revision() returns trigger
language plpgsql set search_path = '' as $$
begin
  if TG_OP = 'INSERT' then NEW.revision := 1;
  else NEW.revision := OLD.revision + 1; end if;
  NEW.updated_at := now(); return NEW;
end; $$;
create trigger calendar_revision before insert or update on public.calendar_entries for each row execute function public.bump_calendar_revision();
alter table public.calendar_entries enable row level security;
revoke all on public.calendar_entries from anon, authenticated;
grant select, insert on public.calendar_entries to authenticated;
grant update (activity, home_time, dinner_home) on public.calendar_entries to authenticated;
create policy "Family reads calendar" on public.calendar_entries for select to authenticated using ((select private.is_family_member()));
create policy "Family inserts calendar" on public.calendar_entries for insert to authenticated with check ((select private.is_family_member()));
create policy "Family edits calendar" on public.calendar_entries for update to authenticated using ((select private.is_family_member())) with check ((select private.is_family_member()));
alter publication supabase_realtime add table public.calendar_entries;
commit;

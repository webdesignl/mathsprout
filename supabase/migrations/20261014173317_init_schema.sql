-- MathSprout: initial schema, row level security, and parent PIN
-- Layer 1: Supabase Auth = who the family is (one parent login per family).
-- Layer 2: RLS = only your family's rows. Default is no access.
-- Layer 3: Parent PIN = "a parent is at the keyboard now", checked in the database.

create extension if not exists pgcrypto with schema extensions;

-- ============ Tables ============

create table public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'My family' check (char_length(name) between 1 and 60),
  created_at timestamptz not null default now()
);

create table public.family_members (
  family_id uuid not null references public.families(id) on delete cascade,
  user_id uuid not null unique references auth.users(id) on delete cascade,
  role text not null default 'parent' check (role = 'parent'),
  created_at timestamptz not null default now(),
  primary key (family_id, user_id)
);

-- Secrets: RLS on and NO policies, so clients can never read or write them.
-- Only the security definer functions below touch this table.
create table public.family_secrets (
  family_id uuid primary key references public.families(id) on delete cascade,
  pin_hash text,
  failed_attempts int not null default 0,
  locked_until timestamptz
);

-- One row per signed-in browser session that the parent unlocked with the PIN.
create table public.parent_unlocks (
  session_id uuid primary key,
  family_id uuid not null references public.families(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null
);

create table public.children (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  nickname text not null check (char_length(nickname) between 1 and 30),
  grade int check (grade between 1 and 12),
  created_at timestamptz not null default now(),
  unique (id, family_id)
);

-- Shared content (same for every family). Written only by migrations / service role.
create table public.concept_packs (
  id text primary key,
  chapter text not null,
  title text not null
);

create table public.rules (
  id text primary key,
  pack_id text not null references public.concept_packs(id) on delete cascade,
  statement text not null,
  visual text
);

create table public.items (
  id text primary key,
  rule_id text not null references public.rules(id) on delete cascade,
  type text not null check (type in ('asn', 'spotMistake', 'oddOneOut', 'reverse', 'draw', 'compute')),
  prompt text not null,
  options jsonb,
  answer text not null,
  hint text,
  explanation text,
  approved boolean not null default false
);

-- Family data. family_id is stored on every row so one simple policy protects it,
-- and the composite foreign key guarantees the child belongs to that same family.
create table public.attempts (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null,
  child_id uuid not null,
  mode text not null check (mode in ('practice', 'deep_check', 'tutor')),
  item_id text references public.items(id) on delete set null,
  rule_id text references public.rules(id) on delete set null,
  problem text check (char_length(problem) <= 200),
  correct boolean not null,
  first_try boolean not null default true,
  hints_used int not null default 0 check (hints_used between 0 and 10),
  error_type text,
  created_at timestamptz not null default now(),
  foreign key (child_id, family_id) references public.children(id, family_id) on delete cascade
);
create index attempts_family_child_idx on public.attempts (family_id, child_id, created_at desc);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null,
  child_id uuid not null,
  kind text not null check (kind in ('ixl', 'homework', 'map', 'olympiad', 'testPrep')),
  title text not null check (char_length(title) between 1 and 120),
  due date,
  minutes int check (minutes between 1 and 240),
  done boolean not null default false,
  created_at timestamptz not null default now(),
  foreign key (child_id, family_id) references public.children(id, family_id) on delete cascade
);

create table public.uploads (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null,
  child_id uuid not null,
  storage_path text not null,
  kind text not null check (kind in ('tutor', 'test')),
  created_at timestamptz not null default now(),
  foreign key (child_id, family_id) references public.children(id, family_id) on delete cascade
);

-- ============ Helper functions ============

create or replace function public.my_family_id()
returns uuid language sql stable security definer set search_path = '' as $$
  select fm.family_id from public.family_members fm where fm.user_id = auth.uid()
$$;

create or replace function public.current_session_id()
returns uuid language sql stable set search_path = '' as $$
  select nullif(auth.jwt() ->> 'session_id', '')::uuid
$$;

-- True only for THIS browser session, within 15 minutes of entering the PIN.
create or replace function public.is_parent_unlocked()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.parent_unlocks pu
    where pu.session_id = public.current_session_id()
      and pu.user_id = auth.uid()
      and pu.expires_at > now()
  )
$$;

create or replace function public.has_parent_pin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.family_secrets s
    where s.family_id = public.my_family_id() and s.pin_hash is not null
  )
$$;

-- New parent account -> new family, membership and empty secrets row.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  fid uuid;
begin
  insert into public.families default values returning id into fid;
  insert into public.family_members (family_id, user_id) values (fid, new.id);
  insert into public.family_secrets (family_id) values (fid);
  return new;
end
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============ Parent PIN functions ============

-- First time: set a PIN. Later: changing it needs the current PIN.
create or replace function public.set_parent_pin(new_pin text, current_pin text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare
  fid uuid := public.my_family_id();
  s public.family_secrets;
begin
  if fid is null then raise exception 'Not signed in'; end if;
  if new_pin is null or new_pin !~ '^[0-9]{4,6}$' then
    raise exception 'PIN must be 4 to 6 digits';
  end if;
  select * into s from public.family_secrets where family_id = fid for update;
  if s.pin_hash is not null then
    if s.locked_until is not null and s.locked_until > now() then
      raise exception 'Too many wrong PINs. Try again later.';
    end if;
    if current_pin is null or extensions.crypt(current_pin, s.pin_hash) <> s.pin_hash then
      raise exception 'Current PIN is wrong';
    end if;
  end if;
  update public.family_secrets
    set pin_hash = extensions.crypt(new_pin, extensions.gen_salt('bf', 10)),
        failed_attempts = 0, locked_until = null
    where family_id = fid;
  delete from public.parent_unlocks where family_id = fid;
end
$$;

-- Forgot PIN: allowed only within 10 minutes of signing in with the account password.
create or replace function public.reset_parent_pin(new_pin text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  fid uuid := public.my_family_id();
  last_password_login bigint;
begin
  if fid is null then raise exception 'Not signed in'; end if;
  if new_pin is null or new_pin !~ '^[0-9]{4,6}$' then
    raise exception 'PIN must be 4 to 6 digits';
  end if;
  select max((e ->> 'timestamp')::bigint) into last_password_login
    from jsonb_array_elements(coalesce(auth.jwt() -> 'amr', '[]'::jsonb)) e
    where e ->> 'method' in ('password', 'otp', 'magiclink');
  if last_password_login is null or last_password_login < extract(epoch from now()) - 600 then
    raise exception 'Sign out and sign in again with your password, then reset the PIN within 10 minutes';
  end if;
  update public.family_secrets
    set pin_hash = extensions.crypt(new_pin, extensions.gen_salt('bf', 10)),
        failed_attempts = 0, locked_until = null
    where family_id = fid;
  delete from public.parent_unlocks where family_id = fid;
end
$$;

-- Returns the unlock expiry time, or NULL for a wrong PIN.
-- (Returns NULL instead of raising, so the failed-attempt counter is saved.)
create or replace function public.unlock_parent_mode(pin text)
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare
  fid uuid := public.my_family_id();
  sid uuid := public.current_session_id();
  s public.family_secrets;
  expires timestamptz := now() + interval '15 minutes';
begin
  if fid is null or sid is null then raise exception 'Not signed in'; end if;
  select * into s from public.family_secrets where family_id = fid for update;
  if s.pin_hash is null then raise exception 'No PIN set yet'; end if;
  if s.locked_until is not null and s.locked_until > now() then
    raise exception 'Too many wrong PINs. Try again in 15 minutes.';
  end if;
  if pin is null or extensions.crypt(pin, s.pin_hash) <> s.pin_hash then
    update public.family_secrets
      set failed_attempts = case when failed_attempts + 1 >= 5 then 0 else failed_attempts + 1 end,
          locked_until = case when failed_attempts + 1 >= 5 then now() + interval '15 minutes' else null end
      where family_id = fid;
    return null;
  end if;
  update public.family_secrets set failed_attempts = 0, locked_until = null where family_id = fid;
  delete from public.parent_unlocks where user_id = auth.uid() and expires_at <= now();
  insert into public.parent_unlocks (session_id, family_id, user_id, expires_at)
    values (sid, fid, auth.uid(), expires)
    on conflict (session_id) do update set expires_at = excluded.expires_at;
  return expires;
end
$$;

create or replace function public.lock_parent_mode()
returns void language sql security definer set search_path = '' as $$
  delete from public.parent_unlocks where session_id = public.current_session_id() and user_id = auth.uid()
$$;

-- The child can tick a task done without parent mode; editing tasks needs the PIN.
create or replace function public.complete_task(task_id uuid)
returns void language sql security definer set search_path = '' as $$
  update public.tasks set done = true where id = task_id and family_id = public.my_family_id()
$$;

-- ============ Privileges ============

revoke all on all tables in schema public from anon;
revoke all on public.family_secrets, public.parent_unlocks from authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.my_family_id(), public.current_session_id(), public.is_parent_unlocked(),
  public.has_parent_pin(), public.set_parent_pin(text, text), public.reset_parent_pin(text),
  public.unlock_parent_mode(text), public.lock_parent_mode(), public.complete_task(uuid)
  from public, anon;
grant execute on function public.my_family_id(), public.current_session_id(), public.is_parent_unlocked(),
  public.has_parent_pin(), public.set_parent_pin(text, text), public.reset_parent_pin(text),
  public.unlock_parent_mode(text), public.lock_parent_mode(), public.complete_task(uuid)
  to authenticated;

-- ============ Row level security ============

alter table public.families enable row level security;
alter table public.family_members enable row level security;
alter table public.family_secrets enable row level security;   -- no policies on purpose
alter table public.parent_unlocks enable row level security;   -- no policies on purpose
alter table public.children enable row level security;
alter table public.concept_packs enable row level security;
alter table public.rules enable row level security;
alter table public.items enable row level security;
alter table public.attempts enable row level security;
alter table public.tasks enable row level security;
alter table public.uploads enable row level security;

-- Families: read your own; rename only in parent mode.
create policy "read own family" on public.families
  for select to authenticated using (id = (select public.my_family_id()));
create policy "parent renames family" on public.families
  for update to authenticated
  using (id = (select public.my_family_id()) and (select public.is_parent_unlocked()))
  with check (id = (select public.my_family_id()));

create policy "read own membership" on public.family_members
  for select to authenticated using (user_id = (select auth.uid()));

-- Children: everyone in the family can read; only parent mode can add, edit, delete.
create policy "read family children" on public.children
  for select to authenticated using (family_id = (select public.my_family_id()));
create policy "parent adds children" on public.children
  for insert to authenticated
  with check (family_id = (select public.my_family_id()) and (select public.is_parent_unlocked()));
create policy "parent edits children" on public.children
  for update to authenticated
  using (family_id = (select public.my_family_id()) and (select public.is_parent_unlocked()))
  with check (family_id = (select public.my_family_id()));
create policy "parent deletes children" on public.children
  for delete to authenticated
  using (family_id = (select public.my_family_id()) and (select public.is_parent_unlocked()));

-- Attempts: the child's practice saves without a PIN; nobody edits history; parent mode deletes.
create policy "read family attempts" on public.attempts
  for select to authenticated using (family_id = (select public.my_family_id()));
create policy "save family attempts" on public.attempts
  for insert to authenticated with check (family_id = (select public.my_family_id()));
create policy "parent deletes attempts" on public.attempts
  for delete to authenticated
  using (family_id = (select public.my_family_id()) and (select public.is_parent_unlocked()));

-- Tasks: read in family; create, edit, delete only in parent mode (child uses complete_task()).
create policy "read family tasks" on public.tasks
  for select to authenticated using (family_id = (select public.my_family_id()));
create policy "parent adds tasks" on public.tasks
  for insert to authenticated
  with check (family_id = (select public.my_family_id()) and (select public.is_parent_unlocked()));
create policy "parent edits tasks" on public.tasks
  for update to authenticated
  using (family_id = (select public.my_family_id()) and (select public.is_parent_unlocked()))
  with check (family_id = (select public.my_family_id()));
create policy "parent deletes tasks" on public.tasks
  for delete to authenticated
  using (family_id = (select public.my_family_id()) and (select public.is_parent_unlocked()));

-- Uploads: the child can add a tutor photo; only parent mode deletes.
create policy "read family uploads" on public.uploads
  for select to authenticated using (family_id = (select public.my_family_id()));
create policy "save family uploads" on public.uploads
  for insert to authenticated with check (family_id = (select public.my_family_id()));
create policy "parent deletes uploads" on public.uploads
  for delete to authenticated
  using (family_id = (select public.my_family_id()) and (select public.is_parent_unlocked()));

-- Shared content: signed-in users read; only approved items are visible.
create policy "read packs" on public.concept_packs for select to authenticated using (true);
create policy "read rules" on public.rules for select to authenticated using (true);
create policy "read approved items" on public.items for select to authenticated using (approved);
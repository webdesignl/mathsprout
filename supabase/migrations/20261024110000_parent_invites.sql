-- Invite a parent: a one-time link that lets a second parent join the SAME family when they sign up.
-- Same protection as the other family tables: row level security, parent-PIN only, and the link expires.

create table public.family_invites (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  -- Only a hash of the token is stored, so a database reader cannot rebuild a working link.
  token_hash text not null unique,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '3 days',
  used_at timestamptz,
  used_by uuid references auth.users(id) on delete set null
);

alter table public.family_invites enable row level security;

-- The app can list and revoke its family's invites. Creating one is only possible through create_family_invite().
revoke all on public.family_invites from anon, authenticated;
grant select (id, family_id, created_at, expires_at, used_at) on public.family_invites to authenticated;
grant delete on public.family_invites to authenticated;

create policy "parent reads family invites" on public.family_invites
  for select to authenticated
  using (family_id = (select public.my_family_id()) and (select public.is_parent_unlocked()));

create policy "parent revokes unused invites" on public.family_invites
  for delete to authenticated
  using (family_id = (select public.my_family_id()) and (select public.is_parent_unlocked()) and used_at is null);

-- ============ Creating an invite ============
-- Returns the token ONCE (only its hash is kept). Needs parent mode (PIN), refuses demo families, and allows at most
-- 5 open invites so a link cannot be minted endlessly.
create or replace function public.create_family_invite()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  fid uuid := public.my_family_id();
  token text;
  expires timestamptz;
begin
  if fid is null then raise exception 'Not signed in'; end if;
  if not public.is_parent_unlocked() then raise exception 'Parent mode is off'; end if;
  if exists (select 1 from public.families f where f.id = fid and f.is_demo) then
    raise exception 'Invites are not available in the demo';
  end if;
  if (select count(*) from public.family_invites i
        where i.family_id = fid and i.used_at is null and i.expires_at > now()) >= 5 then
    raise exception 'Too many open invites';
  end if;
  token := encode(extensions.gen_random_bytes(24), 'hex');
  insert into public.family_invites (family_id, token_hash, created_by)
    values (fid, encode(extensions.digest(token, 'sha256'), 'hex'), auth.uid())
    returning expires_at into expires;
  return jsonb_build_object('token', token, 'expires_at', expires);
end
$$;
revoke all on function public.create_family_invite() from public, anon;
grant execute on function public.create_family_invite() to authenticated;

-- ============ Is this link still good? ============
-- The join page calls this before showing the sign-up form. It says only yes or no. Tokens are 192 random bits, so
-- guessing one is not realistic.
create or replace function public.invite_is_valid(p_token text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.family_invites i
    where i.token_hash = encode(extensions.digest(coalesce(p_token, ''), 'sha256'), 'hex')
      and i.used_at is null and i.expires_at > now()
  )
$$;
grant execute on function public.invite_is_valid(text) to anon, authenticated;

-- ============ Sign-up: join the inviting family, or (as before) start a new one ============
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  fid uuid;
  fam text := left(btrim(coalesce(new.raw_user_meta_data ->> 'family_name', '')), 60);
  kid text := left(btrim(coalesce(new.raw_user_meta_data ->> 'child_nickname', '')), 30);
  token text := btrim(coalesce(new.raw_user_meta_data ->> 'invite_token', ''));
  inv public.family_invites;
begin
  if coalesce(new.is_anonymous, false) then
    insert into public.families (name, is_demo) values ('Demo family', true) returning id into fid;
    insert into public.family_members (family_id, user_id, email) values (fid, new.id, null);
    insert into public.family_secrets (family_id) values (fid);
    perform public.seed_demo_family(fid);
    return new;
  end if;

  if token <> '' then
    -- Lock the invite row so two sign-ups cannot use the same link.
    select * into inv from public.family_invites i
      where i.token_hash = encode(extensions.digest(token, 'sha256'), 'hex')
        and i.used_at is null and i.expires_at > now()
      for update;
    if not found then raise exception 'Invite link is not valid or has expired'; end if;
    insert into public.family_members (family_id, user_id, email) values (inv.family_id, new.id, new.email);
    update public.family_invites set used_at = now(), used_by = new.id where id = inv.id;
    return new;
  end if;

  insert into public.families (name) values (case when fam = '' then 'My family' else fam end)
    returning id into fid;
  insert into public.family_members (family_id, user_id, email) values (fid, new.id, new.email);
  insert into public.family_secrets (family_id) values (fid);
  if kid <> '' then
    insert into public.children (family_id, nickname) values (fid, kid);
  end if;
  return new;
end
$$;

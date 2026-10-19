-- Keep the parent's email next to the membership, so it can be seen in the table.
-- It is copied from auth.users by the sign-up trigger; the app never writes it
-- (family_members has no insert or update policy).
alter table public.family_members add column if not exists email text;

update public.family_members fm
  set email = u.email
  from auth.users u
  where u.id = fm.user_id and fm.email is null;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  fid uuid;
  fam text := left(btrim(coalesce(new.raw_user_meta_data ->> 'family_name', '')), 60);
  kid text := left(btrim(coalesce(new.raw_user_meta_data ->> 'child_nickname', '')), 30);
begin
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

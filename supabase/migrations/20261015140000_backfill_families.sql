-- Repair: give every account that has no family one (accounts made before the sign-up trigger existed).
-- Safe to run more than once. Uses the same sign-up names when they were saved with the account.
do $$
declare
  u record;
  fid uuid;
  fam text;
  kid text;
begin
  for u in
    select id, email, raw_user_meta_data from auth.users
    where id not in (select user_id from public.family_members)
  loop
    fam := left(btrim(coalesce(u.raw_user_meta_data ->> 'family_name', '')), 60);
    kid := left(btrim(coalesce(u.raw_user_meta_data ->> 'child_nickname', '')), 30);
    insert into public.families (name) values (case when fam = '' then 'My family' else fam end)
      returning id into fid;
    insert into public.family_members (family_id, user_id, email) values (fid, u.id, u.email);
    insert into public.family_secrets (family_id) values (fid);
    if kid <> '' then
      insert into public.children (family_id, nickname) values (fid, kid);
    end if;
  end loop;
end
$$;

-- Make sure the trigger itself exists, so new accounts always get a family.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

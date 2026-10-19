-- Sign-up now asks for a family name and a first child's nickname (both required in the app).
-- They arrive as user metadata; the trigger turns them into the family name and the first child.
-- Missing or too long values fall back to safe defaults so sign-up never fails here.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  fid uuid;
  fam text := left(btrim(coalesce(new.raw_user_meta_data ->> 'family_name', '')), 60);
  kid text := left(btrim(coalesce(new.raw_user_meta_data ->> 'child_nickname', '')), 30);
begin
  insert into public.families (name) values (case when fam = '' then 'My family' else fam end)
    returning id into fid;
  insert into public.family_members (family_id, user_id) values (fid, new.id);
  insert into public.family_secrets (family_id) values (fid);
  if kid <> '' then
    insert into public.children (family_id, nickname) values (fid, kid);
  end if;
  return new;
end
$$;

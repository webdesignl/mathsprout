-- Her real-world ideas, and the parent's stars.
-- The child's session can add an idea. Nobody can edit one directly: a star is given only by
-- give_star(), which checks that parent mode is on (is_parent_unlocked) and that the idea is in the family.

create table public.ideas (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null,
  child_id uuid not null,
  set_number int not null default 1 check (set_number between 1 and 10000),
  text text not null check (char_length(text) between 1 and 200),
  approved boolean,                -- null = waiting for a parent
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (child_id, family_id) references public.children(id, family_id) on delete cascade
);
create index ideas_family_idx on public.ideas (family_id, created_at desc);

alter table public.ideas enable row level security;

create policy "read family ideas" on public.ideas
  for select to authenticated using (family_id = (select public.my_family_id()));

-- A new idea always starts unreviewed, so the child's session cannot give itself a star.
create policy "save family ideas" on public.ideas
  for insert to authenticated
  with check (
    family_id = (select public.my_family_id())
    and approved is null
    and reviewed_at is null
  );

create policy "parent deletes ideas" on public.ideas
  for delete to authenticated
  using (family_id = (select public.my_family_id()) and (select public.is_parent_unlocked()));

-- No update policy on purpose. Also no column privileges to change, as a second lock.
revoke update on public.ideas from authenticated, anon;
revoke all on public.ideas from anon;

-- Give a star (approved = true), say "not this time" (false), or take it back to waiting (null).
create or replace function public.give_star(idea_id uuid, approved boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare
  changed int;
begin
  if not public.is_parent_unlocked() then
    raise exception 'Parent mode is off';
  end if;
  update public.ideas
    set approved = give_star.approved,
        reviewed_at = case when give_star.approved is null then null else now() end
    where id = idea_id and family_id = public.my_family_id();
  get diagnostics changed = row_count;
  if changed = 0 then raise exception 'Idea not found'; end if;
end
$$;

revoke all on function public.give_star(uuid, boolean) from public, anon;
grant execute on function public.give_star(uuid, boolean) to authenticated;

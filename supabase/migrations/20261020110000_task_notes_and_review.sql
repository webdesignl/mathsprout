-- A parent's short note on a task, and a "new from her" flag so a parent sees what she added.
alter table public.tasks
  add column if not exists note text check (note is null or char_length(note) <= 200),
  -- false while a task she added is waiting for a parent to look at it. Tasks a parent adds start as seen.
  add column if not exists seen_by_parent boolean not null default true;

-- Same as before, but a task she adds starts unseen so the parent is told.
create or replace function public.add_task(
  child_id uuid, kind text, title text, due date default null, minutes int default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  fid uuid := public.my_family_id();
  new_id uuid;
  by_parent boolean := public.is_parent_unlocked();
begin
  if fid is null then raise exception 'Not signed in'; end if;
  if not exists (select 1 from public.children c where c.id = add_task.child_id and c.family_id = fid) then
    raise exception 'Child not found';
  end if;
  if kind not in ('ixl', 'homework', 'map', 'olympiad', 'testPrep', 'reading') then
    raise exception 'Unknown task type';
  end if;
  if title is null or char_length(btrim(title)) not between 1 and 120 then
    raise exception 'Title must be 1 to 120 characters';
  end if;
  insert into public.tasks (family_id, child_id, kind, title, due, minutes, added_by, seen_by_parent)
    values (fid, add_task.child_id, kind, btrim(title), due, minutes,
            case when by_parent then 'parent' else 'child' end, by_parent)
    returning id into new_id;
  return new_id;
end
$$;

-- Tidying the list: she can clear finished tasks from her Today page, and old finished tasks are deleted.
-- Unfinished tasks stay open, so they carry over to the next day by themselves.

alter table public.tasks add column if not exists archived boolean not null default false;

-- "Clear finished": hides her finished tasks. The tasks stay (MAP "3 times a week" still counts them).
create or replace function public.archive_done_tasks(child_id uuid)
returns int language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
declare
  fid uuid := public.my_family_id();
  changed int;
begin
  if fid is null then raise exception 'Not signed in'; end if;
  if not exists (select 1 from public.children c where c.id = archive_done_tasks.child_id and c.family_id = fid) then
    raise exception 'Child not found';
  end if;
  update public.tasks
    set archived = true
    where family_id = fid and tasks.child_id = archive_done_tasks.child_id and done and not archived;
  get diagnostics changed = row_count;
  return changed;
end
$$;

-- Memory tidy: finished tasks older than 14 days are deleted. It only touches the caller's own family.
create or replace function public.tidy_tasks()
returns int language plpgsql security definer set search_path = '' as $$
declare
  fid uuid := public.my_family_id();
  removed int;
begin
  if fid is null then return 0; end if;
  delete from public.tasks where family_id = fid and done and done_at < now() - interval '14 days';
  get diagnostics removed = row_count;
  return removed;
end
$$;

revoke all on function public.archive_done_tasks(uuid), public.tidy_tasks() from public, anon;
grant execute on function public.archive_done_tasks(uuid), public.tidy_tasks() to authenticated;

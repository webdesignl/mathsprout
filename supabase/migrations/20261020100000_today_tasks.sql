-- Today's tasks: she adds tasks herself, a parent sets today's order and whether it is a screen-time day.

-- Reading before bed is a kind of task.
alter table public.tasks drop constraint if exists tasks_kind_check;
alter table public.tasks add constraint tasks_kind_check
  check (kind in ('ixl', 'homework', 'map', 'olympiad', 'testPrep', 'reading'));

alter table public.tasks
  add column if not exists done_at timestamptz,
  add column if not exists added_by text not null default 'parent' check (added_by in ('parent', 'child')),
  -- A parent's pick for one day: it counts only when priority_date is that day.
  add column if not exists priority int check (priority between 1 and 100),
  add column if not exists priority_date date;

-- One row per child per day: is it a screen-time day (IXL first)?
create table public.daily_plans (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null,
  child_id uuid not null,
  plan_date date not null,
  screen_time_day boolean not null default false,
  created_at timestamptz not null default now(),
  unique (child_id, plan_date),
  foreign key (child_id, family_id) references public.children(id, family_id) on delete cascade
);

alter table public.daily_plans enable row level security;

create policy "read family plans" on public.daily_plans
  for select to authenticated using (family_id = (select public.my_family_id()));
create policy "parent adds plans" on public.daily_plans
  for insert to authenticated
  with check (family_id = (select public.my_family_id()) and (select public.is_parent_unlocked()));
create policy "parent edits plans" on public.daily_plans
  for update to authenticated
  using (family_id = (select public.my_family_id()) and (select public.is_parent_unlocked()))
  with check (family_id = (select public.my_family_id()));
create policy "parent deletes plans" on public.daily_plans
  for delete to authenticated
  using (family_id = (select public.my_family_id()) and (select public.is_parent_unlocked()));
revoke all on public.daily_plans from anon;

-- Ticking a task done records when, so "MAP 3 times a week" can be counted.
create or replace function public.complete_task(task_id uuid)
returns void language sql security definer set search_path = '' as $$
  update public.tasks
    set done = true, done_at = coalesce(done_at, now())
    where id = task_id and family_id = public.my_family_id()
$$;

-- She adds a task without parent mode. It can only go to a child in her own family, and it never carries
-- a priority (only a parent sets that, through the normal update policy).
create or replace function public.add_task(
  child_id uuid, kind text, title text, due date default null, minutes int default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  fid uuid := public.my_family_id();
  new_id uuid;
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
  insert into public.tasks (family_id, child_id, kind, title, due, minutes, added_by)
    values (fid, add_task.child_id, kind, btrim(title), due, minutes,
            case when public.is_parent_unlocked() then 'parent' else 'child' end)
    returning id into new_id;
  return new_id;
end
$$;

revoke all on function public.add_task(uuid, text, text, date, int) from public, anon;
grant execute on function public.add_task(uuid, text, text, date, int) to authenticated;

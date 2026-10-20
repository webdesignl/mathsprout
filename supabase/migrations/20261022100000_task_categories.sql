-- Task categories, daily routines, pause, and a 30-day history instead of keeping finished tasks.
--   routine    daily habits (IXL, reading, MAP). If not done they do not carry over; a routine can repeat every day.
--   timed      has a due date (test prep, Olympiad). It expires after the due date.
--   important  homework, writing a summary. Carries over for 3 days; from day 4 it sits in the Backlog for a parent.

alter table public.tasks
  add column if not exists category text not null default 'important' check (category in ('routine', 'timed', 'important')),
  add column if not exists for_date date not null default current_date,
  add column if not exists done_on date,
  add column if not exists template_id uuid;

update public.tasks set for_date = created_at::date;
update public.tasks set done_on = done_at::date where done and done_on is null and done_at is not null;
update public.tasks set category = 'routine' where kind in ('ixl', 'reading', 'map');
update public.tasks set category = 'timed' where kind in ('testPrep', 'olympiad') and due is not null;

create unique index if not exists tasks_routine_once_a_day
  on public.tasks (child_id, template_id, for_date) where template_id is not null;

alter table public.task_templates
  add column if not exists category text not null default 'important' check (category in ('routine', 'timed', 'important')),
  add column if not exists repeat_daily boolean not null default false;
update public.task_templates set category = 'routine' where kind in ('ixl', 'reading', 'map');
update public.task_templates set category = 'timed' where kind in ('testPrep', 'olympiad');

-- Pause: while a child is paused nothing ages, and routines do not repeat.
alter table public.children add column if not exists paused_at timestamptz;

-- ============ The carry-over rule, in one place ============
-- 'active' = on her list (or in the carried-over reminder), 'backlog' = for a parent to decide, 'expired' = gone.
create or replace function public.task_state(category text, for_date date, due date, plan_date date)
returns text language sql immutable set search_path = '' as $$
  select case
    when category = 'routine'   then case when plan_date - for_date <= 0 then 'active' else 'expired' end
    when category = 'timed'     then case when due is not null and due >= plan_date then 'active' else 'expired' end
    else                             case when plan_date - for_date <= 3 then 'active' else 'backlog' end
  end
$$;

-- ============ History: one short summary per child per finished day, kept 30 days ============
create table public.day_summaries (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null,
  child_id uuid not null,
  summary_date date not null,
  summary text not null check (char_length(summary) <= 1500),
  done_count int not null default 0,
  map_done int not null default 0,
  finished_all boolean not null default false,
  -- false while a parent has not looked at a finished day. Only finished days ask for a review.
  seen boolean not null default true,
  created_at timestamptz not null default now(),
  unique (child_id, summary_date),
  foreign key (child_id, family_id) references public.children(id, family_id) on delete cascade
);
alter table public.day_summaries enable row level security;
create policy "read family summaries" on public.day_summaries
  for select to authenticated using (family_id = (select public.my_family_id()));
-- No write policies: summaries are written only by close_past_days() and marked seen by mark_summary_seen().
revoke all on public.day_summaries from anon;

-- ============ complete_task: remember which day it was done on ============
drop function if exists public.complete_task(uuid);
create or replace function public.complete_task(task_id uuid, on_date date default null)
returns void language sql security definer set search_path = '' as $$
  update public.tasks
    set done = true, done_at = coalesce(done_at, now()),
        done_on = coalesce(done_on, case when on_date between current_date - 1 and current_date + 1 then on_date else current_date end)
    where id = task_id and family_id = public.my_family_id()
$$;

create or replace function public.uncomplete_task(task_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  cid uuid;
begin
  update public.tasks set done = false, done_at = null, done_on = null
    where id = task_id and family_id = public.my_family_id()
    returning child_id into cid;
  if cid is not null then
    update public.daily_plans
      set completed_at = null, completion_seen = true
      where child_id = cid and family_id = public.my_family_id()
        and plan_date >= current_date - 1 and completed_at is not null;
  end if;
end
$$;

-- ============ add_task: category and a required due date for timed tasks ============
drop function if exists public.add_task(uuid, text, text, date, int);
create or replace function public.add_task(
  child_id uuid, kind text, title text, due date default null, minutes int default null,
  category text default null, for_date date default null
) returns uuid language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
declare
  fid uuid := public.my_family_id();
  new_id uuid;
  by_parent boolean := public.is_parent_unlocked();
  cat text;
  day date;
begin
  if fid is null then raise exception 'Not signed in'; end if;
  if not exists (select 1 from public.children c where c.id = add_task.child_id and c.family_id = fid) then
    raise exception 'Child not found';
  end if;
  if add_task.kind not in ('ixl', 'homework', 'map', 'olympiad', 'testPrep', 'reading') then
    raise exception 'Unknown task type';
  end if;
  if add_task.title is null or char_length(btrim(add_task.title)) not between 1 and 120 then
    raise exception 'Title must be 1 to 120 characters';
  end if;
  day := coalesce(add_task.for_date, current_date);
  if day not between current_date - 1 and current_date + 1 then
    raise exception 'Date is not today';
  end if;
  cat := coalesce(add_task.category,
    case when add_task.kind in ('ixl', 'reading', 'map') then 'routine'
         when add_task.kind in ('testPrep', 'olympiad') then 'timed'
         else 'important' end);
  if cat not in ('routine', 'timed', 'important') then raise exception 'Unknown category'; end if;
  if cat = 'timed' and (add_task.due is null or add_task.due < day) then
    raise exception 'A time-sensitive task needs a due date that is not in the past';
  end if;
  insert into public.tasks (family_id, child_id, kind, title, due, minutes, added_by, seen_by_parent, category, for_date)
    values (fid, add_task.child_id, add_task.kind, btrim(add_task.title), add_task.due, add_task.minutes,
            case when by_parent then 'parent' else 'child' end, by_parent, cat, day)
    returning id into new_id;
  return new_id;
end
$$;
revoke all on function public.add_task(uuid, text, text, date, int, text, date) from public, anon;
grant execute on function public.add_task(uuid, text, text, date, int, text, date) to authenticated;
revoke all on function public.complete_task(uuid, date) from public, anon;
grant execute on function public.complete_task(uuid, date) to authenticated;

-- ============ Daily routines: add today's copy of every "repeat daily" usual task ============
create or replace function public.ensure_routines(child_id uuid, plan_date date)
returns int language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
declare
  fid uuid := public.my_family_id();
  added int;
begin
  if fid is null then raise exception 'Not signed in'; end if;
  if not exists (select 1 from public.children c where c.id = ensure_routines.child_id and c.family_id = fid and c.paused_at is null) then
    return 0;
  end if;
  if ensure_routines.plan_date not between current_date - 1 and current_date + 1 then
    raise exception 'Date is not today';
  end if;
  insert into public.tasks (family_id, child_id, kind, title, minutes, added_by, seen_by_parent, category, for_date, template_id)
    select fid, ensure_routines.child_id, t.kind, t.title, t.minutes, 'parent', true, 'routine', ensure_routines.plan_date, t.id
    from public.task_templates t
    where t.child_id = ensure_routines.child_id and t.family_id = fid and t.repeat_daily and t.category = 'routine'
    on conflict do nothing;
  get diagnostics added = row_count;
  return added;
end
$$;
revoke all on function public.ensure_routines(uuid, date) from public, anon;
grant execute on function public.ensure_routines(uuid, date) to authenticated;

-- ============ report_day_done: only tasks that are still "active" count as open ============
create or replace function public.report_day_done(child_id uuid, plan_date date)
returns boolean language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
declare
  fid uuid := public.my_family_id();
begin
  if fid is null then raise exception 'Not signed in'; end if;
  if not exists (select 1 from public.children c where c.id = report_day_done.child_id and c.family_id = fid) then
    raise exception 'Child not found';
  end if;
  if report_day_done.plan_date not between current_date - 1 and current_date + 1 then
    raise exception 'Date is not today';
  end if;
  if exists (
    select 1 from public.tasks t
    where t.child_id = report_day_done.child_id and not t.done
      and public.task_state(t.category, t.for_date, t.due, report_day_done.plan_date) = 'active'
  ) then
    return false;
  end if;
  if not exists (
    select 1 from public.tasks t
    where t.child_id = report_day_done.child_id and t.done and t.done_at > now() - interval '24 hours'
  ) then
    return false;
  end if;
  insert into public.daily_plans (family_id, child_id, plan_date, completed_at, completion_seen)
    values (fid, report_day_done.child_id, report_day_done.plan_date, now(), false)
    on conflict (child_id, plan_date)
    do update set completed_at = now(), completion_seen = false;
  return true;
end
$$;

-- ============ close_past_days: summarise finished tasks, delete them, clean up ============
create or replace function public.close_past_days(today date)
returns int language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
declare
  fid uuid := public.my_family_id();
  d record;
  routine_txt text;
  hw_txt text;
  extra_txt text;
  text_all text;
  closed int := 0;
begin
  if fid is null then return 0; end if;
  if close_past_days.today not between current_date - 1 and current_date + 1 then return 0; end if;

  for d in
    select t.child_id, coalesce(t.done_on, t.done_at::date) as day,
           count(*) as n, count(*) filter (where t.kind = 'map') as maps
    from public.tasks t
    where t.family_id = fid and t.done and coalesce(t.done_on, t.done_at::date) < close_past_days.today
    group by t.child_id, coalesce(t.done_on, t.done_at::date)
  loop
    select string_agg(t.title, ', ' order by t.done_at) filter (where t.category = 'routine'),
           string_agg(t.title, ', ' order by t.done_at) filter (where t.category <> 'routine' and t.kind = 'homework'),
           string_agg(t.title, ', ' order by t.done_at) filter (where t.category <> 'routine' and t.kind <> 'homework')
      into routine_txt, hw_txt, extra_txt
    from public.tasks t
    where t.family_id = fid and t.child_id = d.child_id and t.done and coalesce(t.done_on, t.done_at::date) = d.day;

    text_all := concat_ws(' ',
      case when routine_txt is not null then 'Routine: ' || routine_txt || '.' end,
      case when hw_txt is not null then 'Homework: ' || hw_txt || '.' end,
      case when extra_txt is not null then 'Extra: ' || extra_txt || '.' end);

    insert into public.day_summaries (family_id, child_id, summary_date, summary, done_count, map_done, finished_all, seen)
    select fid, d.child_id, d.day, left(text_all, 1500), d.n, d.maps,
           p.completed_at is not null,
           case when p.completed_at is not null then coalesce(p.completion_seen, false) else true end
    from (select 1) one
    left join public.daily_plans p on p.child_id = d.child_id and p.plan_date = d.day
    on conflict (child_id, summary_date) do update
      set summary = left(day_summaries.summary || ' ' || excluded.summary, 1500),
          done_count = day_summaries.done_count + excluded.done_count,
          map_done = day_summaries.map_done + excluded.map_done;
    closed := closed + 1;
  end loop;

  -- The summaries now hold what was finished, so the finished tasks can go.
  delete from public.tasks
    where family_id = fid and done and coalesce(done_on, done_at::date) < close_past_days.today;
  -- Tasks that expired: routines from an earlier day, and timed tasks past their due date.
  delete from public.tasks t
    where t.family_id = fid and not t.done
      and public.task_state(t.category, t.for_date, t.due, close_past_days.today) = 'expired';
  -- Memory: summaries and old daily plans are kept for 30 days. Stars live in awards and stay.
  delete from public.day_summaries where family_id = fid and summary_date < close_past_days.today - 30;
  delete from public.daily_plans where family_id = fid and plan_date < close_past_days.today - 30;
  return closed;
end
$$;
revoke all on function public.close_past_days(date) from public, anon;
grant execute on function public.close_past_days(date) to authenticated;
drop function if exists public.tidy_tasks();

-- ============ Parent: seen, stars within a week, pause ============
create or replace function public.mark_summary_seen(child_id uuid, summary_date date)
returns void language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
declare
  fid uuid := public.my_family_id();
begin
  if not public.is_parent_unlocked() then raise exception 'Parent mode is off'; end if;
  update public.day_summaries set seen = true
    where family_id = fid and child_id = mark_summary_seen.child_id and summary_date = mark_summary_seen.summary_date;
  update public.daily_plans set completion_seen = true
    where family_id = fid and child_id = mark_summary_seen.child_id and plan_date = mark_summary_seen.summary_date;
end
$$;
revoke all on function public.mark_summary_seen(uuid, date) from public, anon;
grant execute on function public.mark_summary_seen(uuid, date) to authenticated;

create or replace function public.give_day_star(child_id uuid, plan_date date)
returns void language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
declare
  fid uuid := public.my_family_id();
begin
  if not public.is_parent_unlocked() then
    raise exception 'Parent mode is off';
  end if;
  if give_day_star.plan_date < current_date - 7 then
    raise exception 'A day can be starred within a week';
  end if;
  if not exists (
    select 1 from public.daily_plans d
    where d.child_id = give_day_star.child_id and d.family_id = fid
      and d.plan_date = give_day_star.plan_date and d.completed_at is not null
  ) then
    raise exception 'That day is not finished';
  end if;
  insert into public.awards (family_id, child_id, kind, award_date)
    values (fid, give_day_star.child_id, 'day_done', give_day_star.plan_date)
    on conflict do nothing;
  update public.daily_plans set completion_seen = true
    where child_id = give_day_star.child_id and plan_date = give_day_star.plan_date and family_id = fid;
  update public.day_summaries set seen = true
    where family_id = fid and child_id = give_day_star.child_id and summary_date = give_day_star.plan_date;
end
$$;

-- Pause or resume. Resuming moves open important tasks forward by the days paused, so nothing aged while away.
create or replace function public.set_child_paused(child_id uuid, paused boolean)
returns void language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
declare
  fid uuid := public.my_family_id();
  since timestamptz;
begin
  if not public.is_parent_unlocked() then raise exception 'Parent mode is off'; end if;
  select c.paused_at into since from public.children c
    where c.id = set_child_paused.child_id and c.family_id = fid for update;
  if not found then raise exception 'Child not found'; end if;
  if set_child_paused.paused then
    update public.children set paused_at = coalesce(since, now()) where id = set_child_paused.child_id;
  else
    if since is not null then
      update public.tasks
        set for_date = for_date + greatest(0, current_date - since::date)
        where family_id = fid and tasks.child_id = set_child_paused.child_id and not done and category = 'important';
    end if;
    update public.children set paused_at = null where id = set_child_paused.child_id;
  end if;
end
$$;
revoke all on function public.set_child_paused(uuid, boolean) from public, anon;
grant execute on function public.set_child_paused(uuid, boolean) to authenticated;

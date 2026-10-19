-- She can untick a task (like a shopping list), and the parent is told when she finishes the whole day.

alter table public.daily_plans
  add column if not exists completed_at timestamptz,
  -- false while a parent has not looked at "she finished the day" yet.
  add column if not exists completion_seen boolean not null default true;

-- Untick: a mistake can be undone. If the day was reported as finished, that report is withdrawn.
create or replace function public.uncomplete_task(task_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  cid uuid;
begin
  update public.tasks set done = false, done_at = null
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

-- The app calls this after she ticks the last task. The database checks it for itself: no open tasks left for the
-- child, and something finished in the last day. The plan date comes from her device (her own time zone) but must be
-- close to today, so it cannot be used to write far-off rows.
create or replace function public.report_day_done(child_id uuid, plan_date date)
returns boolean language plpgsql security definer set search_path = '' as $$
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
  if exists (select 1 from public.tasks t where t.child_id = report_day_done.child_id and not t.done) then
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

revoke all on function public.uncomplete_task(uuid), public.report_day_done(uuid, date) from public, anon;
grant execute on function public.uncomplete_task(uuid), public.report_day_done(uuid, date) to authenticated;

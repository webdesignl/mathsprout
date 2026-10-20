-- The day star is now given by a parent, after they see she finished every task.
-- report_day_done() only reports the finished day (no star); give_day_star() gives it, in parent mode only.

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

-- A parent gives the star for a day she finished. One per child per day.
create or replace function public.give_day_star(child_id uuid, plan_date date)
returns void language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
declare
  fid uuid := public.my_family_id();
begin
  if not public.is_parent_unlocked() then
    raise exception 'Parent mode is off';
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
end
$$;

revoke all on function public.give_day_star(uuid, date) from public, anon;
grant execute on function public.give_day_star(uuid, date) to authenticated;

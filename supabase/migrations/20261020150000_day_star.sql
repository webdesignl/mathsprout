-- Finishing the whole day earns one star. The database gives it (inside report_day_done, after its own checks),
-- once per child per day. A child session can no longer insert this award by hand.

alter table public.awards drop constraint if exists awards_kind_check;
alter table public.awards add constraint awards_kind_check check (kind in ('proof_master', 'day_done'));
alter table public.awards add column if not exists award_date date;

-- One day-done star per child per day, so ticking, unticking and ticking again cannot earn a second one.
create unique index if not exists awards_day_done_once
  on public.awards (child_id, award_date) where kind = 'day_done';

-- The child's session may add only the self-reported award. Day stars come from report_day_done().
drop policy if exists "save family awards" on public.awards;
create policy "save family awards" on public.awards
  for insert to authenticated
  with check (family_id = (select public.my_family_id()) and kind = 'proof_master');

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
  insert into public.awards (family_id, child_id, kind, award_date)
    values (fid, report_day_done.child_id, 'day_done', report_day_done.plan_date)
    on conflict do nothing;
  return true;
end
$$;

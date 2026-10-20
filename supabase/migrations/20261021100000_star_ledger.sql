-- Stars are kept in a ledger (the awards table) so they stay even after an old idea is deleted.
-- A parent can change a review only within a week of first reviewing it. After that it is final.
-- Only the 3 most recent reviewed ideas per child are kept (plus any still waiting for a review).

alter table public.awards drop constraint if exists awards_kind_check;
alter table public.awards add constraint awards_kind_check
  check (kind in ('proof_master', 'day_done', 'idea_star'));

-- The idea a star came from. No foreign key on purpose: the star must outlive the idea.
alter table public.awards add column if not exists idea_id uuid;
create unique index if not exists awards_idea_star_once on public.awards (idea_id) where kind = 'idea_star';

-- Stars already given before this change become ledger rows too.
insert into public.awards (family_id, child_id, kind, idea_id, award_date, created_at)
select i.family_id, i.child_id, 'idea_star', i.id, coalesce(i.reviewed_at, i.created_at)::date, coalesce(i.reviewed_at, i.created_at)
from public.ideas i
where i.approved is true
on conflict do nothing;

-- Stars cannot be deleted from the app, not even by a parent. (Deleting a child still removes their stars.)
drop policy if exists "parent deletes awards" on public.awards;

-- Give a star (true), "not this time" (false) or put it back to waiting (null).
create or replace function public.give_star(idea_id uuid, approved boolean)
returns void language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
declare
  fid uuid := public.my_family_id();
  cur public.ideas;
begin
  if not public.is_parent_unlocked() then
    raise exception 'Parent mode is off';
  end if;
  select * into cur from public.ideas where id = idea_id and family_id = fid for update;
  if not found then raise exception 'Idea not found'; end if;
  if cur.reviewed_at is not null and cur.reviewed_at < now() - interval '7 days' then
    raise exception 'Reviews are final after a week';
  end if;

  update public.ideas
    set approved = give_star.approved,
        -- The first review time stays, so flipping back and forth does not restart the week.
        reviewed_at = case when give_star.approved is null then null else coalesce(cur.reviewed_at, now()) end
    where id = idea_id;

  if give_star.approved is true then
    insert into public.awards (family_id, child_id, kind, idea_id, award_date)
      values (fid, cur.child_id, 'idea_star', idea_id, current_date)
      on conflict do nothing;
  else
    delete from public.awards where kind = 'idea_star' and awards.idea_id = give_star.idea_id and family_id = fid;
  end if;

  -- Keep the 3 most recent reviewed ideas for this child. Ideas still waiting are never deleted.
  delete from public.ideas
  where family_id = fid and child_id = cur.child_id and approved is not null
    and id not in (
      select i.id from public.ideas i
      where i.family_id = fid and i.child_id = cur.child_id and i.approved is not null
      order by i.reviewed_at desc nulls last, i.created_at desc
      limit 3
    );
end
$$;

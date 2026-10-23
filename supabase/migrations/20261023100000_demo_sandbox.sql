-- Public demo: a private sandbox family for each visitor who presses "Try the full demo".
-- Supabase makes an anonymous user (auth.users.is_anonymous = true); the sign-up trigger builds a demo family
-- with sample data for it. Real sign-ups are unchanged. Everything here is deleted after 24 hours (next migration).

alter table public.families add column if not exists is_demo boolean not null default false;

-- ============ The sample data ============
-- Not callable by clients: only the sign-up trigger (security definer) runs it.
create or replace function public.seed_demo_family(p_family uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  cid uuid;
  t_ixl uuid;
  idea_one uuid;
  idea_two uuid;
begin
  -- One child with a nickname and an emoji, never a real name or photo.
  insert into public.children (family_id, nickname, grade, avatar)
    values (p_family, 'Sprout', 4, '🐰') returning id into cid;

  -- The parent PIN is 1234, hashed exactly like set_parent_pin does. It is shown on screen in the demo banner,
  -- which is safe because every sandbox is private.
  update public.family_secrets
    set pin_hash = extensions.crypt('1234', extensions.gen_salt('bf', 10))
    where family_id = p_family;

  -- Usual tasks: three daily routines (added to Today by ensure_routines) and one she types pages for.
  insert into public.task_templates (family_id, child_id, kind, title, minutes, ask_detail, category, repeat_daily, sort_order)
    values (p_family, cid, 'ixl', 'IXL', 15, false, 'routine', true, 1) returning id into t_ixl;
  insert into public.task_templates (family_id, child_id, kind, title, minutes, ask_detail, category, repeat_daily, sort_order) values
    (p_family, cid, 'reading', 'Reading', 20, false, 'routine', true, 2),
    (p_family, cid, 'olympiad', 'Olympiad set', 15, false, 'routine', true, 3),
    (p_family, cid, 'homework', 'Math homework book', null, true, 'important', false, 4);

  insert into public.daily_plans (family_id, child_id, plan_date, screen_time_day)
    values (p_family, cid, current_date, true);

  -- Today's tasks: three with a parent's order and start times, one already done, and one Sprout added that
  -- is still waiting for the parent to look at it.
  insert into public.tasks (family_id, child_id, kind, title, minutes, due, category, added_by, seen_by_parent, priority, priority_date, start_time) values
    (p_family, cid, 'homework', 'Math homework book: pages 45 to 47', null, null, 'important', 'child', true, 1, current_date, '16:30'),
    (p_family, cid, 'map', 'MAP practice', 30, null, 'routine', 'parent', true, 2, current_date, '17:15'),
    (p_family, cid, 'testPrep', 'Fractions test prep', null, current_date + 3, 'timed', 'parent', true, 3, current_date, '18:00');
  insert into public.tasks (family_id, child_id, kind, title, minutes, category, added_by, seen_by_parent, template_id, done, done_at, done_on)
    values (p_family, cid, 'ixl', 'IXL', 15, 'routine', 'parent', true, t_ixl, true, now() - interval '1 hour', current_date);
  insert into public.tasks (family_id, child_id, kind, title, category, added_by, seen_by_parent)
    values (p_family, cid, 'homework', 'Spelling words', 'important', 'child', false);

  -- Yesterday: a finished day waiting for a parent to give a star, and one from two days ago that already has one.
  insert into public.daily_plans (family_id, child_id, plan_date, completed_at, completion_seen) values
    (p_family, cid, current_date - 1, now() - interval '20 hours', false),
    (p_family, cid, current_date - 2, now() - interval '44 hours', true);
  insert into public.day_summaries (family_id, child_id, summary_date, summary, done_count, finished_all, seen) values
    (p_family, cid, current_date - 1, 'Routine: IXL, Reading. Homework: Math homework book: pages 40 to 42.', 3, true, false),
    (p_family, cid, current_date - 2, 'Routine: IXL, Reading, MAP practice. Extra: Olympiad set.', 4, true, true);

  -- Ideas and stars, so the star counter is not empty.
  insert into public.ideas (family_id, child_id, set_number, text, approved, reviewed_at, created_at) values
    (p_family, cid, 1, 'Sharing a pizza equally between friends', true, now() - interval '30 hours', now() - interval '2 days')
    returning id into idea_one;
  insert into public.ideas (family_id, child_id, set_number, text, approved, reviewed_at, created_at) values
    (p_family, cid, 2, 'Measuring ribbon for a gift', true, now() - interval '20 hours', now() - interval '1 day')
    returning id into idea_two;
  insert into public.ideas (family_id, child_id, set_number, text)
    values (p_family, cid, 3, 'Splitting a chocolate bar into pieces');
  insert into public.awards (family_id, child_id, kind, idea_id, award_date) values
    (p_family, cid, 'idea_star', idea_one, current_date - 1),
    (p_family, cid, 'idea_star', idea_two, current_date - 1),
    (p_family, cid, 'day_done', null, current_date - 2),
    (p_family, cid, 'proof_master', null, null);

  -- A few attempts, so the Parent summary has something to show.
  insert into public.attempts (family_id, child_id, mode, problem, correct, first_try, hints_used, error_type, created_at) values
    (p_family, cid, 'practice', '3/4 + 1/6', true, true, 0, null, now() - interval '3 hours'),
    (p_family, cid, 'practice', '8 1/5 - 4 3/4', false, false, 2, 'forgotRegroup', now() - interval '3 hours'),
    (p_family, cid, 'practice', '8 1/5 - 4 3/4', true, false, 1, null, now() - interval '2 hours'),
    (p_family, cid, 'practice', '2/3 × 3/4', true, true, 0, null, now() - interval '1 day'),
    (p_family, cid, 'practice', '5/6 - 1/3', true, true, 0, null, now() - interval '1 day'),
    (p_family, cid, 'tutor', '7/8 - 1/4', true, false, 1, 'noCommonDenominator', now() - interval '2 days'),
    (p_family, cid, 'deep_check', 'R2 asn', true, true, 0, null, now() - interval '1 day'),
    (p_family, cid, 'deep_check', 'R4 spotMistake', true, true, 0, null, now() - interval '1 day'),
    (p_family, cid, 'deep_check', 'R5 draw', false, false, 1, null, now() - interval '1 day');
end
$$;
revoke all on function public.seed_demo_family(uuid) from public, anon, authenticated;

-- ============ The sign-up trigger: demo family for an anonymous user, the same as before for everyone else ============
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  fid uuid;
  fam text := left(btrim(coalesce(new.raw_user_meta_data ->> 'family_name', '')), 60);
  kid text := left(btrim(coalesce(new.raw_user_meta_data ->> 'child_nickname', '')), 30);
begin
  if coalesce(new.is_anonymous, false) then
    insert into public.families (name, is_demo) values ('Demo family', true) returning id into fid;
    insert into public.family_members (family_id, user_id, email) values (fid, new.id, null);
    insert into public.family_secrets (family_id) values (fid);
    perform public.seed_demo_family(fid);
    return new;
  end if;

  insert into public.families (name) values (case when fam = '' then 'My family' else fam end)
    returning id into fid;
  insert into public.family_members (family_id, user_id, email) values (fid, new.id, new.email);
  insert into public.family_secrets (family_id) values (fid);
  if kid <> '' then
    insert into public.children (family_id, nickname) values (fid, kid);
  end if;
  return new;
end
$$;

-- ============ Strangers' photos are never stored ============
drop policy if exists "save family uploads" on public.uploads;
create policy "save family uploads" on public.uploads
  for insert to authenticated
  with check (
    uploads.family_id = (select public.my_family_id())
    and not coalesce((select f.is_demo from public.families f where f.id = uploads.family_id), false)
  );

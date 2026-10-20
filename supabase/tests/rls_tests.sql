-- Row level security tests: three parents (A, B, C), each with their own family.
-- HOW TO RUN: paste the whole file into the Supabase SQL Editor and press Run.
-- It ends with an intentional error whose message is the report; that error also rolls back
-- every row the test made, so your real data is untouched. "ALL PASSED" at the top means success.
-- It needs all migrations applied first, including 20261019100000_ideas_and_stars.sql 20261020100000_today_tasks.sql and 20261020110000_task_notes_and_review.sql and 20261020120000_task_templates.sql, 20261020130000_task_start_time.sql and 20261020140000_day_done.sql and 20261020150000_day_star.sql and 20261020160000_parent_day_star.sql and 20261021100000_star_ledger.sql.

do $$
declare
  a uuid := '00000000-0000-4000-8000-0000000000a1';
  b uuid := '00000000-0000-4000-8000-0000000000b1';
  c uuid := '00000000-0000-4000-8000-0000000000c1';
  sa uuid := '10000000-0000-4000-8000-0000000000a1';
  sb uuid := '10000000-0000-4000-8000-0000000000b1';
  sc uuid := '10000000-0000-4000-8000-0000000000c1';
  fam_a uuid; fam_b uuid;
  kid_a uuid; kid_b uuid;
  idea_a uuid; idea_new uuid; idea_final uuid; task_a uuid;
  report text := '';
  failures int := 0;
  n int;
  ok boolean;
  got timestamptz;
begin
  -- ===== setup (as the database owner) =====
  insert into auth.users (id, email, aud, role, raw_user_meta_data) values
    (a, 'rls-a@example.test', 'authenticated', 'authenticated', '{"family_name":"Family A","child_nickname":"Kid A"}'),
    (b, 'rls-b@example.test', 'authenticated', 'authenticated', '{"family_name":"Family B","child_nickname":"Kid B"}'),
    (c, 'rls-c@example.test', 'authenticated', 'authenticated', '{"family_name":"Family C","child_nickname":"Kid C"}');
  select family_id into fam_a from public.family_members where user_id = a;
  select family_id into fam_b from public.family_members where user_id = b;
  select id into kid_a from public.children where family_id = fam_a;
  select id into kid_b from public.children where family_id = fam_b;
  insert into public.attempts (family_id, child_id, mode, problem, correct) values (fam_b, kid_b, 'practice', '1 + 1', true);
  insert into public.tasks (family_id, child_id, kind, title) values (fam_a, kid_a, 'homework', 'A task') returning id into task_a;
  report := report || E'setup: sign-up trigger made a family and child for each parent\n';
  if fam_a is null or fam_b is null or kid_a is null or kid_b is null then
    raise exception 'SETUP FAILED: the sign-up trigger did not create families. Run the backfill migration.';
  end if;

  -- ===== anon sees nothing =====
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  set local role anon;
  begin perform 1 from public.children; ok := false; exception when others then ok := true; end;
  reset role;
  report := report || case when ok then 'PASS ' else 'FAIL ' end || E'anon cannot read children\n';
  if not ok then failures := failures + 1; end if;

  -- ===== A: own data only =====
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated', 'session_id', sa)::text, true);
  set local role authenticated;
  select count(*) into n from public.children;
  ok := n = 1;
  report := report || case when ok then 'PASS ' else 'FAIL ' end || E'A sees only their own child\n';
  if not ok then failures := failures + 1; end if;

  select count(*) into n from public.attempts where child_id = kid_b;
  ok := n = 0;
  report := report || case when ok then 'PASS ' else 'FAIL ' end || E'A cannot read B''s attempts\n';
  if not ok then failures := failures + 1; end if;

  begin
    insert into public.attempts (family_id, child_id, mode, problem, correct) values (fam_b, kid_b, 'practice', 'x', true);
    ok := false;
  exception when others then ok := true; end;
  report := report || case when ok then 'PASS ' else 'FAIL ' end || E'A cannot insert an attempt into B''s family\n';
  if not ok then failures := failures + 1; end if;

  begin
    insert into public.attempts (family_id, child_id, mode, problem, correct) values (fam_a, kid_b, 'practice', 'x', true);
    ok := false;
  exception when others then ok := true; end;
  report := report || case when ok then 'PASS ' else 'FAIL ' end || E'A cannot attach an attempt to B''s child (composite key)\n';
  if not ok then failures := failures + 1; end if;

  begin
    insert into public.attempts (family_id, child_id, mode, problem, correct) values (fam_a, kid_a, 'practice', '2 + 2', true);
    ok := true;
  exception when others then ok := false; end;
  report := report || case when ok then 'PASS ' else 'FAIL ' end || E'A can save an attempt for their own child without a PIN\n';
  if not ok then failures := failures + 1; end if;

  begin perform 1 from public.family_secrets; ok := false; exception when others then ok := true; end;
  report := report || case when ok then 'PASS ' else 'FAIL ' end || E'A cannot read family_secrets\n';
  if not ok then failures := failures + 1; end if;

  begin
    insert into public.parent_unlocks (session_id, family_id, user_id, expires_at) values (gen_random_uuid(), fam_a, a, now() + interval '1 hour');
    ok := false;
  exception when others then ok := true; end;
  report := report || case when ok then 'PASS ' else 'FAIL ' end || E'A cannot write parent_unlocks directly\n';
  if not ok then failures := failures + 1; end if;

  -- locked: parent-only writes are refused
  begin
    insert into public.children (family_id, nickname) values (fam_a, 'Sneaky');
    ok := false;
  exception when others then ok := true; end;
  report := report || case when ok then 'PASS ' else 'FAIL ' end || E'A cannot add a child while locked\n';
  if not ok then failures := failures + 1; end if;

  update public.tasks set title = 'changed' where id = task_a;
  get diagnostics n = row_count;
  ok := n = 0;
  report := report || case when ok then 'PASS ' else 'FAIL ' end || E'A cannot edit a task while locked\n';
  if not ok then failures := failures + 1; end if;

  perform public.complete_task(task_a);
  reset role;
  select done into ok from public.tasks where id = task_a;
  report := report || case when ok then 'PASS ' else 'FAIL ' end || E'A can tick a task done while locked (complete_task)\n';
  if not ok then failures := failures + 1; end if;

  -- today's tasks: she can add one for her own child, not for another family's, and cannot set the plan
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated', 'session_id', sa)::text, true);
  set local role authenticated;
  begin
    perform public.add_task(kid_a, 'reading', 'Read a chapter');
    ok := true;
  exception when others then ok := false; end;
  reset role;
  select ok and exists (select 1 from public.tasks where title = 'Read a chapter' and added_by = 'child' and priority is null and seen_by_parent = false) into ok;
  report := report || case when ok then 'PASS ' else 'FAIL ' end || E'A can add a task while locked (marked as added by the child)\n';
  if not ok then failures := failures + 1; end if;

  set local role authenticated;
  begin perform public.add_task(kid_b, 'homework', 'Sneaky'); ok := false; exception when others then ok := true; end;
  begin perform public.add_task(kid_a, 'nonsense', 'Bad kind'); ok := false; exception when others then null; end;
  reset role;
  report := report || case when ok then 'PASS ' else 'FAIL ' end || E'A cannot add a task for B''s child or with an unknown type\n';
  if not ok then failures := failures + 1; end if;

  set local role authenticated;
  update public.tasks set priority = 1, priority_date = current_date where family_id = fam_a;
  get diagnostics n = row_count;
  ok := n = 0;
  begin
    insert into public.daily_plans (family_id, child_id, plan_date, screen_time_day) values (fam_a, kid_a, current_date, true);
    ok := false;
  exception when others then null; end;
  reset role;
  report := report || case when ok then 'PASS ' else 'FAIL ' end || E'A cannot set a task priority or a screen-time day while locked\n';
  if not ok then failures := failures + 1; end if;

  set local role authenticated;
  select count(*) into n from public.daily_plans where family_id = fam_b;
  reset role;
  ok := n = 0;
  report := report || case when ok then 'PASS ' else 'FAIL ' end || E'A cannot read B''s daily plans\n';
  if not ok then failures := failures + 1; end if;

  insert into public.task_templates (family_id, child_id, kind, title) values (fam_b, kid_b, 'ixl', 'IXL');
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated', 'session_id', sa)::text, true);
  set local role authenticated;
  select count(*) into n from public.task_templates;
  ok := n = 0;
  begin
    insert into public.task_templates (family_id, child_id, kind, title) values (fam_a, kid_a, 'reading', 'Reading');
    ok := false;
  exception when others then null; end;
  reset role;
  report := report || case when ok then 'PASS ' else 'FAIL ' end || E'A cannot read B''s usual tasks and cannot add one while locked\n';
  if not ok then failures := failures + 1; end if;

  -- the day is reported finished only when nothing is left open, and only for her own child
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated', 'session_id', sa)::text, true);
  set local role authenticated;
  ok := not public.report_day_done(kid_a, current_date);
  begin perform public.report_day_done(kid_b, current_date); ok := false; exception when others then null; end;
  begin perform public.report_day_done(kid_a, current_date + 30); ok := false; exception when others then null; end;
  reset role;
  report := report || case when ok then 'PASS ' else 'FAIL ' end || E'the day is not finished while a task is open, and cannot be reported for B or a far-off date\n';
  if not ok then failures := failures + 1; end if;

  update public.tasks set done = true, done_at = now() where family_id = fam_a;
  set local role authenticated;
  ok := public.report_day_done(kid_a, current_date);
  reset role;
  select ok and exists (select 1 from public.daily_plans where child_id = kid_a and completed_at is not null and completion_seen = false) into ok;
  report := report || case when ok then 'PASS ' else 'FAIL ' end || E'the finished day is reported to the parent as unseen\n';
  if not ok then failures := failures + 1; end if;

  select count(*) into n from public.awards where child_id = kid_a and kind = 'day_done';
  ok := n = 0;
  set local role authenticated;
  begin perform public.give_day_star(kid_a, current_date); ok := false; exception when others then null; end;
  begin
    insert into public.awards (family_id, child_id, kind, award_date) values (fam_a, kid_a, 'day_done', current_date);
    ok := false;
  exception when others then null; end;
  reset role;
  report := report || case when ok then 'PASS ' else 'FAIL ' end || E'finishing the day gives no star by itself; A cannot give it or add it by hand while locked\n';
  if not ok then failures := failures + 1; end if;

  set local role authenticated;
  update public.daily_plans set completion_seen = true where child_id = kid_a;
  get diagnostics n = row_count;
  reset role;
  ok := n = 0;
  report := report || case when ok then 'PASS ' else 'FAIL ' end || E'A cannot mark the finished day as seen while locked\n';
  if not ok then failures := failures + 1; end if;

  set local role authenticated;
  perform public.uncomplete_task(task_a);
  reset role;
  select not exists (select 1 from public.daily_plans where child_id = kid_a and completed_at is not null) into ok;
  report := report || case when ok then 'PASS ' else 'FAIL ' end || E'unticking a task takes back the finished-day report\n';
  if not ok then failures := failures + 1; end if;

  -- tidying: she can hide her finished tasks, not another family's; old finished tasks are deleted
  insert into public.tasks (family_id, child_id, kind, title, done, done_at) values (fam_a, kid_a, 'homework', 'Old finished', true, now() - interval '20 days');
  insert into public.tasks (family_id, child_id, kind, title, done, done_at) values (fam_a, kid_a, 'homework', 'Recent finished', true, now() - interval '2 days');
  insert into public.tasks (family_id, child_id, kind, title) values (fam_a, kid_a, 'homework', 'Still open');
  set local role authenticated;
  perform public.tidy_tasks();
  select count(*) into n from public.tasks where title = 'Old finished';
  ok := n = 0;
  select count(*) into n from public.tasks where title in ('Recent finished', 'Still open');
  ok := ok and n = 2;
  begin perform public.archive_done_tasks(kid_b); ok := false; exception when others then null; end;
  perform public.archive_done_tasks(kid_a);
  reset role;
  select ok and (select archived from public.tasks where title = 'Recent finished')
         and not (select archived from public.tasks where title = 'Still open') into ok;
  report := report || case when ok then 'PASS ' else 'FAIL ' end || E'finished tasks older than 14 days are deleted; clearing hides only finished ones, only for her own child\n';
  if not ok then failures := failures + 1; end if;

  -- ideas: child session can add, cannot approve
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated', 'session_id', sa)::text, true);
  set local role authenticated;
  insert into public.ideas (family_id, child_id, set_number, text) values (fam_a, kid_a, 1, 'Sharing a pizza') returning id into idea_a;

  begin
    insert into public.ideas (family_id, child_id, text, approved) values (fam_a, kid_a, 'Self star', true);
    ok := false;
  exception when others then ok := true; end;
  report := report || case when ok then 'PASS ' else 'FAIL ' end || E'child session cannot insert an idea that is already starred\n';
  if not ok then failures := failures + 1; end if;

  begin
    update public.ideas set approved = true where id = idea_a;
    get diagnostics n = row_count;
    ok := n = 0;
  exception when others then ok := true; end;
  report := report || case when ok then 'PASS ' else 'FAIL ' end || E'child session cannot update approved directly\n';
  if not ok then failures := failures + 1; end if;

  begin perform public.give_star(idea_a, true); ok := false; exception when others then ok := true; end;
  report := report || case when ok then 'PASS ' else 'FAIL ' end || E'give_star is refused while locked\n';
  if not ok then failures := failures + 1; end if;

  -- PIN: set, wrong PIN, right PIN
  perform public.set_parent_pin('1234');
  select public.unlock_parent_mode('0000') into got;
  ok := got is null;
  report := report || case when ok then 'PASS ' else 'FAIL ' end || E'wrong PIN returns null\n';
  if not ok then failures := failures + 1; end if;

  select public.unlock_parent_mode('1234') into got;
  ok := got is not null and got > now();
  report := report || case when ok then 'PASS ' else 'FAIL ' end || E'right PIN unlocks for a time in the future\n';
  if not ok then failures := failures + 1; end if;

  begin
    insert into public.children (family_id, nickname) values (fam_a, 'Second child');
    ok := true;
  exception when others then ok := false; end;
  report := report || case when ok then 'PASS ' else 'FAIL ' end || E'A can add a child once unlocked\n';
  if not ok then failures := failures + 1; end if;

  begin perform public.give_star(idea_a, true); ok := true; exception when others then ok := false; end;
  report := report || case when ok then 'PASS ' else 'FAIL ' end || E'give_star works once unlocked\n';
  if not ok then failures := failures + 1; end if;
  reset role;
  select approved is true and reviewed_at is not null into ok from public.ideas where id = idea_a;
  report := report || case when ok then 'PASS ' else 'FAIL ' end || E'the star was saved with a review time\n';
  if not ok then failures := failures + 1; end if;

  -- the parent gives the day star, once per day
  update public.tasks set done = true, done_at = now() where family_id = fam_a;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated', 'session_id', sa)::text, true);
  set local role authenticated;
  perform public.report_day_done(kid_a, current_date);
  perform public.give_day_star(kid_a, current_date);
  perform public.give_day_star(kid_a, current_date);
  reset role;
  select count(*) = 1 into ok from public.awards where child_id = kid_a and kind = 'day_done';
  report := report || case when ok then 'PASS ' else 'FAIL ' end || E'A (unlocked) gives the day star, and a second try adds none\n';
  if not ok then failures := failures + 1; end if;

  -- star ledger, the one-week rule, and keeping only 3 reviewed ideas
  select count(*) = 1 into ok from public.awards where kind = 'idea_star' and idea_id = idea_a;
  report := report || case when ok then 'PASS ' else 'FAIL ' end || E'giving a star writes it to the ledger\n';
  if not ok then failures := failures + 1; end if;

  insert into public.ideas (family_id, child_id, text, approved, reviewed_at, created_at)
    values (fam_a, kid_a, 'final', true, now() - interval '8 days', now() - interval '9 days') returning id into idea_final;
  insert into public.awards (family_id, child_id, kind, idea_id, award_date, created_at)
    values (fam_a, kid_a, 'idea_star', idea_final, current_date - 8, now() - interval '8 days');
  set local role authenticated;
  begin perform public.give_star(idea_final, false); ok := false; exception when others then ok := true; end;
  reset role;
  select ok and count(*) = 1 into ok from public.awards where idea_id = idea_final;
  report := report || case when ok then 'PASS ' else 'FAIL ' end || E'a star older than a week cannot be taken back\n';
  if not ok then failures := failures + 1; end if;

  insert into public.ideas (family_id, child_id, text) values (fam_a, kid_a, 'fresh') returning id into idea_new;
  set local role authenticated;
  perform public.give_star(idea_new, true);
  reset role;
  select count(*) = 1 into ok from public.awards where idea_id = idea_new;
  set local role authenticated;
  perform public.give_star(idea_new, false);
  reset role;
  select ok and count(*) = 0 into ok from public.awards where idea_id = idea_new;
  set local role authenticated;
  perform public.give_star(idea_new, true);
  reset role;
  select ok and count(*) = 1 into ok from public.awards where idea_id = idea_new;
  report := report || case when ok then 'PASS ' else 'FAIL ' end || E'a star can be taken back and given again within a week\n';
  if not ok then failures := failures + 1; end if;

  insert into public.ideas (family_id, child_id, text, approved, reviewed_at, created_at)
    select fam_a, kid_a, 'old ' || g, true, now() - (g || ' hours')::interval, now() - (g || ' hours')::interval from generate_series(1, 4) g;
  insert into public.awards (family_id, child_id, kind, idea_id, award_date)
    select fam_a, kid_a, 'idea_star', id, current_date from public.ideas where text = 'old 4';
  set local role authenticated;
  perform public.give_star(idea_new, true);
  reset role;
  select count(*) = 3 and bool_or(id = idea_a) into ok from public.ideas where child_id = kid_a and approved is not null;
  report := report || case when ok then 'PASS ' else 'FAIL ' end || E'only the 3 newest reviewed ideas are kept\n';
  if not ok then failures := failures + 1; end if;

  select not exists (select 1 from public.ideas where text = 'old 4') and exists (select 1 from public.awards where kind = 'idea_star' and idea_id is not null and child_id = kid_a and award_date = current_date and idea_id not in (select id from public.ideas)) into ok;
  report := report || case when ok then 'PASS ' else 'FAIL ' end || E'a deleted idea''s star stays in the ledger\n';
  if not ok then failures := failures + 1; end if;

  set local role authenticated;
  delete from public.awards where kind = 'idea_star';
  get diagnostics n = row_count;
  reset role;
  ok := n = 0;
  report := report || case when ok then 'PASS ' else 'FAIL ' end || E'even an unlocked parent cannot delete stars from the app\n';
  if not ok then failures := failures + 1; end if;

  -- expiry: when the unlock runs out, parent-only writes stop again
  update public.parent_unlocks set expires_at = now() - interval '1 minute' where user_id = a;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated', 'session_id', sa)::text, true);
  set local role authenticated;
  begin
    insert into public.children (family_id, nickname) values (fam_a, 'Too late');
    ok := false;
  exception when others then ok := true; end;
  begin perform public.give_star(idea_a, false); ok := false; exception when others then null; end;
  reset role;
  report := report || case when ok then 'PASS ' else 'FAIL ' end || E'an expired unlock blocks parent-only writes\n';
  if not ok then failures := failures + 1; end if;

  -- ===== B: cannot touch A's rows, even in parent mode =====
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated', 'session_id', sb)::text, true);
  set local role authenticated;
  perform public.set_parent_pin('4321');
  perform public.unlock_parent_mode('4321');

  select count(*) into n from public.ideas where family_id = fam_a;
  ok := n = 0;
  report := report || case when ok then 'PASS ' else 'FAIL ' end || E'B cannot read A''s ideas\n';
  if not ok then failures := failures + 1; end if;

  begin perform public.give_star(idea_a, true); ok := false; exception when others then ok := true; end;
  report := report || case when ok then 'PASS ' else 'FAIL ' end || E'B (unlocked) cannot give a star to A''s idea\n';
  if not ok then failures := failures + 1; end if;

  begin perform public.give_day_star(kid_a, current_date); ok := false; exception when others then ok := true; end;
  report := report || case when ok then 'PASS ' else 'FAIL ' end || E'B (unlocked) cannot give a day star to A''s child\n';
  if not ok then failures := failures + 1; end if;

  update public.children set nickname = 'Hacked' where id = kid_a;
  get diagnostics n = row_count;
  ok := n = 0;
  report := report || case when ok then 'PASS ' else 'FAIL ' end || E'B (unlocked) cannot rename A''s child\n';
  if not ok then failures := failures + 1; end if;

  delete from public.children where id = kid_a;
  get diagnostics n = row_count;
  ok := n = 0;
  report := report || case when ok then 'PASS ' else 'FAIL ' end || E'B (unlocked) cannot delete A''s child\n';
  if not ok then failures := failures + 1; end if;

  -- A's task was already ticked above, so put it back to "not done" and check that B's call changes nothing.
  reset role;
  update public.tasks set done = false where id = task_a;
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated', 'session_id', sb)::text, true);
  set local role authenticated;
  perform public.complete_task(task_a);
  reset role;
  select not done into ok from public.tasks where id = task_a;
  report := report || case when ok then 'PASS ' else 'FAIL ' end || E'B cannot tick A''s task\n';
  if not ok then failures := failures + 1; end if;

  -- ===== C: five wrong PINs lock the PIN =====
  perform set_config('request.jwt.claims', json_build_object('sub', c, 'role', 'authenticated', 'session_id', sc)::text, true);
  set local role authenticated;
  perform public.set_parent_pin('1111');
  for i in 1..5 loop
    perform public.unlock_parent_mode('9999');
  end loop;
  begin perform public.unlock_parent_mode('1111'); ok := false; exception when others then ok := true; end;
  reset role;
  report := report || case when ok then 'PASS ' else 'FAIL ' end || E'five wrong PINs lock out even the right PIN\n';
  if not ok then failures := failures + 1; end if;

  -- The error below is on purpose: it shows the report and rolls everything back.
  raise exception E'%\n%', case when failures = 0 then 'ALL PASSED (this error is expected and cleans up the test data)' else failures || ' TEST(S) FAILED' end, report;
end
$$;

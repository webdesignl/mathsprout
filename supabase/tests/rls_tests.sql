-- Row level security tests: three parents (A, B, C), each with their own family.
-- HOW TO RUN: paste the whole file into the Supabase SQL Editor and press Run.
-- It ends with an intentional error whose message is the report; that error also rolls back
-- every row the test made, so your real data is untouched. "ALL PASSED" at the top means success.
-- It needs all migrations applied first, including 20261019100000_ideas_and_stars.sql.

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
  idea_a uuid; task_a uuid;
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

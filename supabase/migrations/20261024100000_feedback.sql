-- Feedback from demo visitors (and real families): a star rating, an optional note and an optional "who are you".
-- Write-only for the app: the app can add feedback but never read, change or delete it. The owner reads it in the
-- Supabase dashboard (Table Editor > feedback).

-- family_id has NO foreign key on purpose. A demo family is deleted after 24 hours (delete_old_demo_families), and a
-- foreign key with "on delete cascade" would delete the feedback with it. is_demo tells the two kinds apart later.
create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null,
  is_demo boolean not null default false,
  rating smallint not null check (rating between 1 and 5),
  who text check (who in ('recruiter', 'teacher', 'parent', 'developer', 'other')),
  message text check (char_length(message) <= 1000),
  created_at timestamptz not null default now()
);

alter table public.feedback enable row level security;

-- Only the table's own insert is open to a signed-in user; reading, editing and deleting stay closed.
revoke all on public.feedback from anon, authenticated;
grant insert on public.feedback to authenticated;

-- How many pieces of feedback a family sent in the last day. A security definer function, because the app has no
-- permission to read the table (a policy cannot count rows it cannot see).
create or replace function public.feedback_last_day(p_family uuid)
returns int language sql stable security definer set search_path = '' as $$
  select count(*)::int from public.feedback f where f.family_id = p_family and f.created_at > now() - interval '1 day'
$$;
revoke all on function public.feedback_last_day(uuid) from public, anon;
grant execute on function public.feedback_last_day(uuid) to authenticated;

-- A signed-in user may add feedback for their own family only, say truthfully whether it is a demo family, and send
-- at most 5 a day (so one visitor cannot flood the table).
create policy "add family feedback" on public.feedback
  for insert to authenticated
  with check (
    feedback.family_id = (select public.my_family_id())
    and feedback.is_demo = coalesce((select f.is_demo from public.families f where f.id = feedback.family_id), false)
    and public.feedback_last_day(feedback.family_id) < 5
  );

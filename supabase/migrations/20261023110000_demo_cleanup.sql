-- Demo sandboxes live for 24 hours. This deletes the old ones, every hour.

-- Deletes demo families older than 24 hours first (that removes their members, secrets, unlocks, children and
-- everything linked to the children: tasks, attempts, stars, ideas, summaries), then anonymous users older than 24
-- hours. Deleting only the user would not be enough: families has no foreign key to auth.users, so the family would
-- be left behind. Real families (is_demo = false) and real users are never touched.
create or replace function public.delete_old_demo_families()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  removed_families int;
  removed_users int;
begin
  delete from public.families where is_demo and created_at < now() - interval '24 hours';
  get diagnostics removed_families = row_count;

  delete from auth.users where is_anonymous and created_at < now() - interval '24 hours';
  get diagnostics removed_users = row_count;

  return jsonb_build_object('families', removed_families, 'users', removed_users);
end
$$;

-- Only the database itself (pg_cron, the owner) may run it. No signed-in or signed-out visitor can.
revoke all on function public.delete_old_demo_families() from public, anon, authenticated;

-- Run it every hour with pg_cron, where the extension exists (Supabase has it). In a plain test database it is skipped.
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    -- scheduling a job with the same name again replaces it, so this is safe to run twice
    perform cron.schedule('delete-old-demo-families', '0 * * * *', 'select public.delete_old_demo_families()');
  end if;
end
$$;

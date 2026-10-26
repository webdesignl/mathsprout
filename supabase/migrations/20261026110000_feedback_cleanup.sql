-- Feedback and problem reports are kept for 30 days, then deleted (once a day).
-- The 24-hour demo cleanup never touches them: that only removes the demo family and its sample data.

create or replace function public.delete_old_feedback()
returns int language plpgsql security definer set search_path = '' as $$
declare
  removed int;
begin
  delete from public.feedback where created_at < now() - interval '30 days';
  get diagnostics removed = row_count;
  return removed;
end
$$;

-- Only the database itself (pg_cron, the owner) may run it.
revoke all on function public.delete_old_feedback() from public, anon, authenticated;

-- Every day at 03:00, where pg_cron exists (Supabase has it). Skipped in a plain test database.
-- Scheduling a job with the same name again replaces it, so this is safe to run twice.
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.schedule('delete-old-feedback', '0 3 * * *', 'select public.delete_old_feedback()');
  end if;
end
$$;

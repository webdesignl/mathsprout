-- A parent can give each task a start time for today. It counts only on the day of priority_date.
alter table public.tasks add column if not exists start_time time;

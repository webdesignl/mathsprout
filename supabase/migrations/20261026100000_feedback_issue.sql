-- Feedback can now carry a problem report: what went wrong, and how bad it was.
-- Same rules as the rest of the table: the app can only insert; the owner reads it in the Supabase dashboard.
alter table public.feedback
  add column issue text check (char_length(issue) <= 1000),
  add column severity text check (severity in ('low', 'medium', 'high')),
  -- A severity only makes sense with an issue.
  add constraint feedback_severity_needs_issue check (severity is null or issue is not null);

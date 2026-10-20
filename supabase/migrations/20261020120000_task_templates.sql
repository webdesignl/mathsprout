-- "My usual tasks": a family sets them once in parent mode, and she picks one with a tap
-- (and types only the page numbers) instead of typing the whole task.

create table public.task_templates (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null,
  child_id uuid not null,
  kind text not null check (kind in ('ixl', 'homework', 'map', 'olympiad', 'testPrep', 'reading')),
  title text not null check (char_length(title) between 1 and 80),
  minutes int check (minutes between 1 and 240),
  -- true for things like a homework book, where she types the page numbers each time.
  ask_detail boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  foreign key (child_id, family_id) references public.children(id, family_id) on delete cascade
);
create index task_templates_child_idx on public.task_templates (child_id, sort_order);

alter table public.task_templates enable row level security;

create policy "read family templates" on public.task_templates
  for select to authenticated using (family_id = (select public.my_family_id()));
create policy "parent adds templates" on public.task_templates
  for insert to authenticated
  with check (family_id = (select public.my_family_id()) and (select public.is_parent_unlocked()));
create policy "parent edits templates" on public.task_templates
  for update to authenticated
  using (family_id = (select public.my_family_id()) and (select public.is_parent_unlocked()))
  with check (family_id = (select public.my_family_id()));
create policy "parent deletes templates" on public.task_templates
  for delete to authenticated
  using (family_id = (select public.my_family_id()) and (select public.is_parent_unlocked()));
revoke all on public.task_templates from anon;

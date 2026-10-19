-- Awards a child earns while practicing (for now: a Proof Master, 3 correct proofs in a row).
-- Shown on the home screen with the parent's idea stars. The child's session adds them, as with attempts;
-- nobody edits one, and only parent mode can delete.

create table public.awards (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null,
  child_id uuid not null,
  kind text not null check (kind in ('proof_master')),
  created_at timestamptz not null default now(),
  foreign key (child_id, family_id) references public.children(id, family_id) on delete cascade
);
create index awards_family_child_idx on public.awards (family_id, child_id);

alter table public.awards enable row level security;

create policy "read family awards" on public.awards
  for select to authenticated using (family_id = (select public.my_family_id()));
create policy "save family awards" on public.awards
  for insert to authenticated with check (family_id = (select public.my_family_id()));
create policy "parent deletes awards" on public.awards
  for delete to authenticated
  using (family_id = (select public.my_family_id()) and (select public.is_parent_unlocked()));

revoke update on public.awards from authenticated, anon;
revoke all on public.awards from anon;

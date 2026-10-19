-- A cute animal for each child, picked by a parent. It is only an emoji, not a photo or a name.
alter table public.children
  add column if not exists avatar text check (avatar is null or char_length(avatar) between 1 and 8);

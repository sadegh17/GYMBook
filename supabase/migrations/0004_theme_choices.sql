-- Add new color themes (black, red, purple, green) to the allowed profiles.theme set.
alter table public.profiles
  drop constraint if exists profiles_theme_check;

alter table public.profiles
  add constraint profiles_theme_check
  check (theme in ('sadeq','saghar','black','red','purple','green'));

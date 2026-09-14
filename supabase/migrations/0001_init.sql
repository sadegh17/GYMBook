-- GYMBook — مهاجرت اولیه (Task 2)
-- یک‌بار در داشبورد Supabase → SQL Editor اجرا می‌شود (بخش ۱ از docs/RUNBOOK.md).
-- پس از اجرای موفق، این فایل را دوباره اجرا نکنید (create table بدون if not exists است).

create extension if not exists pgcrypto;

create table public.programs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  created_by uuid,
  created_at timestamptz default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text,
  role text not null default 'member' check (role in ('admin','member')),
  weight_kg numeric not null default 70,
  program_id uuid references public.programs(id),
  theme text not null default 'sadeq' check (theme in ('sadeq','saghar')),
  approved boolean not null default false,
  created_at timestamptz default now()
);

create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  name_fa text not null,
  name_en text,
  gif_url text, page_url text, how_to text, tip text,
  met numeric not null default 5,
  sec_per_rep numeric not null default 3,
  created_by uuid,
  created_at timestamptz default now()
);

create table public.program_days (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  day_key text not null check (day_key in ('sat','sun','mon','tue','wed','thu','fri')),
  day_label text not null, focus text, title text, sub text,
  sort int not null default 0,
  unique (program_id, day_key)
);

create table public.program_items (
  id uuid primary key default gen_random_uuid(),
  day_id uuid not null references public.program_days(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id),
  section text not null check (section in ('warm','main','cool')),
  sets int not null default 3,
  reps int not null default 12,
  rest_sec int not null default 45,
  sort int not null default 0
);

create table public.checks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  date date not null,
  day_key text not null,
  item_id uuid not null references public.program_items(id) on delete cascade,
  kcal numeric not null default 0,
  created_at timestamptz default now(),
  unique (user_id, date, item_id)
);

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
$$;

-- آیا هنوز هیچ کاربری نیست؟ (برای صفحه ورود — به anon هم مجاز)
create or replace function public.setup_needed() returns boolean
language sql stable security definer set search_path = public as $$
  select not exists (select 1 from public.profiles)
$$;
grant execute on function public.setup_needed() to anon, authenticated;

-- اولین اکانت = ادمین؛ بقیه member در انتظار تایید
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, email, role, approved)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email,'@',1)),
    new.email,
    case when (select count(*) from public.profiles) = 0 then 'admin' else 'member' end,
    (select count(*) from public.profiles) = 0
  );
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- درصد پیشرفت و کالری هر روز (پایه صفحه گزارش)
-- security_invoker: بامجوز فراخوان اجرا می‌شود تا RLS جدول checks اعمال شود
create view public.v_day_progress with (security_invoker = true) as
select c.user_id, c.date, c.day_key,
  count(*) filter (where i.section = 'main') as main_done,
  coalesce(sum(c.kcal), 0) as kcal,
  (select count(*) from public.program_items mi
     join public.program_days md on md.id = mi.day_id
     join public.profiles p on p.program_id = md.program_id
    where p.id = c.user_id and md.day_key = c.day_key and mi.section = 'main') as main_total
from public.checks c
join public.program_items i on i.id = c.item_id
group by c.user_id, c.date, c.day_key;

alter table public.profiles enable row level security;
alter table public.exercises enable row level security;
alter table public.programs enable row level security;
alter table public.program_days enable row level security;
alter table public.program_items enable row level security;
alter table public.checks enable row level security;

create policy "profiles: self read" on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_admin());
create policy "profiles: self update" on public.profiles
  for update to authenticated using (id = auth.uid())
  with check (
    id = auth.uid()
    and role = (select p.role from public.profiles p where p.id = auth.uid())
    and approved = (select p.approved from public.profiles p where p.id = auth.uid())
    and email = (select p.email from public.profiles p where p.id = auth.uid())
    and program_id is not distinct from (select p.program_id from public.profiles p where p.id = auth.uid())
  );
create policy "profiles: admin manages" on public.profiles
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "exercises: read all authed, write admin" on public.exercises
  for select to authenticated using (true);
create policy "exercises: admin write" on public.exercises
  for insert to authenticated with check (public.is_admin());
create policy "exercises: admin update" on public.exercises
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "exercises: admin delete" on public.exercises
  for delete to authenticated using (public.is_admin());

create policy "programs: read authed" on public.programs for select to authenticated using (true);
create policy "programs: admin write" on public.programs for insert to authenticated with check (public.is_admin());
create policy "programs: admin update" on public.programs for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "programs: admin delete" on public.programs for delete to authenticated using (public.is_admin());

create policy "days: read authed" on public.program_days for select to authenticated using (true);
create policy "days: admin write" on public.program_days for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "items: read authed" on public.program_items for select to authenticated using (true);
create policy "items: admin write" on public.program_items for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "checks: own or admin read" on public.checks
  for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "checks: own insert" on public.checks
  for insert to authenticated with check (user_id = auth.uid());
create policy "checks: own delete" on public.checks
  for delete to authenticated using (user_id = auth.uid());

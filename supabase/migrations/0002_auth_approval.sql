-- GYMBook — مهاجرت ۰۰۰۲: تایید حساب کاربری (auth approval)
-- یک‌بار در داشبورد Supabase → SQL Editor اجرا می‌شود (بخش ۱.۴ از docs/RUNBOOK.md).
-- پیش‌نیاز: اجرای ۰۰۰۱_init.sql. این فایل را دوباره اجرا نکنید.

-- ۱) ستون وضعیت روی پروفایل: pending → approved/rejected
alter table public.profiles
  add column if not exists status text not null default 'pending'
  check (status in ('pending','approved','rejected'));

-- backfill: کاربرانی که قبلاً approved بودند ← status='approved'
update public.profiles set status = 'approved' where approved = true;

-- یکپارچگی: approved دقیقاً معادل status='approved' باشد (جلوگیری از drift)
alter table public.profiles
  drop constraint if exists profiles_approved_matches_status;
alter table public.profiles
  add constraint profiles_approved_matches_status check (approved = (status = 'approved'));

-- ۲) کاربر تازه: اولین اکانت = ادمینِ تاییدشده؛ بقیه pending
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  is_first boolean;
begin
  is_first := (select count(*) from public.profiles) = 0;
  insert into public.profiles (id, name, email, role, approved, status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email,'@',1)),
    new.email,
    case when is_first then 'admin' else 'member' end,
    is_first,
    case when is_first then 'approved' else 'pending' end
  );
  return new;
end; $$;

-- ۳) کمک‌تابع: آیا کاربرِ جاری تایید شده؟ (برای RLS)
create or replace function public.is_approved() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and approved)
$$;
grant execute on function public.is_approved() to authenticated;

-- ۴) سفت‌کردن RLS: کاربرِ تایید‌نشده هیچ داده‌ای نخواند/ننویسد (دفاع در عمق)
--    پروفایلِ خودش را می‌خواند تا صفحهٔ «در انتظار تایید» کار کند.

-- exercises
drop policy if exists "exercises: read all authed, write admin" on public.exercises;
create policy "exercises: read approved" on public.exercises
  for select to authenticated using (public.is_approved());

-- programs
drop policy if exists "programs: read authed" on public.programs;
create policy "programs: read approved" on public.programs
  for select to authenticated using (public.is_approved());

-- program_days
drop policy if exists "days: read authed" on public.program_days;
create policy "days: read approved" on public.program_days
  for select to authenticated using (public.is_approved());

-- program_items
drop policy if exists "items: read authed" on public.program_items;
create policy "items: read approved" on public.program_items
  for select to authenticated using (public.is_approved());

-- checks
drop policy if exists "checks: own or admin read" on public.checks;
create policy "checks: own or admin read" on public.checks
  for select to authenticated using ((user_id = auth.uid() or public.is_admin()) and public.is_approved());
drop policy if exists "checks: own insert" on public.checks;
create policy "checks: own insert" on public.checks
  for insert to authenticated with check (user_id = auth.uid() and public.is_approved());
drop policy if exists "checks: own delete" on public.checks;
create policy "checks: own delete" on public.checks
  for delete to authenticated using (user_id = auth.uid() and public.is_approved());

-- ۵) خود-بروزرسانی پروفایل: status را هم مثل approved قفل کن
--    (کاربر نتواند خودش را تایید/رد کند؛ فقط از طریق پنل ادمین).
drop policy if exists "profiles: self update" on public.profiles;
create policy "profiles: self update" on public.profiles
  for update to authenticated using (id = auth.uid())
  with check (
    id = auth.uid()
    and role = (select p.role from public.profiles p where p.id = auth.uid())
    and approved = (select p.approved from public.profiles p where p.id = auth.uid())
    and status = (select p.status from public.profiles p where p.id = auth.uid())
    and email = (select p.email from public.profiles p where p.id = auth.uid())
    and program_id is not distinct from (select p.program_id from public.profiles p where p.id = auth.uid())
  );

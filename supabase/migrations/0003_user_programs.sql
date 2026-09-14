-- GYMBook — مهاجرت ۰۰۰۳: برنامه‌های شخصی کاربر
-- اجرای مجدد این فایل بی‌خطر است (idempotent). بعد از 0001_init.sql و
-- 0002_auth_approval.sql اجرا شود.
-- هماهنگ با مهاجرت تأیید حساب: همهٔ policyهای خواندن/نوشتنِ برنامه هم
-- «دروازهٔ تأیید» (is_approved) و هم «مالکیت» را رعایت می‌کنند.

-- 1) programs: مالکیت + حذف نرم
alter table public.programs
  add column if not exists owner_id uuid references public.profiles(id) on delete cascade,
  add column if not exists is_deleted boolean not null default false;
create index if not exists programs_owner_active_idx
  on public.programs (owner_id) where is_deleted = false;

-- 2) بخش‌های با نام دلخواه
create table if not exists public.program_sections (
  id uuid primary key default gen_random_uuid(),
  day_id uuid not null references public.program_days(id) on delete cascade,
  name text not null,
  sort int not null default 0
);

-- 3) پیوند آیتم‌ها به بخش‌ها
alter table public.program_items
  add column if not exists section_id uuid references public.program_sections(id) on delete cascade;

-- 4) نگاشت دادهٔ موجود: سه enum → سه سطر program_sections در هر روز
--    فقط اگر ستون قدیمی `section` هنوز وجود دارد (یعنی این بخش قبلاً اجرا نشده).
do $$
declare r record; s_id uuid;
begin
  if exists (select 1 from information_schema.columns
             where table_schema='public' and table_name='program_items' and column_name='section') then
    for r in
      select day_id, section,
             case section when 'warm' then 0 when 'main' then 1 else 2 end as ord
      from program_items
      group by day_id, section, ord
      order by day_id, ord
    loop
      insert into program_sections (day_id, name, sort)
      values (r.day_id,
        case r.section when 'warm' then 'گرم‌کردن' when 'main' then 'تمرین اصلی' else 'سردکردن' end,
        r.ord)
      returning id into s_id;
      update program_items set section_id = s_id
        where day_id = r.day_id and section = r.section;
    end loop;

    insert into program_sections (day_id, name, sort)
      select distinct i.day_id, 'عمومی', 9
      from program_items i where i.section_id is null;
    update program_items i set section_id = s.id
      from program_sections s
      where i.section_id is null and i.day_id = s.day_id and s.name = 'عمومی';
  end if;
end $$;

-- حذف view قدیمی که به ستون `section` وابسته است (در بخش ۱۲ مجدد ساخته می‌شود)
drop view if exists public.v_day_progress;
-- حذف ستون قدیمی؛ اگر نبود خطا نمی‌دهد.
alter table public.program_items drop column if exists section;
-- اگر هنوز section_id NULL است (نباید باشد) یک بخش عمومی بساز و وصل کن
insert into program_sections (day_id, name, sort)
  select distinct i.day_id, 'عمومی', 9
  from program_items i where i.section_id is null;
update program_items i set section_id = s.id
  from program_sections s
  where i.section_id is null and i.day_id = s.day_id and s.name = 'عمومی';
alter table public.program_items alter column section_id set not null;

-- 5) checks: اسنپ‌شات + حذف امن آیتم
alter table public.checks
  add column if not exists exercise_name text,
  add column if not exists sets int;

update checks c set
  exercise_name = e.name_fa,
  sets = i.sets
from program_items i join exercises e on e.id = i.exercise_id
where c.item_id = i.id and c.exercise_name is null;

alter table public.checks drop constraint if exists checks_item_id_fkey;
alter table public.checks
  add constraint checks_item_id_fkey
  foreign key (item_id) references public.program_items(id) on delete set null;

-- 6) توابع کمک‌دسترسی (is_approved() و is_admin() از مهاجرت‌های قبل موجودند)
create or replace function public.can_write_program(pid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.programs
    where id = pid and (public.is_admin() or (owner_id = auth.uid() and public.is_approved())))
$$;
create or replace function public.can_write_day(did uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.program_days d
    where d.id = did and public.can_write_program(d.program_id))
$$;
create or replace function public.can_read_program(pid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.programs
    where id = pid and is_deleted = false
      and (public.is_admin() or owner_id is null or owner_id = auth.uid()))
$$;
create or replace function public.can_read_day(did uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.program_days d
    where d.id = did and public.can_read_program(d.program_id))
$$;
grant execute on function public.can_write_program(uuid) to authenticated;
grant execute on function public.can_write_day(uuid) to authenticated;
grant execute on function public.can_read_program(uuid) to authenticated;
grant execute on function public.can_read_day(uuid) to authenticated;

-- 7) تریگر سقف ۳ برنامه (فقط برنامه شخصی؛ ادمین/سراسری مستثنی)
create or replace function public.enforce_program_limit() returns trigger
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if new.owner_id is null then return new; end if;
  select
    (select count(*) from public.programs
       where owner_id = new.owner_id and is_deleted = false)
    + (select count(*) from public.profiles p
       join public.programs g on g.id = p.program_id
       where p.id = new.owner_id and g.owner_id is null and g.is_deleted = false)
  into n;
  if n >= 3 then raise exception 'USER_PROGRAM_LIMIT'; end if;
  return new;
end $$;
drop trigger if exists programs_limit_before_insert on public.programs;
create trigger programs_limit_before_insert before insert on public.programs
  for each row execute function public.enforce_program_limit();

-- 8) RLS — programs (خواندن = تأیید + دیده‌شدنِ مالک/سراسری؛ نوشتن = مالک تأییدشده یا ادمین)
drop policy if exists "programs: read authed" on public.programs;
drop policy if exists "programs: read approved" on public.programs;
drop policy if exists "programs: read visible" on public.programs;
drop policy if exists "programs: read" on public.programs;
drop policy if exists "programs: admin write" on public.programs;
drop policy if exists "programs: admin update" on public.programs;
drop policy if exists "programs: admin delete" on public.programs;
drop policy if exists "programs: owner or admin insert" on public.programs;
drop policy if exists "programs: owner or admin update" on public.programs;
drop policy if exists "programs: insert" on public.programs;
drop policy if exists "programs: update" on public.programs;
drop policy if exists "programs: delete" on public.programs;
create policy "programs: read" on public.programs
  for select to authenticated using (public.is_approved() and public.can_read_program(id));
create policy "programs: insert" on public.programs
  for insert to authenticated with check (public.is_admin() or (owner_id = auth.uid() and public.is_approved()));
create policy "programs: update" on public.programs
  for update to authenticated using (public.can_write_program(id))
  with check (public.can_write_program(id));
create policy "programs: delete" on public.programs
  for delete to authenticated using (public.is_admin());

-- 9) RLS — program_sections
alter table public.program_sections enable row level security;
drop policy if exists "sections: read authed" on public.program_sections;
drop policy if exists "sections: owner write" on public.program_sections;
drop policy if exists "sections: read" on public.program_sections;
drop policy if exists "sections: write" on public.program_sections;
create policy "sections: read" on public.program_sections
  for select to authenticated using (public.is_approved() and public.can_read_day(day_id));
create policy "sections: write" on public.program_sections
  for all to authenticated using (public.can_write_day(day_id))
  with check (public.can_write_day(day_id));

-- 10) RLS — program_days / program_items: خواندن تأیید+دید، نوشتن مالک/ادمین
drop policy if exists "days: read authed" on public.program_days;
drop policy if exists "days: read approved" on public.program_days;
drop policy if exists "days: admin write" on public.program_days;
drop policy if exists "days: owner write" on public.program_days;
drop policy if exists "days: read" on public.program_days;
drop policy if exists "days: write" on public.program_days;
create policy "days: read" on public.program_days
  for select to authenticated using (public.is_approved() and public.can_read_program(program_id));
create policy "days: write" on public.program_days
  for all to authenticated using (public.can_write_program(program_id))
  with check (public.can_write_program(program_id));

drop policy if exists "items: read authed" on public.program_items;
drop policy if exists "items: read approved" on public.program_items;
drop policy if exists "items: admin write" on public.program_items;
drop policy if exists "items: owner write" on public.program_items;
drop policy if exists "items: read" on public.program_items;
drop policy if exists "items: write" on public.program_items;
create policy "items: read" on public.program_items
  for select to authenticated using (public.is_approved() and public.can_read_day(day_id));
create policy "items: write" on public.program_items
  for all to authenticated using (public.can_write_day(day_id))
  with check (public.can_write_day(day_id));

-- 11) RLS — profiles: خود-بروزرسانی؛ lockهای ۰۰۰۲ (status/approved/role/email) حفظ شد
--     و فقط تغییر program_id به برنامهٔ قابل‌دیده (سراسری یا مالک خود) مجاز شد.
drop policy if exists "profiles: self update" on public.profiles;
create policy "profiles: self update" on public.profiles
  for update to authenticated using (id = auth.uid())
  with check (
    id = auth.uid()
    and role = (select p.role from public.profiles p where p.id = auth.uid())
    and approved = (select p.approved from public.profiles p where p.id = auth.uid())
    and status = (select p.status from public.profiles p where p.id = auth.uid())
    and email = (select p.email from public.profiles p where p.id = auth.uid())
    and (
      program_id is not distinct from (select p.program_id from public.profiles p where p.id = auth.uid())
      or exists (select 1 from public.programs g
        where g.id = program_id and g.is_deleted = false
          and (g.owner_id is null or g.owner_id = auth.uid()))
    )
  );

-- 12) view — درصد تکمیل روی «همهٔ آیتم‌ها» (نام ستون‌ها main_done/main_total حفظ شد)
create or replace view public.v_day_progress with (security_invoker = true) as
select c.user_id, c.date, c.day_key,
  count(*) as main_done,
  coalesce(sum(c.kcal), 0) as kcal,
  (select count(*) from public.program_items mi
     join public.program_days md on md.id = mi.day_id
     join public.profiles p on p.program_id = md.program_id
    where p.id = c.user_id and md.day_key = c.day_key) as main_total
from public.checks c
group by c.user_id, c.date, c.day_key;
grant select on public.v_day_progress to authenticated;

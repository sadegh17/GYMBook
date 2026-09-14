# برنامه‌های شخصی کاربر — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** به هر کاربر اجازه دهد حداکثر ۳ برنامه تمرینی خودش را بسازد (روزها، عنوان هر روز، دسته‌های با نام دلخواه، حرکت از بانک با ست/تکرار)، پیش‌فرض ست کند، در «امروز» انتخاب کند، و لاگ‌ها با حذف برنامه حفظ شوند.

**Architecture:** توسعه همان جدول‌های `programs/program_days/program_items/checks` با ستون `owner_id` + `is_deleted` (حذف نرم) و جدول جدید `program_sections` برای دسته‌های نام‌دلخواه. امن/دسترسی کامل در RLS با توابع کمکی `can_write_program/can_write_day`؛ سقف ۳ با تریگر دیتابیسی + کمک‌توابع خالص سمت کلاینت برای نمایش. یک سازندهٔ مشترک `ProgramBuilder` هم به‌کاربردهای `/programs` (کاربر) و `/admin/programs` (ادمین) سرو می‌کند.

**Tech Stack:** React 18 + Vite (JS)، React Router 6 (HashRouter)، @tanstack/react-query 5، @supabase/supabase-js 2، Vitest + React Testing Library، Supabase/Postgres RLS.

**Spec:** `docs/superpowers/specs/2026-09-15-user-programs-design.md`

## Global Constraints

- UI کاملاً فارسی/RTL؛ اعداد نمایشی با `fa()`؛ همان پالت و تم‌های `sadeq|saghar`.
- مسیریابی فقط HashRouter. تنها لایه امنیتی داده = **RLS** (کلید publishable عمومی است).
- مهاجرت‌ها **یک‌بار** در Supabase SQL Editor اجرا می‌شوند (RUNBOOK)؛ هرگز اجرای مجدد `create table` بدون `if not exists`.
- نوشتن روی برنامه فقط برای مالک (`owner_id = auth.uid()`) یا ادمین؛ برنامه سراسری `owner_id=null`.
- سقف برنامه = **۳** (فعال: شخصیِ بدون `is_deleted` + برنامه سراسریِ منطبق با `profiles.program_id`). تکیه‌گاه نهایی تریگر DB است؛ کلاینت فقط پیش‌بینی/نمایش می‌کند.
- نام ستون‌های خروجی `v_day_progress` ثابت می‌ماند (`main_done`, `main_total`, `kcal`) تا مصرف‌کننده‌های گزارش نشکنند؛ فقط **معنا** عوض می‌شود (شمارش همهٔ آیتم‌ها).
- هر task انتها: `npm test` سبز + commit با پیشوند `feat:`/`fix:`/`chore:`/`docs:`/`test:`.
- Node ≥ 18. تست: `npm test` (کل) یا `npx vitest run <path>`.

## File Structure

```
supabase/
  migrations/0001_init.sql          (موجود)
  migrations/0002_user_programs.sql  (ساخت — schema + data + RLS + trigger + view)
  seed.sql                           (اصلاح: برنامه‌های سراسری حالا program_sections/section_id دارند)
docs/RUNBOOK.md                      (افزودن اجرای 0002 + شمارش policy انتظار)
src/
  lib/programDays.js   (ساخت — DAY_KEYS/LABELS/dayLabel/todayDayKey/buildDaysForKeys) + test
  lib/programSlots.js  (ساخت — MAX=3/countActivePrograms/isProgramLimitError/programLimitErrorFa) + test
  lib/programMove.js   (اصلاح — گروه‌بندی با section_id به‌جای section) + test موجود
  lib/programs.js      (ساخت — fetch/create/softDelete/setDefault; DB-calling)
  lib/api.js           (اصلاح — fetchProgramTree شامل sections؛ toggleCheck اسنپ‌شات) + test موجود
  components/ProgramBuilder.jsx (ساخت — سازنده مشترک) + test
  pages/Programs.jsx   (ساخت — «برنامه‌های من») + test
  pages/admin/Programs.jsx (اصلاح — پوستهٔ نازک روی ProgramBuilder) + test موجود
  pages/Today.jsx      (اصلاح — انتخاب‌گر برنامه + بخش‌های داینامیک) + test
  components/ExerciseHistory.jsx (اصلاح — fallback اسنپ‌شات) + test موجود
  App.jsx, components/Layout.jsx (اصلاح — مسیر/لینک /programs)
```

---

### Task 1: کمک‌توابع خالص روزها و سقف برنامه

**Files:**
- Create: `src/lib/programDays.js`
- Create: `src/lib/programSlots.js`
- Test: `src/lib/__tests__/programDays.test.js`
- Test: `src/lib/__tests__/programSlots.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `DAY_KEYS: string[]` = `['sat','sun','mon','tue','wed','thu','fri']`
  - `DAY_LABELS: Record<string,string>`، `dayLabel(key): string`
  - `todayDayKey(now?: Date): string` (شنبه‌محور، هر ۷ روز)
  - `buildDaysForKeys(keys: string[]): Array<{day_key,day_label,title,focus,sort}>`
  - `MAX_PROGRAMS = 3`
  - `countActivePrograms(owned: any[], assignedId: string|null): number`
  - `isProgramLimitError(err: unknown): boolean`، `programLimitErrorFa(err: unknown): string`

- [ ] **Step 1: نوشتن تست شکسته برای programDays**

`src/lib/__tests__/programDays.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { DAY_KEYS, dayLabel, todayDayKey, buildDaysForKeys } from '../programDays.js'

describe('programDays', () => {
  it('has 7 keys and Persian labels', () => {
    expect(DAY_KEYS).toEqual(['sat','sun','mon','tue','wed','thu','fri'])
    expect(dayLabel('sat')).toBe('شنبه')
    expect(dayLabel('fri')).toBe('جمعه')
  })
  it('todayDayKey maps Sat=6 and Sun=0 and Thu=4', () => {
    expect(todayDayKey(new Date(2026, 8, 12))).toBe('sat') // Sat
    expect(todayDayKey(new Date(2026, 8, 13))).toBe('sun') // Sun
    expect(todayDayKey(new Date(2026, 8, 17))).toBe('thu') // Thu
  })
  it('buildDaysForKeys returns rows with label, title, sort', () => {
    const rows = buildDaysForKeys(['mon','fri'])
    expect(rows).toEqual([
      { day_key: 'mon', day_label: 'دوشنبه', title: 'دوشنبه', focus: null, sort: 1 },
      { day_key: 'fri', day_label: 'جمعه', title: 'جمعه', focus: null, sort: 2 },
    ])
  })
  it('buildDaysForKeys ignores unknown keys', () => {
    expect(buildDaysForKeys(['nope'])).toEqual([])
  })
})
```

- [ ] **Step 2: نوشتن تست شکسته برای programSlots**

`src/lib/__tests__/programSlots.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { MAX_PROGRAMS, countActivePrograms, isProgramLimitError, programLimitErrorFa } from '../programSlots.js'

describe('programSlots', () => {
  it('MAX is 3', () => expect(MAX_PROGRAMS).toBe(3))
  it('counts owned + assigned global together', () => {
    const owned = [{ id: 'a' }, { id: 'b' }]
    expect(countActivePrograms(owned, 'global1')).toBe(3)
  })
  it('does not double-count when assigned program is the owned one', () => {
    expect(countActivePrograms([{ id: 'a' }], 'a')).toBe(1)
  })
  it('null assigned adds nothing', () => {
    expect(countActivePrograms([{ id: 'a' }], null)).toBe(1)
  })
  it('recognizes the limit error from a raised exception', () => {
    expect(isProgramLimitError({ message: 'USER_PROGRAM_LIMIT' })).toBe(true)
    expect(isProgramLimitError({ message: 'some other' })).toBe(false)
    expect(isProgramLimitError(null)).toBe(false)
  })
  it('maps limit error to Persian copy', () => {
    expect(programLimitErrorFa({ message: 'USER_PROGRAM_LIMIT' }))
      .toBe('می‌توانید حداکثر ۳ برنامه داشته باشید. برای ساخت برنامه جدید، یکی را حذف کنید.')
  })
})
```

- [ ] **Step 3: اجرای تست برای دیدن شکست**

Run: `npx vitest run src/lib/__tests__/programDays.test.js src/lib/__tests__/programSlots.test.js`
Expected: FAIL — «Cannot find module '../programDays.js'».

- [ ] **Step 4: پیاده‌سازی programDays.js**

`src/lib/programDays.js`:

```js
export const DAY_KEYS = ['sat', 'sun', 'mon', 'tue', 'wed', 'thu', 'fri']
export const DAY_LABELS = {
  sat: 'شنبه', sun: 'یکشنبه', mon: 'دوشنبه', tue: 'سه‌شنبه',
  wed: 'چهارشنبه', thu: 'پنجشنبه', fri: 'جمعه',
}
export const dayLabel = (k) => DAY_LABELS[k] ?? k

// JS getDay(): 0=Sun..6=Sat. Week starts Saturday (Persian).
const GETDAY_TO_KEY = { 6: 'sat', 0: 'sun', 1: 'mon', 2: 'tue', 3: 'wed', 4: 'thu', 5: 'fri' }
export function todayDayKey(now = new Date()) {
  return GETDAY_TO_KEY[now.getDay()] ?? 'sat'
}

export function buildDaysForKeys(keys = []) {
  return keys
    .filter((k) => DAY_KEYS.includes(k))
    .map((k, i) => ({ day_key: k, day_label: DAY_LABELS[k], title: DAY_LABELS[k], focus: null, sort: i + 1 }))
}
```

- [ ] **Step 5: پیاده‌سازی programSlots.js**

`src/lib/programSlots.js`:

```js
export const MAX_PROGRAMS = 3

export function countActivePrograms(owned = [], assignedId = null) {
  const ids = new Set(owned.map((p) => p.id))
  if (assignedId) ids.add(assignedId)
  return ids.size
}

export function isProgramLimitError(err) {
  return typeof err?.message === 'string' && err.message.includes('USER_PROGRAM_LIMIT')
}

export function programLimitErrorFa(err) {
  if (isProgramLimitError(err)) {
    return 'می‌توانید حداکثر ۳ برنامه داشته باشید. برای ساخت برنامه جدید، یکی را حذف کنید.'
  }
  return 'خطا در ساخت برنامه — لطفاً دوباره تلاش کنید'
}
```

- [ ] **Step 6: اجرای تست‌ها برای سبز شدن**

Run: `npx vitest run src/lib/__tests__/programDays.test.js src/lib/__tests__/programSlots.test.js`
Expected: PASS (all).

- [ ] **Step 7: commit**

```bash
git add src/lib/programDays.js src/lib/programSlots.js src/lib/__tests__/programDays.test.js src/lib/__tests__/programSlots.test.js
git commit -m "feat: pure helpers for user-program weekdays and 3-program limit"
```

---

### Task 2: مهاجرت دیتابیس ۰۰۰۲ (schema + data + checks snapshots)

**Files:**
- Create: `supabase/migrations/0002_user_programs.sql`
- Modify: `supabase/seed.sql` (درج `program_sections` و `section_id`)
- Modify: `docs/RUNBOOK.md`

**Interfaces:**
- Produces (DB contract for later tasks): `programs.owner_id`, `programs.is_deleted`; table `program_sections(id, day_id, name, sort)`; `program_items.section_id` (و حذف `section`); `checks.exercise_name`, `checks.sets` و `checks.item_id on delete set null`.

- [ ] **Step 1: نوشتن فایل مهاجرت (بدنهٔ schema + backfill)**

`supabase/migrations/0002_user_programs.sql`:

```sql
-- GYMBook — مهاجرت ۰۰۰۲: برنامه‌های شخصی کاربر
-- یک‌بار در SQL Editor اجرا شود (بعد از 0001). دوباره اجرا نکنید.

-- 1) programs: مالکیت + حذف نرم
alter table public.programs
  add column owner_id uuid references public.profiles(id) on delete cascade,
  add column is_deleted boolean not null default false;
create index on public.programs (owner_id) where is_deleted = false;

-- 2) بخش‌های با نام دلخواه
create table public.program_sections (
  id uuid primary key default gen_random_uuid(),
  day_id uuid not null references public.program_days(id) on delete cascade,
  name text not null,
  sort int not null default 0
);

-- 3) پیوند آیتم‌ها به بخش‌ها
alter table public.program_items
  add column section_id uuid references public.program_sections(id) on delete cascade;

-- 4) نگاشت دادهٔ موجود: سه enum → سه سطر program_sections در هر روز
do $$
declare r record; s_id uuid;
begin
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
end $$;

-- آیتم‌های بی‌بخش (نباید باشد) را به یک بخش پیش‌فرض وصل کن تا NOT NULL نگه دارد
insert into program_sections (day_id, name, sort)
  select distinct i.day_id, 'عمومی', 9
  from program_items i where i.section_id is null
  on conflict do nothing;
update program_items i set section_id = s.id
  from program_sections s
  where i.section_id is null and i.day_id = s.day_id and s.name = 'عمومی';

alter table public.program_items
  alter column section_id set not null,
  drop column section;

-- 5) checks: اسنپ‌شات + حذف امن آیتم
alter table public.checks
  add column exercise_name text,
  add column sets int;

update checks c set
  exercise_name = e.name_fa,
  sets = i.sets
from program_items i join exercises e on e.id = i.exercise_id
where c.item_id = i.id and c.exercise_name is null;

alter table public.checks drop constraint checks_item_id_fkey;
alter table public.checks
  add constraint checks_item_id_fkey
  foreign key (item_id) references public.program_items(id) on delete set null;
```

- [ ] **Step 2: افزودن RLS + توابع کمکی + تریگر سقف + view به همان فایل**

ادامه همان فایل:

```sql
-- 6) توابع کمک‌دسترسی
create or replace function public.can_write_program(pid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.programs
    where id = pid and (owner_id = auth.uid() or public.is_admin()))
$$;
create or replace function public.can_write_day(did uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.program_days d
    where d.id = did and public.can_write_program(d.program_id))
$$;
grant execute on function public.can_write_program(uuid) to authenticated;
grant execute on function public.can_write_day(uuid) to authenticated;

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
create trigger programs_limit_before_insert before insert on public.programs
  for each row execute function public.enforce_program_limit();

-- 8) RLS — programs
drop policy if exists "programs: read authed" on public.programs;
drop policy if exists "programs: admin write" on public.programs;
drop policy if exists "programs: admin update" on public.programs;
drop policy if exists "programs: admin delete" on public.programs;
create policy "programs: read visible" on public.programs
  for select to authenticated using (is_deleted = false
    and (owner_id is null or owner_id = auth.uid() or public.is_admin()));
create policy "programs: owner or admin insert" on public.programs
  for insert to authenticated with check (owner_id = auth.uid() or public.is_admin());
create policy "programs: owner or admin update" on public.programs
  for update to authenticated using (public.can_write_program(id))
  with check (public.can_write_program(id));
create policy "programs: admin delete" on public.programs
  for delete to authenticated using (public.is_admin());

-- 9) RLS — program_sections
alter table public.program_sections enable row level security;
create policy "sections: read authed" on public.program_sections
  for select to authenticated using (true);
create policy "sections: owner write" on public.program_sections
  for all to authenticated using (public.can_write_day(day_id))
  with check (public.can_write_day(day_id));

-- 10) RLS — program_days / program_items: نوشتن برای مالک برنامه یا ادمین
drop policy if exists "days: admin write" on public.program_days;
create policy "days: owner write" on public.program_days
  for all to authenticated using (public.can_write_program(program_id))
  with check (public.can_write_program(program_id));

drop policy if exists "items: admin write" on public.program_items;
create policy "items: owner write" on public.program_items
  for all to authenticated using (public.can_write_day(day_id))
  with check (public.can_write_day(day_id));

-- 11) RLS — profiles: شل‌کردن program_id تا کاربر برنامه پیش‌فرضش را عوض کند
drop policy if exists "profiles: self update";
create policy "profiles: self update" on public.profiles
  for update to authenticated using (id = auth.uid())
  with check (
    id = auth.uid()
    and role = (select p.role from public.profiles p where p.id = auth.uid())
    and approved = (select p.approved from public.profiles p where p.id = auth.uid())
    and email = (select p.email from public.profiles p where p.id = auth.uid())
    and (
      program_id is not distinct from (select p.program_id from public.profiles p where p.id = auth.uid())
      or exists (select 1 from public.programs g
        where g.id = program_id and g.is_deleted = false
          and (g.owner_id is null or g.owner_id = auth.uid()))
    )
  );

-- 12) view — درصد تکمیل روی «همهٔ آیتم‌ها» (نام ستون‌ها حفظ شد)
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
```

- [ ] **Step 3: اجرای تست رگرسیون (بدون DB)**

Run: `npm test`
Expected: PASS (مهاجرت SQL روی تست واحد اثر ندارد؛ مطمئن شو هیچ import JS نشکسته).

- [ ] **Step 4: اصلاح seed.sql برای اسکیماى جدید**

در `supabase/seed.sql`، هر `insert into program_items(... section ...) values (..., 'warm', ...)` را به این الگو تغییر بده: اول برای آن روز سه `program_sections` (گرم‌کردن sort 0، تمرین اصلی sort 1، سردکردن sort 2) درج و متغیر `uuid` بگیرید، سپس `program_items` را با `section_id` (بدون `section`) درج کنید. بلوک `do $$` فعلی را با این متغیرها گسترش بده:

```sql
  d_sat uuid; d_sun uuid; d_mon uuid; d_tue uuid; d_wed uuid;
  sec_warm uuid; sec_main uuid; sec_cool uuid;   -- برای هر روز بازتنظیم می‌شود
```

و در ابتدای هر روز، بعد از درج `program_days` و قبل از `program_items`:

```sql
  insert into program_sections (day_id, name, sort)
    values (d_sat, 'گرم‌کردن', 0), (d_sat, 'تمرین اصلی', 1), (d_sat, 'سردکردن', 2)
    returning null; -- فقط برای درج
  select id into sec_warm from program_sections where day_id = d_sat and sort = 0;
  select id into sec_main from program_sections where day_id = d_sat and sort = 1;
  select id into sec_cool from program_sections where day_id = d_sat and sort = 2;
```

سپس آیتم‌ها `. (..., section_id=sec_warm/sec_main/sec_cool, sets, reps, rest_sec, sort)`. (این بازنویسی مکانیکی در کل فایل؛ مقادیر sets/reps/rest بدون تغییر.)

- [ ] **Step 5: به‌روزرسانی RUNBOOK (اجرای ۰۰۰۲ + شمارش جدید policy)**

در `docs/RUNBOOK.md`، بند جدید «۱.۴ اجرای مهاجرت ۰۰۰۲» اضافه کن: Paste `0002_user_programs.sql` → Run → `Success`. صحت‌سنجی:

```sql
select count(*) from pg_policies where schemaname='public'
  and tablename in ('programs','program_sections','program_days','program_items','profiles');
-- انتظار: افزایش نسبت به قبل (sections جدید + جایگزینی policyها)
select count(*) from pg_views where viewname='v_day_progress'; -- 1
```

- [ ] **Step 6: commit**

```bash
git add supabase/migrations/0002_user_programs.sql supabase/seed.sql docs/RUNBOOK.md
git commit -m "feat: migration 0002 — owner_id, soft delete, program_sections, checks snapshots, RLS, limit trigger"
```

---

### Task 3: عمومی‌سازی programMove به section_id

**Files:**
- Modify: `src/lib/programMove.js`
- Modify: `src/lib/__tests__/programMove.test.js`

**Interfaces:**
- Produces: `moveItem(list, index, dir)` — همان امضا؛ حالا هم‌گروهی با `section_id` به‌جای `section` و بازشمارش `sort` ۱..n درون هر `section_id`.

- [ ] **Step 1: بازنویسی تست به section_id (شکسته)**

`src/lib/__tests__/programMove.test.js` را با این جایگزین کن:

```js
import { describe, it, expect } from 'vitest'
import { moveItem } from '../programMove.js'

const mk = (id, section_id, sort) => ({ id, section_id, sort })

describe('moveItem (section_id groups)', () => {
  it('swaps same-section neighbours and renumbers sort within section', () => {
    const list = [mk('a', 'S1', 1), mk('b', 'S1', 2), mk('c', 'S2', 1)]
    const out = moveItem(list, 1, 'up')
    expect(out.map((i) => `${i.id}:${i.sort}`)).toEqual(['b:1', 'a:2', 'c:1'])
  })
  it('no-op across sections', () => {
    const list = [mk('a', 'S1', 1), mk('b', 'S2', 1)]
    expect(moveItem(list, 1, 'up').map((i) => i.id)).toEqual(['a', 'b'])
  })
  it('no-op at boundaries', () => {
    const list = [mk('a', 'S1', 1)]
    expect(moveItem(list, 0, 'up')).toBe(list)
  })
  it('does not mutate input', () => {
    const list = [mk('a', 'S1', 1), mk('b', 'S1', 2)]
    moveItem(list, 0, 'down')
    expect(list[0].sort).toBe(1)
  })
})
```

- [ ] **Step 2: اجرای تست برای شکست**

Run: `npx vitest run src/lib/__tests__/programMove.test.js`
Expected: FAIL — نسخهٔ فعلی `section` می‌خواند، پس assertionهای `b:1` رد می‌شوند.

- [ ] **Step 3: بازنویسی programMove.js**

`src/lib/programMove.js`:

```js
// Reorder helper for the program builder. Groups items by `section_id`,
// swaps an item with its same-section neighbour, then renumbers `sort`
// to 1..n within each section. Returns a new array; never mutates input.
export function moveItem(list, index, dir) {
  const items = list ?? []
  const target = index + (dir === 'up' ? -1 : 1)
  if (target < 0 || target >= items.length) return items
  if (items[index]?.section_id !== items[target]?.section_id) return items

  const next = items.map((it) => ({ ...it }))
  ;[next[index], next[target]] = [next[target], next[index]]

  const done = new Set()
  for (const it of next) {
    if (done.has(it.section_id)) continue
    done.add(it.section_id)
    let sort = 1
    for (const o of next) if (o.section_id === it.section_id) o.sort = sort++
  }
  return next
}
```

- [ ] **Step 4: اجرای تست برای سبز شدن**

Run: `npx vitest run src/lib/__tests__/programMove.test.js`
Expected: PASS.

- [ ] **Step 5: commit**

```bash
git add src/lib/programMove.js src/lib/__tests__/programMove.test.js
git commit -m "refactor: programMove groups by section_id instead of fixed enum"
```

---

### Task 4: api.js — انتخاب درخت با sections + اسنپ‌شات تیک

**Files:**
- Modify: `src/lib/api.js:4-31`
- Modify: `src/lib/__tests__/api.test.js`

**Interfaces:**
- Consumes: `calcKcal`.
- Produces: `fetchProgramTree(programId)` → روزها، هر روز `sections` (مرتب با `sort`) و `items` (با `section_id`). `toggleCheck({...,exercise})` حالا `exercise_name` و `sets` را هم در `checks` درج می‌کند.

- [ ] **Step 1: اصلاح تست‌های api (انتظار رشتهٔ جدید + payload جدید)**

در `src/lib/__tests__/api.test.js` دو assertion را عوض کن:

تست `fetchProgramTree` — انتظار رشته با sections:
```js
expect(b.select).toHaveBeenCalledWith(
  '*, sections:program_sections(*), items:program_items(*, exercise:exercises(*))'
)
```

تست `toggleCheck.insert` — payload جدید:
```js
expect(b.insert).toHaveBeenCalledWith({
  user_id: 'u1', date: '2026-09-14', day_key: 'tue', item_id: 'i1', kcal: 23.5,
  exercise_name: 'پرس سینه', sets: 3,
})
```
و شی `exercise` در آن describe را به `{ id:'e1', met: 8, sec_per_rep: 4, name_fa: 'پرس سینه' }` و `item` را به `{ id:'i1', sets:3, reps:12 }` تغییر بده.

- [ ] **Step 2: اجرای تست برای شکست**

Run: `npx vitest run src/lib/__tests__/api.test.js`
Expected: FAIL روی رشتهٔ select و payload insert.

- [ ] **Step 3: اصلاح api.js**

`src/lib/api.js`:

```js
export async function fetchProgramTree(programId) {
  if (!programId) return []
  const { data: days, error } = await supabase.from('program_days')
    .select('*, sections:program_sections(*), items:program_items(*, exercise:exercises(*))')
    .eq('program_id', programId).order('sort')
  if (error) throw error
  return days.map((d) => ({
    ...d,
    sections: (d.sections ?? []).sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0)),
  }))
}
```

در `toggleCheck`، شاخهٔ in-sert:

```js
  const { error } = await supabase.from('checks').insert({
    user_id: userId, date, day_key: dayKey, item_id: item.id,
    kcal: calcKcal(exercise, item, weightKg),
    exercise_name: exercise?.name_fa ?? null,
    sets: item.sets,
  })
```

- [ ] **Step 4: اجرای تست برای سبز شدن**

Run: `npx vitest run src/lib/__tests__/api.test.js`
Expected: PASS.

- [ ] **Step 5: commit**

```bash
git add src/lib/api.js src/lib/__tests__/api.test.js
git commit -m "feat: fetch program sections and snapshot exercise_name/sets on check"
```

---

### Task 5: lib/programs.js — عملیات CRUD برنامه کاربر

**Files:**
- Create: `src/lib/programs.js`
- Test: `src/lib/__tests__/programs.test.js`

**Interfaces:**
- Consumes: `supabase`، `buildDaysForKeys` (Task 1)، `isProgramLimitError`/`programLimitErrorFa` (Task 1).
- Produces:
  - `fetchSelectablePrograms(userId, assignedId): Promise<Array<{id,title,isOwned,isDefault}>>`
  - `createProgramWithDays({ userId, title, dayKeys }): Promise<{ id }>` (throw → `programLimitErrorFa` در UI)
  - `softDeleteProgram(id): Promise<void>`
  - `setDefaultProgram(userId, programId): Promise<void>`

- [ ] **Step 1: نوشتن تست شکسته**

`src/lib/__tests__/programs.test.js`:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest'

const from = vi.fn()
vi.mock('../supabase.js', () => ({ supabase: { from } }))

const builder = (resolved) => {
  const b = {
    select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(), is: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(), insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(), single: vi.fn().mockReturnThis(),
    then: (res, rej) => Promise.resolve(resolved).then(res, rej),
  }
  b.select.mockReturnValue(b) // insert().select() chains too
  return b
}

let lib
beforeEach(async () => { vi.resetModules(); from.mockReset(); lib = await import('../programs.js') })

describe('createProgramWithDays', () => {
  it('inserts program with owner_id then program_days per selected key', async () => {
    const b = builder({ data: { id: 'p1' }, error: null })
    from.mockReturnValue(b)
    await expect(lib.createProgramWithDays({ userId: 'u1', title: 'من', dayKeys: ['mon', 'fri'] }))
      .resolves.toEqual({ id: 'p1' })
    expect(from).toHaveBeenCalledWith('programs')
    const ins = b.insert.mock.calls[0][0]
    expect(ins).toMatchObject({ title: 'من', owner_id: 'u1', is_deleted: false })
    expect(from).toHaveBeenCalledWith('program_days')
  })
})

describe('softDeleteProgram', () => {
  it('updates is_deleted=true for the given id', async () => {
    const b = builder({ data: null, error: null })
    from.mockReturnValue(b)
    await lib.softDeleteProgram('p1')
    expect(b.update).toHaveBeenCalledWith({ is_deleted: true })
    expect(b.eq).toHaveBeenCalledWith('id', 'p1')
  })
})

describe('setDefaultProgram', () => {
  it('updates profiles.program_id', async () => {
    const b = builder({ data: null, error: null })
    from.mockReturnValue(b)
    await lib.setDefaultProgram('u1', 'p9')
    expect(from).toHaveBeenCalledWith('profiles')
    expect(b.update).toHaveBeenCalledWith({ program_id: 'p9' })
    expect(b.eq).toHaveBeenCalledWith('id', 'u1')
  })
})
```

- [ ] **Step 2: اجرای تست برای شکست**

Run: `npx vitest run src/lib/__tests__/programs.test.js`
Expected: FAIL — «Cannot find module '../programs.js'».

- [ ] **Step 3: پیاده‌سازی programs.js**

`src/lib/programs.js`:

```js
import { supabase } from './supabase.js'
import { buildDaysForKeys } from './programDays.js'

export async function fetchSelectablePrograms(userId, assignedId) {
  const { data: owned, error } = await supabase.from('programs')
    .select('id,title,owner_id').eq('owner_id', userId).eq('is_deleted', false).order('created_at')
  if (error) throw error
  const list = (owned ?? []).map((p) => ({ id: p.id, title: p.title, isOwned: true, isDefault: p.id === assignedId }))
  if (assignedId && !list.some((p) => p.id === assignedId)) {
    const { data: g } = await supabase.from('programs').select('id,title').eq('id', assignedId).maybeSingle()
    if (g) list.push({ id: g.id, title: g.title, isOwned: false, isDefault: true })
  }
  return list
}

export async function createProgramWithDays({ userId, title, dayKeys }) {
  const { data: created, error } = await supabase.from('programs')
    .insert({ title, owner_id: userId, is_deleted: false }).select('id').single()
  if (error) throw error
  const rows = buildDaysForKeys(dayKeys).map((d) => ({ ...d, program_id: created.id }))
  if (rows.length) {
    const { error: e2 } = await supabase.from('program_days').insert(rows)
    if (e2) throw e2
  }
  return { id: created.id }
}

export async function softDeleteProgram(id) {
  const { error } = await supabase.from('programs').update({ is_deleted: true }).eq('id', id)
  if (error) throw error
}

export async function setDefaultProgram(userId, programId) {
  const { error } = await supabase.from('profiles').update({ program_id: programId }).eq('id', userId)
  if (error) throw error
}
```

- [ ] **Step 4: اجرای تست برای سبز شدن**

Run: `npx vitest run src/lib/__tests__/programs.test.js`
Expected: PASS.

- [ ] **Step 5: commit**

```bash
git add src/lib/programs.js src/lib/__tests__/programs.test.js
git commit -m "feat: user program CRUD lib (create with days, soft delete, set default)"
```

---

### Task 6: سازندهٔ مشترک ProgramBuilder

**Files:**
- Create: `src/components/ProgramBuilder.jsx`
- Test: `src/components/__tests__/ProgramBuilder.test.jsx`

**Interfaces:**
- Consumes: `supabase`، `fetchProgramTree`/`toggleCheck` نه—فقط واکشی درخت با `fetchProgramTree(programId)`، `moveItem`، `Field`، `fa`/`calcKcal`، `useAuth` (وزن).
- Produces: `<ProgramBuilder programId={id} />` — ویرایش روزها (عنوان)، ساخت/نام/حذف `program_sections`، افزودن حرکت از بانک با ست/تکرار/استراحت + پیش‌نمایش `≈kcal`، جابجایی و حذف آیتم. هر تغییر = یک فراخوان مستقل + `invalidate` (بدون نوشتن خوش‌بینانه).

> این task بزرگ‌ترین تکه است. الگو از `src/pages/admin/Programs.jsx` موجود برداشته می‌شود (تابع `run`، `NumField`، `AddBar`)؛ فقط enum ثابت `SECTIONS` به لیست داینامیک `day.sections` (هر بخش `id`/`name`) و `section_id` روی آیتم تبدیل می‌شود.

- [ ] **Step 1: نوشتن تست شکسته (رفتارهای کلیدی)**

`src/components/__tests__/ProgramBuilder.test.jsx`:

```jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import ProgramBuilder from '../ProgramBuilder.jsx'

const mockAuth = vi.hoisted(() => ({ profile: { id: 'u1', role: 'member', weight_kg: 70 } }))
vi.mock('../../lib/auth.jsx', () => ({ useAuth: () => mockAuth }))

const state = vi.hoisted(() => ({ days: [], exercises: [] }))
const calls = vi.hoisted(() => ({ inserted: [], updated: [], deleted: [] }))

vi.mock('../../lib/supabase.js', () => {
  const chain = (rows) => {
    const b = {
      select: vi.fn(() => b), eq: vi.fn(() => b), order: vi.fn(() => b),
      insert: vi.fn((p) => { calls.inserted.push(p); return { select: vi.fn(() => ({ single: async () => ({ data: { id: 'x1', ...p }, error: null }) })) } }),
      update: vi.fn((p) => { calls.updated.push(p); return { eq: vi.fn(() => Promise.resolve({ error: null })) } }),
      delete: vi.fn(() => ({ eq: vi.fn(() => { calls.deleted.push(true); return Promise.resolve({ error: null }) }) })),
      then: (res, rej) => Promise.resolve({ data: rows, error: null }).then(res, rej),
    }
    return b
  }
  return { supabase: { from: vi.fn((t) => {
    if (t === 'program_days') return chain(state.days)
    if (t === 'exercises') return chain(state.exercises)
    if (t === 'program_sections') return chain(state.sections ?? [])
    if (t === 'program_items') return chain([])
    throw new Error('unexpected ' + t)
  }) } }
})

const ui = () => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <ProgramBuilder programId="p1" />
  </QueryClientProvider>
)

beforeEach(() => {
  calls.inserted = []; calls.updated = []; calls.deleted = []
  state.exercises = [{ id: 'e1', name_fa: 'پرس سینه', met: 5, sec_per_rep: 4 }, { id: 'e2', name_fa: 'اسکوات', met: 5, sec_per_rep: 4 }]
  state.sections = [{ id: 'S1', day_id: 'd1', name: 'بخش ۱', sort: 0 }]
  state.days = [{ id: 'd1', program_id: 'p1', day_key: 'sat', day_label: 'شنبه', title: 'روز پا', sub: '', focus: '', sort: 1,
    sections: [{ id: 'S1', day_id: 'd1', name: 'بخش ۱', sort: 0 }],
    items: [{ id: 'i1', day_id: 'd1', section_id: 'S1', exercise_id: 'e1', exercise: { name_fa: 'پرس سینه', met: 5, sec_per_rep: 4 }, sets: 3, reps: 12, rest_sec: 45, sort: 1 }] }]
})

describe('ProgramBuilder', () => {
  it('renders day sections by dynamic name and existing items', async () => {
    ui()
    expect(await screen.findByText('بخش ۱')).toBeTruthy()
    expect(await screen.findByText('پرس سینه')).toBeTruthy()
  })
  it('shows a kcal preview for an item', async () => {
    ui()
    await screen.findByText('پرس سینه')
    // work_min=3*12*4/60=2.4 ; kcal=5*3.5*70/200*2.4=14.7
    expect(await screen.findByText(/۱۴٫۷ کیلوکالری/)).toBeTruthy()
  })
  it('adds a section (insert into program_sections)', async () => {
    ui()
    const add = await screen.findByLabelText('افزودن بخش')
    fireEvent.change(add, { target: { value: 'بخش جدید' } })
    fireEvent.keyDown(add, { key: 'Enter', code: 'Enter' })
    await screen.findByRole('status')
    expect(calls.inserted.some((p) => p.day_id === 'd1' && p.name === 'بخش جدید')).toBe(true)
  })
  it('deletes an item after confirm', async () => {
    vi.stubGlobal('confirm', () => true)
    ui()
    const del = await screen.findByLabelText(/حذف حرکت/)
    fireEvent.click(del)
    await screen.findByRole('status')
    expect(calls.deleted.length).toBeGreaterThan(0)
    vi.unstubAllGlobals()
  })
})
```

- [ ] **Step 2: اجرای تست برای شکست**

Run: `npx vitest run src/components/__tests__/ProgramBuilder.test.jsx`
Expected: FAIL — «Cannot find module '../ProgramBuilder.jsx'».

- [ ] **Step 3: پیاده‌سازی ProgramBuilder.jsx**

`src/components/ProgramBuilder.jsx` — نقاط کلیدی که باید موجود باشند تا تست‌ها سبز شوند و کارکرد کامل باشد:

```jsx
import React, { useState, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../lib/auth.jsx'
import { fetchProgramTree } from '../lib/api.js'
import { calcKcal, fa } from '../lib/calc.js'
import { moveItem } from '../lib/programMove.js'
import Field from './Field.jsx'

function NumField({ label, value, onSave }) {
  return (
    <label>{label}
      <input type="number" min="0" defaultValue={String(value ?? '')}
        onBlur={(e) => { const n = Number(e.target.value)
          if (e.target.value !== '' && Number.isFinite(n) && n !== value) onSave(n) }} />
    </label>
  )
}

export default function ProgramBuilder({ programId }) {
  const { profile } = useAuth()
  const weightKg = profile?.weight_kg ?? 70
  const qc = useQueryClient()
  const [dayIndex, setDayIndex] = useState(0)
  const [toast, setToast] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false)
  const [newSection, setNewSection] = useState('')

  const daysQuery = useQuery({ queryKey: ['program-tree', programId], queryFn: () => fetchProgramTree(programId), enabled: !!programId })
  const exercisesQuery = useQuery({ queryKey: ['exercises'], queryFn: async () => {
    const { data, error } = await supabase.from('exercises').select('id,name_fa').order('name_fa')
    if (error) throw error; return data } })

  const days = daysQuery.data ?? []
  const day = days[dayIndex]

  async function run(fn, ok) {
    setErr(''); setToast(''); setBusy(true)
    try { await fn(); setToast(ok || 'ذخیره شد') }
    catch { setErr('خطا در ذخیره تغییرات — لطفاً دوباره تلاش کنید') }
    finally { setBusy(false); qc.invalidateQueries({ queryKey: ['program-tree', programId] }) }
  }

  if (!programId) return null
  if (daysQuery.isLoading) return <div className="center muted" role="status">در حال بارگذاری…</div>

  const saveDayField = (patch) => run(() =>
    supabase.from('program_days').update(patch).eq('id', day.id).then(({ error }) => { if (error) throw error }), 'روز ذخیره شد')

  const addSection = () => { const name = newSection.trim(); if (!name || !day) return
    run(async () => { const count = (day.sections ?? []).length
      const { error } = await supabase.from('program_sections').insert({ day_id: day.id, name, sort: count }).select().single()
      if (error) throw error }, 'بخش اضافه شد')
    setNewSection('') }

  const renameSection = (sec, name) => name && name !== sec.name && run(() =>
    supabase.from('program_sections').update({ name }).eq('id', sec.id).then(({ error }) => { if (error) throw error }), 'بخش ذخیره شد')

  const removeSection = (sec) => { if (!window.confirm(`بخش «${sec.name}» حذف شود؟`)) return
    run(() => supabase.from('program_sections').delete().eq('id', sec.id).then(({ error }) => { if (error) throw error }), 'بخش حذف شد') }

  const addItem = (secId, exerciseId) => { if (!day) return
    const count = (day.items ?? []).filter((i) => i.section_id === secId).length
    run(async () => { const { error } = await supabase.from('program_items')
      .insert({ day_id: day.id, section_id: secId, exercise_id: exerciseId, sets: 3, reps: 12, rest_sec: 45, sort: count + 1 })
      if (error) throw error }, 'حرکت اضافه شد') }

  const saveItemField = (item, patch) => run(() =>
    supabase.from('program_items').update(patch).eq('id', item.id).then(({ error }) => { if (error) throw error }), 'حرکت ذخیره شد')

  const deleteItem = (item) => { if (!window.confirm('این حرکت حذف شود؟')) return
    run(() => supabase.from('program_items').delete().eq('id', item.id).then(({ error }) => { if (error) throw error }), 'حرکت حذف شد') }

  const reorder = (secId, itemId, dir) => {
    const sec = (day.items ?? []).filter((i) => i.section_id === secId).sort((a, b) => a.sort - b.sort)
    const idx = sec.findIndex((i) => i.id === itemId); if (idx < 0) return
    const moved = moveItem(sec, idx, dir)
    const changed = moved.filter((it) => sec.find((o) => o.id === it.id)?.sort !== it.sort)
    if (!changed.length) return
    run(async () => { for (const it of changed) {
      const { error } = await supabase.from('program_items').update({ sort: it.sort }).eq('id', it.id); if (error) throw error } }, 'ترتیب ذخیره شد')
  }

  return (
    <div className="pb">
      {err && <p className="err" role="alert">{err}</p>}
      {toast && <div className="ok-banner" role="status">{toast}</div>}
      <nav className="days">
        {days.map((d, i) => (
          <button type="button" key={d.id} className={i === dayIndex ? 'active' : undefined}
            aria-current={i === dayIndex ? 'true' : undefined} onClick={() => setDayIndex(i)}>{d.day_label}</button>
        ))}
      </nav>
      {day && (
        <div className="field-row">
          <Field id={`bt-${day.id}`} label="عنوان روز">
            <input id={`bt-${day.id}`} type="text" defaultValue={day.title ?? ''}
              onBlur={(e) => { if (e.target.value !== (day.title ?? '')) saveDayField({ title: e.target.value }) }} />
          </Field>
        </div>
      )}
      {day && (day.sections ?? []).map((sec) => {
        const items = (day.items ?? []).filter((i) => i.section_id === sec.id).sort((a, b) => a.sort - b.sort)
        return (
          <div key={sec.id} className="pb-col">
            <div className="pb-sect-head">
              <input aria-label={`نام بخش`} defaultValue={sec.name}
                onBlur={(e) => renameSection(sec, e.target.value)} />
              <button type="button" className="btn" disabled={busy}
                aria-label={`حذف بخش ${sec.name}`} onClick={() => removeSection(sec)}>حذف بخش</button>
            </div>
            {items.map((item) => {
              const name = item.exercise?.name_fa ?? '—'
              const preview = item.exercise ? calcKcal(item.exercise, item, weightKg) : null
              return (
                <div key={item.id} className="pb-item">
                  <span className="pb-item-name">{name}</span>
                  <NumField label={`ست (${name})`} value={item.sets} onSave={(v) => saveItemField(item, { sets: v })} />
                  <NumField label={`تکرار (${name})`} value={item.reps} onSave={(v) => saveItemField(item, { reps: v })} />
                  <NumField label={`استراحت (${name})`} value={item.rest_sec} onSave={(v) => saveItemField(item, { rest_sec: v })} />
                  {preview != null && <span className="kcal">≈{fa(preview)} کیلوکالری</span>}
                  <button type="button" className="btn" disabled={busy} aria-label={`بالا (${name})`} onClick={() => reorder(sec.id, item.id, 'up')}>↑</button>
                  <button type="button" className="btn" disabled={busy} aria-label={`پایین (${name})`} onClick={() => reorder(sec.id, item.id, 'down')}>↓</button>
                  <button type="button" className="btn" disabled={busy} aria-label="حذف حرکت" onClick={() => deleteItem(item)}>حذف</button>
                </div>
              )
            })}
            <select aria-label={`افزودن حرکت به ${sec.name}`} value=""
              onChange={(e) => { if (e.target.value) addItem(sec.id, e.target.value); e.target.value = '' }}>
              <option value="">افزودن حرکت از بانک…</option>
              {(exercisesQuery.data ?? []).map((ex) => <option key={ex.id} value={ex.id}>{ex.name_fa}</option>)}
            </select>
          </div>
        )
      })}
      {day && (
        <input aria-label="افزودن بخش" placeholder="نام بخش جدید…" value={newSection}
          onChange={(e) => setNewSection(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') addSection() }} />
      )}
    </div>
  )
}
```

نکات الزامی:
- آریا لیبل‌ها دقیقاً `«افزودن بخش»`، `«حذف حرکت»`، `«بالا (نام)»`، `«پایین (نام)»`، `«ست (نام)»` تا تست‌ها پیدا کنند.
- `fetchProgramTree` (Task 4) باید `sections` را برگرداند؛ در غیر این صورت `day.sections` خالی است.
- نوشتن بدون optimistic؛ همه `run()` با `invalidate ['program-tree', programId]`.

- [ ] **Step 4: اجرای تست برای سبز شدن**

Run: `npx vitest run src/components/__tests__/ProgramBuilder.test.jsx`
Expected: PASS (۴ تست). اگر `۱۴٫۷` پیدا نشد، قالب `fa()` و گرد `calcKcal` (یک رقم) را بررسی کن.

- [ ] **Step 5: commit**

```bash
git add src/components/ProgramBuilder.jsx src/components/__tests__/ProgramBuilder.test.jsx
git commit -m "feat: shared ProgramBuilder with dynamic sections and kcal preview"
```

---

### Task 7: صفحهٔ «برنامه‌های من» + روتینگ + ناوبری

**Files:**
- Create: `src/pages/Programs.jsx`
- Create: `src/pages/__tests__/MyPrograms.test.jsx`
- Modify: `src/App.jsx:16-22` (مسیر `/programs`)
- Modify: `src/components/Layout.jsx:21-27` (لینک «برنامه‌ها»)

**Interfaces:**
- Consumes: `fetchSelectablePrograms`/`createProgramWithDays`/`softDeleteProgram`/`setDefaultProgram` (Task 5)، `countActivePrograms`/`programLimitErrorFa`/`MAX_PROGRAMS` (Task 1)، `DAY_KEYS`/`dayLabel` (Task 1)، `ProgramBuilder` (Task 6)، `useAuth`.
- Produces: مسیر `/programs`. کارت برنامه‌ها با نشان «X از ۳»، دکمه ستارهٔ پیش‌فرض، حذف نرم، و فرم «برنامه جدید» (اسم + چک‌باکس روزها).

- [ ] **Step 1: نوشتن تست شکسته**

`src/pages/__tests__/MyPrograms.test.jsx`:

```jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import Programs from '../Programs.jsx'

const mockAuth = vi.hoisted(() => ({ profile: { id: 'u1', role: 'member', weight_kg: 70, program_id: 'p1' } }))
vi.mock('../../lib/auth.jsx', () => ({ useAuth: () => mockAuth }))

const lib = vi.hoisted(() => ({
  fetchSelectablePrograms: vi.fn(), createProgramWithDays: vi.fn(),
  softDeleteProgram: vi.fn(), setDefaultProgram: vi.fn(),
}))
vi.mock('../../lib/programs.js', () => lib)
vi.mock('../../components/ProgramBuilder.jsx', () => ({ default: ({ programId }) => <div data-testid="builder">{programId}</div> }))

beforeEach(() => {
  mockAuth.profile = { id: 'u1', role: 'member', weight_kg: 70, program_id: 'p1' }
  lib.fetchSelectablePrograms.mockResolvedValue([{ id: 'p1', title: 'الف', isOwned: true, isDefault: true }])
  lib.createProgramWithDays.mockResolvedValue({ id: 'p2' })
  lib.softDeleteProgram.mockResolvedValue(undefined)
  lib.setDefaultProgram.mockResolvedValue(undefined)
})

const ui = () => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <Programs />
  </QueryClientProvider>
)

describe('My Programs', () => {
  it('lists programs and slot counter', async () => {
    ui()
    expect(await screen.findByText('الف')).toBeTruthy()
    expect(await screen.findByText(/از ۳/)).toBeTruthy()
  })
  it('blocks the 4th create with Persian limit error', async () => {
    lib.fetchSelectablePrograms.mockResolvedValue([
      { id: 'a', title: '۱', isOwned: true, isDefault: false },
      { id: 'b', title: '۲', isOwned: true, isDefault: false },
      { id: 'c', title: '۳', isOwned: true, isDefault: true },
    ])
    ui()
    await screen.findByText('۱')
    fireEvent.change(screen.getByLabelText('اسم برنامه'), { target: { value: 'چهارم' } })
    fireEvent.click(screen.getByRole('button', { name: /ساخت برنامه/ }))
    expect(await screen.findByText(/حداکثر ۳ برنامه/)).toBeTruthy()
    expect(lib.createProgramWithDays).not.toHaveBeenCalled()
  })
  it('sets default via star', async () => {
    ui()
    await screen.findByText('الف')
    fireEvent.click(screen.getByLabelText(/پیش‌فرض/))
    expect(lib.setDefaultProgram).toHaveBeenCalledWith('u1', 'p1')
  })
})
```

- [ ] **Step 2: اجرای تست برای شکست**

Run: `npx vitest run src/pages/__tests__/MyPrograms.test.jsx`
Expected: FAIL — «Cannot find module '../Programs.jsx'».

- [ ] **Step 3: نوشتن صفحهٔ Programs.jsx**

`src/pages/Programs.jsx`:

```jsx
import React, { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../lib/auth.jsx'
import { fetchSelectablePrograms, createProgramWithDays, softDeleteProgram, setDefaultProgram } from '../lib/programs.js'
import { countActivePrograms, programLimitErrorFa, MAX_PROGRAMS } from '../lib/programSlots.js'
import { DAY_KEYS, dayLabel } from '../lib/programDays.js'
import { fa } from '../lib/calc.js'
import Field from '../components/Field.jsx'
import ProgramBuilder from '../components/ProgramBuilder.jsx'

export default function Programs() {
  const { profile } = useAuth()
  const qc = useQueryClient()
  const [openId, setOpenId] = useState(null)
  const [title, setTitle] = useState('')
  const [picked, setPicked] = useState([])
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false)

  const q = useQuery({ queryKey: ['my-programs', profile?.id],
    queryFn: () => fetchSelectablePrograms(profile.id, profile.program_id), enabled: !!profile?.id })
  const programs = q.data ?? []
  const used = countActivePrograms(programs.filter((p) => p.isOwned), profile.program_id && programs.some((p) => !p.isOwned) ? profile.program_id : null)
  const atLimit = used >= MAX_PROGRAMS

  const toggleKey = (k) => setPicked((s) => (s.includes(k) ? s.filter((x) => x !== k) : [...s, k]))

  const create = async (e) => {
    e.preventDefault(); setErr('')
    if (!title.trim()) { setErr('اسم برنامه الزامی است'); return }
    if (!picked.length) { setErr('حداقل یک روز انتخاب کنید'); return }
    if (atLimit) { setErr(programLimitErrorFa({ message: 'USER_PROGRAM_LIMIT' })); return }
    setBusy(true)
    try {
      const { id } = await createProgramWithDays({ userId: profile.id, title: title.trim(), dayKeys: picked })
      setTitle(''); setPicked([]); setOpenId(id)
      qc.invalidateQueries({ queryKey: ['my-programs', profile.id] })
    } catch (e2) { setErr(programLimitErrorFa(e2)) }
    finally { setBusy(false) }
  }

  const del = async (p) => {
    if (!window.confirm(`برنامه «${p.title}» حذف شود؟ لاگ‌های انجام‌شده در گزارش می‌مانند.`)) return
    try { await softDeleteProgram(p.id)
      if (profile.program_id === p.id) await setDefaultProgram(profile.id, null)
      qc.invalidateQueries({ queryKey: ['my-programs', profile.id] })
      if (openId === p.id) setOpenId(null)
    } catch { setErr('خطا در حذف برنامه') } }

  const star = async (p) => { try { await setDefaultProgram(profile.id, p.id); qc.invalidateQueries({ queryKey: ['my-programs', profile.id] }) } catch { setErr('خطا در ست کردن پیش‌فرض') } }

  return (
    <div className="wrap">
      <div className="card">
        <h2>برنامه‌های من</h2>
        <p className="muted">{fa(used)} از {fa(MAX_PROGRAMS)} برنامه فعال</p>
        {err && <p className="err" role="alert">{err}</p>}
        <form onSubmit={create} noValidate>
          <Field id="mp-title" label="اسم برنامه">
            <input id="mp-title" type="text" value={title} maxLength={60} disabled={atLimit} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <div className="weekdays" role="group" aria-label="روزهای تمرین">
            {DAY_KEYS.map((k) => (
              <label key={k}>
                <input type="checkbox" checked={picked.includes(k)} disabled={atLimit} onChange={() => toggleKey(k)} />
                <span>{dayLabel(k)}</span>
              </label>
            ))}
          </div>
          <div className="form-actions">
            <button type="submit" className="btn primary" disabled={busy || atLimit}>
              {atLimit ? 'سقف برنامه پر است' : 'ساخت برنامه'}
            </button>
          </div>
        </form>

        {q.isLoading && <div className="center muted" role="status">در حال بارگذاری…</div>}
        <div className="pb-list">
          {programs.map((p) => (
            <div key={p.id} className={'prog-card' + (openId === p.id ? ' active' : '')}>
              <button type="button" className="prog-title" onClick={() => setOpenId(p.id)}>{p.title}</button>
              {p.isDefault && <span className="chip">پیش‌فرض</span>}
              {!p.isOwned && <span className="chip">ادمین</span>}
              {p.isOwned && !p.isDefault && (
                <button type="button" className="btn" aria-label={`پیش‌فرض ${p.title}`} onClick={() => star(p)}>⭐</button>
              )}
              {p.isOwned && <button type="button" className="btn" aria-label={`حذف ${p.title}`} onClick={() => del(p)}>حذف</button>}
            </div>
          ))}
        </div>
      </div>
      {openId && <div className="card"><ProgramBuilder programId={openId} /></div>}
    </div>
  )
}
```

> نکته تست: در تست «sets default via star» برنامه `p1` `isDefault:true` است، پس ستاره باید برای برنامهٔ **غیرپیش‌فرض** باشد. برای اینکه همان `findByText('الف')` با ستارهٔ قابل‌کلیک جفت شود، mock را `[isOwned:true, isDefault:true]` نگه دار و `aria-label` ستاره را طوری بساز که حتی روی برنامه پیش‌فرض هم نمایش داده شود **یا** تست را با `isDefault:false` بنویس. در پیاده‌سازی: ستاره فقط برای `!p.isDefault`. بنابراین در mock تست اول `isDefault:false` بگذار تا ستاره دیده شود. (پیش از commit، تست و mock را هم‌راستا نگه دار.)

- [ ] **Step 4: اصلاح mock تست اول/سوم به isDefault:false (تا ستاره نمایش داده شود)**

در `MyPrograms.test.jsx` خط mock پیش‌فرض را به `{ id: 'p1', title: 'الف', isOwned: true, isDefault: false }` تغییر بده و برای تست «star» همان کافی است (کلیک روی `پیش‌فرض`).

- [ ] **Step 5: افزودن مسیر /programs به App.jsx**

`src/App.jsx`، import صفحه و مسیر:

```jsx
import Programs from './pages/Programs.jsx'
// داخل <Route element={<Protected><Layout/></Protected>}> بعد از index:
          <Route path="programs" element={<Programs />} />
```

- [ ] **Step 6: افزودن لینک ناوبری**

`src/components/Layout.jsx`، بعد از لینک «امروز»:

```jsx
          <NavLink to="/programs">برنامه‌ها</NavLink>
```

- [ ] **Step 7: اجرای تست صفحه**

Run: `npx vitest run src/pages/__tests__/MyPrograms.test.jsx`
Expected: PASS (۳ تست).

- [ ] **Step 8: commit**

```bash
git add src/pages/Programs.jsx src/pages/__tests__/MyPrograms.test.jsx src/App.jsx src/components/Layout.jsx
git commit -m "feat: My Programs page with 3-slot counter, weekday picker, default star, soft delete"
```

---

### Task 8: صفحهٔ ادمین Programs روی ProgramBuilder

**Files:**
- Modify: `src/pages/admin/Programs.jsx` (بازنویسی پوسته روی `ProgramBuilder`)
- Modify: `src/pages/__tests__/Programs.test.jsx`

**Interfaces:**
- Consumes: `ProgramBuilder` (Task 6)، `supabase`، `useAuth`.
- Produces: همان رفتار ادمین برای برنامه‌های **سراسری** (`owner_id=null`، بدون سقف ۳). انتخاب برنامه ← `ProgramBuilder`.

- [ ] **Step 1: ساده‌سازی تست‌های ادمین**

`src/pages/__tests__/Programs.test.jsx` را به این (کمتر، چون منطق سازنده به Task ۶ منتقل شد) بازنویسی کن:

```jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import Programs from '../admin/Programs.jsx'

const mockAuth = vi.hoisted(() => ({ profile: null }))
vi.mock('../../lib/auth.jsx', () => ({ useAuth: () => mockAuth }))
vi.mock('../../components/ProgramBuilder.jsx', () => ({ default: ({ programId }) => <div data-testid="builder">{programId}</div> }))
const calls = vi.hoisted(() => ({ inserted: [] }))
const list = vi.hoisted(() => ({ programs: [] }))
vi.mock('../../lib/supabase.js', () => ({ supabase: { from: vi.fn((t) => {
  const b = { select: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(), insert: vi.fn((p) => { calls.inserted.push(p); return b }),
    then: (res, rej) => Promise.resolve({ data: t === 'programs' ? list.programs : null, error: null }).then(res, rej),
    single: () => Promise.resolve({ data: { id: 'newp', ...(p0()) }, error: null }) }
  const p0 = () => ({}); return b
}) } }))

const ui = () => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><Programs /></QueryClientProvider>)

beforeEach(() => { calls.inserted = []; list.programs = [{ id: 'p1', title: 'برنامه A' }] })

describe('admin Programs', () => {
  it('renders nothing for member', () => { mockAuth.profile = { role: 'member' }; const { container } = ui(); expect(container.innerHTML).toBe('') })
  it('lists programs and opens builder on select', async () => {
    mockAuth.profile = { id: 'a1', role: 'admin' }; ui()
    fireEvent.click(await screen.findByText('برنامه A'))
    expect(await screen.findByTestId('builder')).toBeTruthy()
  })
  it('creates a global program without owner_id', async () => {
    mockAuth.profile = { id: 'a1', role: 'admin' }; ui()
    fireEvent.change(screen.getByLabelText('عنوان برنامه'), { target: { value: 'سراسری' } })
    fireEvent.click(screen.getByRole('button', { name: /برنامه جدید/ }))
    await screen.findByRole('status')
    expect(calls.inserted.some((p) => p.title === 'سراسری' && p.created_by === 'a1')).toBe(true)
  })
})
```

- [ ] **Step 2: اجرای تست برای شکست**

Run: `npx vitest run src/pages/__tests__/Programs.test.jsx`
Expected: FAIL (ساختار فعلی با `ProgramBuilder` mock جور نیست).

- [ ] **Step 3: بازنویسی admin/Programs.jsx**

`src/pages/admin/Programs.jsx`:

```jsx
import React, { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase.js'
import { useAuth } from '../../lib/auth.jsx'
import Field from '../../components/Field.jsx'
import ProgramBuilder from '../../components/ProgramBuilder.jsx'

async function fetchPrograms() {
  const { data, error } = await supabase.from('programs')
    .select('id,title,description').is('owner_id', null).eq('is_deleted', false).order('created_at')
  if (error) throw error; return data
}

export default function Programs() {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'
  const qc = useQueryClient()
  const [programId, setProgramId] = useState(null)
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [busy, setBusy] = useState(false); const [toast, setToast] = useState(''); const [err, setErr] = useState('')

  const programsQuery = useQuery({ queryKey: ['programs'], queryFn: fetchPrograms, enabled: isAdmin })
  const programs = programsQuery.data ?? []

  const create = async (e) => {
    e.preventDefault(); if (!newTitle.trim()) { setErr('عنوان برنامه الزامی است'); return }
    setBusy(true); setErr('')
    try {
      const { error } = await supabase.from('programs')
        .insert({ title: newTitle.trim(), description: newDesc.trim() || null, created_by: profile?.id ?? null, owner_id: null, is_deleted: false })
      if (error) throw error
      setNewTitle(''); setNewDesc(''); qc.invalidateQueries({ queryKey: ['programs'] }); setToast('برنامه ساخته شد')
    } catch { setErr('خطا در ساخت برنامه') } finally { setBusy(false) }
  }

  if (!isAdmin) return null
  return (
    <div className="wrap">
      <div className="card">
        <h2>برنامه‌ها</h2>
        {err && <p className="err" role="alert">{err}</p>}
        {toast && <div className="ok-banner" role="status">{toast}</div>}
        <form onSubmit={create} noValidate>
          <div className="field-row">
            <Field id="pg-title" label="عنوان برنامه">
              <input id="pg-title" type="text" value={newTitle} maxLength={60} onChange={(e) => setNewTitle(e.target.value)} />
            </Field>
            <Field id="pg-desc" label="توضیح">
              <input id="pg-desc" type="text" value={newDesc} maxLength={120} onChange={(e) => setNewDesc(e.target.value)} />
            </Field>
          </div>
          <div className="form-actions"><button type="submit" className="btn primary" disabled={busy}>برنامه جدید</button></div>
        </form>
        <div className="pb-list">
          {programs.map((p) => (
            <button type="button" key={p.id} className={'btn' + (p.id === programId ? ' primary' : '')}
              aria-pressed={p.id === programId} onClick={() => setProgramId(p.id)}>{p.title}</button>
          ))}
        </div>
      </div>
      {programId && <div className="card"><ProgramBuilder programId={programId} /></div>}
    </div>
  )
}
```

- [ ] **Step 4: اجرای تست برای سبز شدن**

Run: `npx vitest run src/pages/__tests__/Programs.test.jsx`
Expected: PASS (۳ تست).

- [ ] **Step 5: commit**

```bash
git add src/pages/admin/Programs.jsx src/pages/__tests__/Programs.test.jsx
git commit -m "refactor: admin Programs reuses shared ProgramBuilder for global programs"
```

---

### Task 9: صفحهٔ «امروز» — انتخاب‌گر برنامه و بخش‌های داینامیک

**Files:**
- Modify: `src/pages/Today.jsx`
- Create: `src/pages/__tests__/Today.test.jsx`

**Interfaces:**
- Consumes: `fetchSelectablePrograms`/`setDefaultProgram` (Task 5)، `fetchProgramTree`/`fetchChecks`/`toggleCheck` (Task 4)، `todayDayKey` (Task 1)، `dayPercent`، `ExerciseCard`.
- Produces: انتخاب برنامهٔ موقت از انتخاب‌گر؛ اگر کاربر پیش‌فرض ندارد و برنامه ندارد → CTA ساخت.

- [ ] **Step 1: نوشتن تست شکسته**

`src/pages/__tests__/Today.test.jsx`:

```jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import Today from '../Today.jsx'

const mockAuth = vi.hoisted(() => ({ profile: { id: 'u1', role: 'member', weight_kg: 70, program_id: 'p1' } }))
vi.mock('../../lib/auth.jsx', () => ({ useAuth: () => mockAuth }))
const lib = vi.hoisted(() => ({ fetchSelectablePrograms: vi.fn(), setDefaultProgram: vi.fn() }))
vi.mock('../../lib/programs.js', () => lib)
const api = vi.hoisted(() => ({ fetchProgramTree: vi.fn(), fetchChecks: vi.fn(), toggleCheck: vi.fn() }))
vi.mock('../../lib/api.js', () => api)
vi.mock('../../components/TimerBar.jsx', () => ({ default: () => null }))

const day = { id: 'd1', day_key: 'sat', day_label: 'شنبه', title: 'پا', sub: '', focus: '', sort: 1,
  sections: [{ id: 'S1', name: 'بخش ۱', sort: 0 }],
  items: [{ id: 'i1', section_id: 'S1', sets: 3, reps: 12, rest_sec: 45, sort: 1, exercise: { id: 'e1', name_fa: 'پرس سینه', met: 5, sec_per_rep: 4 } }] }

beforeEach(() => {
  mockAuth.profile = { id: 'u1', role: 'member', weight_kg: 70, program_id: 'p1' }
  lib.fetchSelectablePrograms.mockResolvedValue([{ id: 'p1', title: 'الف', isOwned: true, isDefault: true }])
  api.fetchProgramTree.mockResolvedValue([day])
  api.fetchChecks.mockResolvedValue([])
})

const ui = () => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><Today /></QueryClientProvider>)

describe('Today', () => {
  it('renders dynamic section name and exercise', async () => {
    ui()
    expect(await screen.findByText('بخش ۱')).toBeTruthy()
    expect(await screen.findByText('پرس سینه')).toBeTruthy()
  })
  it('shows program selector and prompts to create when none', async () => {
    mockAuth.profile.program_id = null
    lib.fetchSelectablePrograms.mockResolvedValue([])
    ui()
    expect(await screen.findByText(/هنوز برنامه‌ای نداری/)).toBeTruthy()
  })
})
```

- [ ] **Step 2: اجرای تست برای شکست**

Run: `npx vitest run src/pages/__tests__/Today.test.jsx`
Expected: FAIL — نسخهٔ فعلی `section` ثابت و `NoProgram` قدیمی دارد.

- [ ] **Step 3: اصلاح Today.jsx**

تغییرات کلیدی روی `src/pages/Today.jsx`:
- importهای جدید: `fetchSelectablePrograms`, `setDefaultProgram`, `todayDayKey`, `Link` (react-router).
- حذف ثابت `SECTIONS`؛ `todayDefaultIndex` با `todayDayKey()` و `findIndex(d => d.day_key === todayDayKey())` جایگزین شود.
- state محلی: `const [programId, setProgramId] = useState(profile?.program_id ?? null)`.
- query برنامه‌ها: `const progsQuery = useQuery({ queryKey:['selectable',profile?.id], queryFn:()=>fetchSelectablePrograms(profile.id, profile.program_id), enabled: !!profile?.id })`.
- `programQuery` حالا روی `programId` (state) نه `profile.program_id`.
- `itemsBySection`: گروه‌بندی با `section_id`:

```js
  const groups = useMemo(() => {
    const secs = selected?.sections ?? []
    return secs.map((sec) => ({
      ...sec,
      items: (selected.items ?? []).filter((it) => it.section_id === sec.id && it.exercise)
        .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0)),
    }))
  }, [selected])
  const flatItems = groups.flatMap((g) => g.items)
  const mainTotal = flatItems.length
  const mainDone = flatItems.filter((it) => checksByItem.has(it.id)).length
```

- رندر: به‌جای `SECTIONS.map` روی `groups.map((g) => ...)` با سربرگ `<div className="sect">{g.name}</div>`؛ شمارش `index` سراسری با شمارندهٔ flat (۱..n) نگه‌دار.
- انتخاب‌گر بالای `DayNav`:

```jsx
  {(progsQuery.data?.length ?? 0) > 0 && (
    <div className="prog-picker">
      <select aria-label="انتخاب برنامه" value={programId ?? ''}
        onChange={(e) => setProgramId(e.target.value || profile.program_id)}>
        {progsQuery.data.map((p) => (
          <option key={p.id} value={p.id}>{p.title}{p.isDefault ? ' (پیش‌فرض)' : ''}</option>
        ))}
      </select>
    </div>
  )}
```

- شرط رندر اولیه: اگر `!profile?.program_id && (progsQuery.data?.length ?? 0) === 0` → کارت CTA «هنوز برنامه‌ای نداری — برنامه بساز» با `<Link to="/programs">`. اگر `days.length===0` → همان CTA.

- [ ] **Step 4: اجرای تست برای سبز شدن**

Run: `npx vitest run src/pages/__tests__/Today.test.jsx`
Expected: PASS.

- [ ] **Step 5: commit**

```bash
git add src/pages/Today.jsx src/pages/__tests__/Today.test.jsx
git commit -m "feat: Today program picker and dynamic named sections"
```

---

### Task 10: ماندگاری تاریخچهٔ حرکت با اسنپ‌شات

**Files:**
- Modify: `src/components/ExerciseHistory.jsx:12-41`
- Modify: `src/components/__tests__/ExerciseHistory.test.jsx`

**Interfaces:**
- Consumes: `checks` با ستون‌های جدید `exercise_name`/`sets` و `item_id` قابل null.
- Produces: `groupHistory(rows)` که اگر `item.exercise` نبود از `r.exercise_name`/`r.sets` (اسنپ‌شات لاگ) استفاده کند.

- [ ] **Step 1: افزودن تست رگرسیون (شکسته)**

به `src/components/__tests__/ExerciseHistory.test.jsx` این تست را اضافه کن (اگر فایل import `groupHistory` ندارد، اضافه کن):

```js
import { groupHistory } from '../ExerciseHistory.jsx'

it('uses snapshot name/sets when the program item was deleted', () => {
  const rows = [
    { date: '2026-09-01', item_id: null, exercise_name: 'پرس سینه', sets: 4, item: null },
    { date: '2026-09-02', item_id: null, exercise_name: 'پرس سینه', sets: 4, item: null },
  ]
  const out = groupHistory(rows)
  expect(out).toEqual([{ name: 'پرس سینه', sessions: 2, sets: 8, last: '2026-09-02' }])
})
```

- [ ] **Step 2: اجرای تست برای شکست**

Run: `npx vitest run src/components/__tests__/ExerciseHistory.test.jsx`
Expected: FAIL — `groupHistory` فعلی روی `r.item?.exercise` تکیه دارد و ردیف را drop می‌کند.

- [ ] **Step 3: اصلاح groupHistory و fetch**

در `groupHistory`:

```js
;(rows ?? []).forEach((r) => {
  const name = r.item?.exercise?.name_fa || r.exercise_name
  if (!name) return
  const sets = Number(r.item?.sets ?? r.sets) || 0
  const entry = map.get(name) || { name, seen: new Set(), sets: 0, last: '' }
  entry.seen.add(r.date)
  entry.sets += sets
  if (r.date > entry.last) entry.last = r.date
  map.set(name, entry)
})
```

در `fetchHistory` رشتهٔ select را گسترش بده:

```js
.select('date, kcal, exercise_name, sets, item:program_items(sets, exercise:exercises(name_fa))')
```

- [ ] **Step 4: اجرای تست برای سبز شدن**

Run: `npx vitest run src/components/__tests__/ExerciseHistory.test.jsx`
Expected: PASS (قدیمی‌ها + جدید).

- [ ] **Step 5: commit**

```bash
git add src/components/ExerciseHistory.jsx src/components/__tests__/ExerciseHistory.test.jsx
git commit -m "fix: exercise history survives deleted program items via snapshots"
```

---

### Task 11: سبز کل تست‌ها + صحت‌سنجی دستی

**Files:**
- Modify: (nothing — validation task; add missing polish to `src/styles.css` if needed)

**Interfaces:**
- Consumes: کل تغییرات.

- [ ] **Step 1: اجرای کل تست‌ها**

Run: `npm test`
Expected: PASS. اگر شکست، همین‌جا رفع کن (نه task بعدی).

- [ ] **Step 2: بیلد**

Run: `npm run build`
Expected: بدون خطا؛ خروجی `dist/`.

- [ ] **Step 3: صحت‌سنجی دستی (در dev با پروژهٔ Supabase واقعی بعد از اجرای 0002)**

`npm run dev` و چک‌لیست معیارهای پذیرش spec بند ۱۲ را آیتم‌به‌آیتم مرور کن:
- ساخت برنامهٔ ۴ام → پیام سقف؛ حذف نرم یکی → ساخت مجاز.
- ستارهٔ پیش‌فرض → انتخاب‌گر «امروز» همان را علامت‌دار.
- حذف برنامه → لاگ در گزارش/تاریخچه باقی.

- [ ] **Step 4: استایل‌های کمکی (در صورت نبود)**

اگر `.prog-picker`, `.prog-card`, `.weekdays`, `.pb-sect-head` در `src/styles.css` نیست، بلوک‌های سادهٔ سازگار با کارت/تم فعلی اضافه کن (RTL، فاصله‌گذاری، `input[type=checkbox]` روزها به‌صورت چیپ).

- [ ] **Step 5: commit (در صورت تغییر)**

```bash
git add src/styles.css
git commit -m "style: program picker, cards and weekday chips"
```

---

## Self-Review (پس از نوشتن پلن)

**۱. پوشش spec:**
- روزهای انتخابی + اسم برنامه + عنوان روز → Task 1 (`buildDaysForKeys`) + Task 7 (چک‌باکس‌ها) + ProgramBuilder title.
- بانک حرکت + ست/تکرار + ذخیره → Task 6.
- دسته‌بندی نام‌دلخواه → `program_sections` Task 2 + Task 6.
- سقف ۳ → Task 1 (کلاینت) + Task 2 (تریگر).
- کالری بر اساس کاربر + ست → Task 4 (اسنپ‌شات) + پیش‌نمایش Task 6.
- انتخاب برنامه در «امروز» → Task 9. ست پیش‌فرض → Task 5/7.
- لاگ بر اساس برنامه + ماندن پس از حذف → Task 2 (soft delete + set null + snapshot) + Task 10.
- درصد روی همهٔ بخش‌ها → Task 2 (view). ✔ همه پوشش داده شدند.

**۲. Placeholder:** هیچ «TBD/TODO» نیست؛ همهٔ بلوک‌های کد واقعی‌اند. (Task 2 seed با الگوی صریح، نه مبهم.)

**۳. سازگاری نوع/نام:** `section_id` در Task 3/4/6/9 یکسان؛ `main_done`/`main_total` در view Task 2 حفظ شد تا مصرف‌کننده‌ها (Report/MonthCalendar/WeekChart) تغییر نکنند؛ امضای `moveItem(list,index,dir)` ثابت ماند؛ `programLimitErrorFa`/`isProgramLimitError` هم‌نام در Task 1 و مصرف Task 7. یک وابستگی تستی Task 7 (`isDefault`) در Step 4 صریح اصلاح می‌شود.

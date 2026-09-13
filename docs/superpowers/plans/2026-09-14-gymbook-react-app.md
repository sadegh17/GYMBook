# GYMBook React + Supabase App — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ساخت اپ PWA ری‌اکت GYMBook با لاگین Supabase، بانک حرکات، برنامه‌ساز ادمین، تیک تمرین هم‌رسان‌شونده بین دستگاه‌ها، و گزارش کالری/استریک per-user.

**Architecture:** SPA ری‌اکت (Vite, HashRouter) روی GitHub Pages؛ همه داده‌ها در Postgres/Supabase با RLS به‌عنوان تنها لایه امنیتی؛ محاسبات کالری/استریک به‌صورت توابع خالص تست‌شده؛ نوشتن تیک = insert رکورد با اسنپ‌شات کالری.

**Tech Stack:** React 18, Vite 5, JavaScript (بدون TS), React Router 6 (HashRouter), @tanstack/react-query 5, @supabase/supabase-js 2, Recharts 2, vite-plugin-pwa, Vitest + React Testing Library, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-09-14-gymbook-app-design.md`

**انحراف از spec (تصمیم اجرایی):** ساخت سه اکانت اولیه به‌جای SQL حاوی هش رمز، از طریق خود اپ انجام می‌شود (اولین signup = ادمین؛ دو کاربر دیگر از پنل ادمین با رمز موقت). نتیجه همان است و هیچ رازی commit نمی‌شود.

## Global Constraints

- UI کاملاً فارسی و RTL (`dir="rtl"`)؛ فونت Vazirmatn از CDN `https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/Vazirmatn-font-face.css`.
- تم تیره با متغیرهای CSS دقیقاً از نسخه استاتیک: `--bg:#0f172a; --card:#1a2540; --card2:#223052; --line:#2c3a5e; --txt:#e8eefc; --muted:#9fb0d0; --acc:#38bdf8; --ok:#22c55e; --warn:#fbbf24`. پروفایل رنگی ساغر: `body[data-theme="saghar"]{--acc:#f472b6;--card:#221a2e;--card2:#2e2340;--line:#463357}` و هدر `linear-gradient(135deg,#7e22ce,#ec4899)`؛ theme از `profiles.theme` می‌آید و مقادیر مجاز `sadeq|saghar`.
- همه اعداد نمایشی با تابع `fa()` به رقم فارسی؛ تاریخ‌ها `YYYY-MM-DD` ذخیره، نمایش میلادی با نام فارسی ماه مجاز نیست — نمایش ساده `۱۴۰۵/۰۶/۲۳` لازم نیست؛ تاریخ شمسی با `Intl.DateTimeFormat('fa-IR')` نمایش داده شود.
- iOS: `viewport-fit=cover` + `padding-bottom: calc(10px + env(safe-area-inset-bottom))` روی نوار تایمر.
- فقط دو env: `VITE_SUPABASE_URL=https://mtuccxoypjzvjffujgje.supabase.co` و `VITE_SUPABASE_ANON_KEY` (کلید publishable؛ عملاً عمومی). هیچ کلید دیگری در کلاینت ممنوع.
- مسیریابی فقط HashRouter (اجبار GitHub Pages).
- ستون `checks.day_key` حتماً در لحظه تیک از `program_days.day_key` جاری پر می‌شود (برای گزارش).
- هر task انتهایش: `npm test` سبز + commit با پیشوند `feat:`/`fix:`/`chore:`/`docs:`.
- Node ≥ 18 روی دستگاه توسعه (v20.19.6 نصب است).

## File Structure

```
/  (repo root = Vite app)
├── index.html                    # Vite entry (جایگزین نسخه استاتیک؛ نسخه قدیمی در public/legacy.html و گیت‌تگ static-v1)
├── package.json / vite.config.js / vitest.config.js / .env.example
├── .github/workflows/deploy.yml  # test → build → Pages
├── supabase/migrations/0001_init.sql
├── supabase/seed.sql
├── docs/RUNBOOK.md               # مراحل یک‌بارمصرف داشبورد
└── src/
    ├── main.jsx  App.jsx  styles.css
    ├── lib/supabase.js  lib/auth.jsx  lib/calc.js  lib/api.js  lib/fa.js
    ├── components/ (Layout, ExerciseCard, TimerBar, DayNav, Protected, AdminOnly, MonthCalendar, WeekChart, ExerciseHistory, ...)
    └── pages/ (Login, Today, Report, Profile, admin/Users, admin/Exercises, admin/Programs)
```

---

### Task 1: اسکلت Vite + PWA + CI دیپلوی + حفظ نسخه استاتیک

**Files:**
- Create: `package.json`, `vite.config.js`, `index.html`, `src/main.jsx`, `src/App.jsx`, `src/styles.css`, `.env.example`, `.gitignore`, `.github/workflows/deploy.yml`
- Move: `index.html` (استاتیک فعلی) → `public/legacy.html`

**Interfaces:**
- Produces: اپی که `npm run dev` بالا می‌آید، `npm run build` خروجی `dist/` می‌دهد، Pages از طریق workflow سرو می‌شود.

- [ ] **Step 1: تگ نسخه استاتیک و جابه‌جایی فایل**

```bash
git tag static-v1
git mv index.html public/legacy.html
```

- [ ] **Step 2: ساخت پروژه Vite در ریشه**

```bash
npm create vite@latest . -- --template react
npm i react-router-dom@6 @supabase/supabase-js@2 @tanstack/react-query@5 recharts@2
npm i -D vite-plugin-pwa vitest jsdom @testing-library/react @testing-library/jest-dom
```

اگر `create-vite` روی دایرکتوری غیرخالی پرسید، با گزینه `Ignore files and continue` ادامه بدهد؛ `public/legacy.html` و `docs/` باید بمانند.

- [ ] **Step 3: `vite.config.js` (base برای Pages + PWA)**

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/GYMBook/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'برنامه ورزشی GYMBook',
        short_name: 'GYMBook',
        start_url: '/GYMBook/',
        display: 'standalone',
        theme_color: '#0f172a',
        icons: [
          { src: '/GYMBook/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/GYMBook/icon-512.png', sizes: '512x512', type: 'image/png' }
        ]
      }
    })
  ]
})
```

آیکون‌ها: دو فایل PNG واقعی ۱۹۲ و ۵۱۲ در `public/` بگذار (می‌توان با ابزار آنلاین از ایموجی 🏋️ ساخت؛ محتوای باینری بخشی از همین task است، نبودش build را نمی‌شکند ولی warning PWA می‌دهد).

- [ ] **Step 4: `index.html` جدید (Vite entry)**

```html
<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="theme-color" content="#0f172a">
  <title>GYMBook | برنامه ورزشی</title>
  <link href="https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/Vazirmatn-font-face.css" rel="stylesheet">
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.jsx"></script>
</body>
</html>
```

- [ ] **Step 5: shell اولیه اپ**

`src/styles.css`: متغیرهای تم از Global Constraints را عیناً کپی کن + قوانین پایه `body{font-family:Vazirmatn,...}` از `public/legacy.html` (بلوک `:root` و `body` خطوط ۱۰ تا ۲۰ نسخه قدیمی).

`src/main.jsx`:

```jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App.jsx'
import './styles.css'

const qc = new QueryClient()
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={qc}>
      <HashRouter><App /></HashRouter>
    </QueryClientProvider>
  </React.StrictMode>
)
```

`src/App.jsx` موقتاً: `<div className="wrap"><h1>GYMBook</h1></div>` — در Task 3 جایگزین می‌شود.

- [ ] **Step 6: `.gitignore` و `.env.example`**

`.gitignore`: `node_modules/`, `dist/`, `dev-dist/`, `.env`, `.env.local`.
`.env.example`:

```
VITE_SUPABASE_URL=https://mtuccxoypjzvjffujgje.supabase.co
VITE_SUPABASE_ANON_KEY=
```

- [ ] **Step 7: workflow دیپلوی**

`.github/workflows/deploy.yml`:

```yaml
name: Test & Deploy
on:
  push: { branches: [main] }
permissions: { contents: read, pages: write, id-token: write }
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npm test
        env: { VITE_SUPABASE_URL: "https://api.example.invalid", VITE_SUPABASE_ANON_KEY: "public-anon-test-only-anon-key" }
      - run: npm run build
        env:
          VITE_SUPABASE_URL: ${{ vars.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
      - uses: actions/upload-pages-artifact@v3
        with: { path: dist }
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment: { name: github-pages, url: ${{ steps.deployment.outputs.page_url }} }
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 8: کانفیگ Pages روی Actions**

```powershell
$cred = "protocol=https`nhost=github.com`n`n" | git credential fill
$tok = ($cred | Select-String '^password=' | % Line).Substring(9)
$h = @{Authorization="Bearer $tok"; "User-Agent"="ci"; Accept="application/vnd.github+json"}
Invoke-RestMethod -Method Patch -Uri "https://api.github.com/repos/sadegh17/GYMBook/pages" -Headers $h -Body (@{build_type="workflow"}|ConvertTo-Json)
Invoke-RestMethod -Method Put -Uri "https://api.github.com/repos/sadegh17/GYMBook/actions/variables/VITE_SUPABASE_URL" -Headers $h -Body (@{value="https://mtuccxoypjzvjffujgje.supabase.co"}|ConvertTo-Json)
Invoke-RestMethod -Method Post -Uri "https://api.github.com/repos/sadegh17/GYMBook/actions/secrets/VITE_SUPABASE_ANON_KEY" -Headers $h -Body (@{value="<ANON_KEY_FROM_SUPABASE_SETTINGS>"}|ConvertTo-Json)
```

مقدار واقعی anon key از داشبورد Supabase (Settings → API) گرفته می‌شود؛ اگر در دسترس نبود از کاربر بخواه.

- [ ] **Step 9: تست محلی و commit**

`npm run dev` → صفحه با «GYMBook» باز شود؛ `npm run build` بدون خطا.

```bash
git add -A
git commit -m "feat: vite+react scaffold with PWA and pages CI"
```

---

### Task 2: مهاجرت دیتابیس — جداول، `is_admin()`، تریگر پروفایل، RLS

**Files:**
- Create: `supabase/migrations/0001_init.sql`
- Create: `docs/RUNBOOK.md` (بخش ۱)

**Interfaces:**
- Produces: جداول `profiles, exercises, programs, program_days, program_items, checks` + view `v_day_progress` + پالیسی‌های RLS. همه taskهای بعدی با همین نام‌ها کار می‌کنند.

- [ ] **Step 1: نوشتن کامل SQL مهاجرت**

`supabase/migrations/0001_init.sql`:

```sql
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

-- اولین اکانت = ادمین؛ بقیه member در انتظار تایید
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, role, approved)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email,'@',1)),
    case when (select count(*) from public.profiles) = 0 then 'admin' else 'member' end,
    (select count(*) from public.profiles) = 0
  );
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- درصد پیشرفت و کالری هر روز (پایه صفحه گزارش)
create view public.v_day_progress as
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
alter table public.v_day_progress enable row level security;
-- view با احراز هویت caller اجرا می‌شود تا فیلتر user_id در پالیسی کار کند
alter function public.is_admin() set search_path = public;

create policy "profiles: self read/write" on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_admin());
create policy "profiles: self update" on public.profiles
  for update to authenticated using (id = auth.uid())
  with check (id = auth.uid() and role = (select p.role from public.profiles p where p.id = auth.uid()));
create policy "profiles: admin manages" on public.profiles
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "exercises: read all authed, write admin" on public.exercises
  for select to authenticated using (true);
create policy "exercises: admin write" on public.exercises
  for insert to authenticated with check (public.is_admin());
create policy "exercises: admin update" on public.exercises
  for update to authenticated using (public.is_admin());
create policy "exercises: admin delete" on public.exercises
  for delete to authenticated using (public.is_admin());

create policy "programs: read authed" on public.programs for select to authenticated using (true);
create policy "programs: admin write" on public.programs for insert to authenticated with check (public.is_admin());
create policy "programs: admin update" on public.programs for update to authenticated using (public.is_admin());
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

create policy "progress: own or admin" on public.v_day_progress
  for select to authenticated using (user_id = auth.uid() or public.is_admin());
```

- [ ] **Step 2: اجرای مهاجرت در داشبورد**

داشبورد Supabase → SQL Editor → New → کل فایل را Paste → Run. Expected: `Success. No rows returned`. (CLI لازم نیست؛ پروژه کوچک.)

- [ ] **Step 3: صحت‌سنجی سریع**

در همان SQL Editor:

```sql
select count(*) from information_schema.tables
where table_schema='public'
  and table_name in ('profiles','exercises','programs','program_days','program_items','checks');
-- انتظار: 6
select count(*) from pg_views where schemaname='public' and viewname='v_day_progress';
-- انتظار: 1
```

- [ ] **Step 4: RUNBOOK + commit**

`docs/RUNBOOK.md` با عنوان «مراحل یک‌بارمصرف» و بخش ۱: اجرای `0001_init.sql` در SQL Editor + غیرفعال‌کردن **Confirm email** (Authentication → Sign In / Up).

```bash
git add supabase/ docs/RUNBOOK.md && git commit -m "feat: supabase schema, rls and profile bootstrap"
```

---

### Task 3: کلاینت Supabase، AuthContext، صفحه ورود، محافظت مسیرها

**Files:**
- Create: `src/lib/supabase.js`, `src/lib/auth.jsx`, `src/pages/Login.jsx`, `src/components/Protected.jsx`, `src/components/Layout.jsx`
- Modify: `src/App.jsx` (روت‌ها), `src/styles.css` (کارت فرم ورود)

**Interfaces:**
- Produces: `useAuth()` → `{ session, profile, loading, signIn, signUp, signOut }` که `profile` از `profiles` لاگین‌شده است. `Layout` با هدر/فوتر و `data-theme` روی body.

- [ ] **Step 1: `src/lib/supabase.js`**

```js
import { createClient } from '@supabase/supabase-js'
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
```

- [ ] **Step 2: `src/lib/auth.jsx`**

```jsx
import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase.js'
const Ctx = createContext(null)
export const useAuth = () => useContext(Ctx)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    let stop = true
    if (!session?.user) { setProfile(null); setLoading(false); return }
    setLoading(true)
    supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle()
      .then(({ data }) => { if (!stop) { setProfile(data); setLoading(false) } })
    return () => { stop = false }
  }, [session])

  const signIn = (email, password) => supabase.auth.signInWithPassword({ email, password })
  const signUp = (email, password, name) =>
    supabase.auth.signUp({ email, password, options: { data: { name }, captchaToken: undefined } })
  const signOut = () => supabase.auth.signOut()

  return <Ctx.Provider value={{ session, profile, loading, signIn, signUp, signOut }}>{children}</Ctx.Provider>
}
```

- [ ] **Step 3: `src/pages/Login.jsx`**

فرم دو حالتی «ورود / ساخت اکانت اول»: input ایمیل، رمز، (حالت ساخت: نام). دکمه‌ساخت اکانت فقط وقتی `profilesCount===0` یا کاربر لاگین‌شده ادمین است نمایش داده شود — پیاده‌سازی: کوئری `select count` غیرممکن است بدون لاگین؛ پس همیشه «ساخت اکانت» را با متن «در انتظار تایید ادمین» نمایش بده و مسیر ساختِ واقعی کاربر را در Task 10 پنل ادمین بگذار. این صفحه فقط ورود + یک لینک کوچک «ساخت ادمین اولیه» که خود问询 می‌کند: اگر table خالی است signup انجام می‌دهد (اگر کسی زودتر ساخته، عضو غیرتایید می‌شود — بی‌ضرر).
فرم:

```jsx
const { data } = await supabase.from('profiles').select('id', { count: 'exact', head: true })
const isFirstEver = data?.length === 0
```

اگر `isFirstEver` بود تب «ساخت اکانت ادمین» نشان بده (با فراخوانی `signUp`) وگرنه فقط ورود. بعد از موفقیت → `navigate('/')`. خطاها با پیام فارسی درجای فرم.

- [ ] **Step 4: `Protected.jsx` و `Layout.jsx`**

`Protected`: تا `loading` اسپینر ساده؛ بدون session → `<Navigate to="/login" />`؛ با session و بدون profile (تریگر تأخیر) → تلاش مجدد با رفرش ۲ ثانیه‌ای؛ `profile.approved === false` → صفحه «در انتظار تایید ادمین» + دکمه خروج.
`Layout`: هدر گرادیانی (مثل legacy) با نام کاربر، لینک‌های «امروز/گزارش/پروفایل» و «پنل ادمین» فقط برای `role==='admin'`؛ خروج در انتهای منو؛ `useEffect` → `document.body.dataset.theme = profile.theme`.

- [ ] **Step 5: روت‌ها در `App.jsx`**

```jsx
<Routes>
  <Route path="/login" element={<Login />} />
  <Route element={<Protected><Layout /></Protected>}>
    <Route index element={<Today />} />
    <Route path="report" element={<Report />} />
    <Route path="profile" element={<Profile />} />
    <Route path="admin/*" element={<AdminOnly><AdminRoutes /></AdminOnly>} />
  </Route>
</Routes>
```

`AdminOnly`: اگر `profile?.role!=='admin'` → `<Navigate to="/" />`. `Today/Report/Profile` در این task placeholder خالی‌اند و در taskهای بعدی پر می‌شوند. `Wrapped` در `App` با `AuthProvider`.

- [ ] **Step 6: تست دستی + commit**

`npm run dev`؛ ثبت‌نام اولین اکانت با ایمیل دلخواه تستی → ورود موفق → هدر نمایش نام. (پروژه واقعی Supabase در دسترس است؛ `VITE_*` را در `.env` محلی بگذار.)

```bash
git add -A && git commit -m "feat: supabase client, auth context and login flow"
```

---

### Task 4: توابع خالص محاسبات (TDD کامل)

**Files:**
- Create: `src/lib/calc.js`, `src/lib/fa.js`, `src/lib/__tests__/calc.test.js`, `vitest.config.js`

**Interfaces:**
- Produces:
  - `fa(n|string): string` تبدیل رقم فارسی
  - `calcKcal({ met, sec_per_rep }, item, weightKg): number`
  - `computeStreak(dateSet: Set<string>, today: string): number` — تاریخ‌ها `YYYY-MM-DD`
  - `bestStreak(dateSet: Set<string>): number`
  - `dayPercent(done, total): number` (صفر اگر total صفر)

- [ ] **Step 1: `vitest.config.js`**

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({
  plugins: [react()],
  test: { environment: 'jsdom', setupFiles: [] }
})
```

- [ ] **Step 2: نوشتن تست‌های شکست‌خورده**

`src/lib/__tests__/calc.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { fa, calcKcal, computeStreak, bestStreak, dayPercent } from '../calc.js'

describe('calcKcal', () => {
  const ex = { met: 8, sec_per_rep: 4 }
  it('rep-based: 3 sets x 12 reps x 4s at 70kg', () => {
    // work_min = 3*12*4/60 = 2.4 ; kcal = 8*3.5*70/200*2.4 = 23.52
    expect(calcKcal(ex, { sets: 3, reps: 12 }, 70)).toBeCloseTo(23.5, 1)
  })
  it('time-based (plank): reps are seconds, sec_per_rep=1', () => {
    // work_min = 3*40/60 = 2 ; kcal = 3.5*3.5*63/200*2 = 7.72
    expect(calcKcal({ met: 3.5, sec_per_rep: 1 }, { sets: 3, reps: 40 }, 63)).toBeCloseTo(7.7, 1)
  })
  it('rounds down to one decimal, never negative', () => {
    expect(calcKcal({ met: 0, sec_per_rep: 0 }, { sets: 0, reps: 0 }, 70)).toBe(0)
  })
})

describe('computeStreak', () => {
  it('counts consecutive days ending today', () => {
    const s = new Set(['2026-09-12', '2026-09-13', '2026-09-14'])
    expect(computeStreak(s, '2026-09-14')).toBe(3)
  })
  it('today missing but yesterday chain intact still counts (grace)', () => {
    const s = new Set(['2026-09-11', '2026-09-12', '2026-09-13'])
    expect(computeStreak(s, '2026-09-14')).toBe(3)
  })
  it('gap breaks streak', () => {
    const s = new Set(['2026-09-13', '2026-09-14'])
    expect(computeStreak(s.add('2026-09-10'), '2026-09-14')).toBe(2)
  })
  it('empty set is zero', () => expect(computeStreak(new Set(), '2026-09-14')).toBe(0))
})

describe('bestStreak', () => {
  it('longest run ignoring gaps', () => {
    const s = new Set(['2026-09-01', '2026-09-02', '2026-09-03', '2026-09-08', '2026-09-09'])
    expect(bestStreak(s)).toBe(3)
  })
})

describe('dayPercent', () => {
  it('100 when all done', () => expect(dayPercent(5, 5)).toBe(100))
  it('0 when no items scheduled', () => expect(dayPercent(0, 0)).toBe(0))
  it('rounds to nearest int', () => expect(dayPercent(2, 6)).toBe(33))
})

it('fa() converts digits', () => expect(fa('۰ check 45%')).toBe('۰ check ۴۵٪'))
```

- [ ] **Step 3: اجرا و مشاهده شکست**

`npx vitest run src/lib/__tests__/calc.test.js` → FAIL (ماژول نیست).

- [ ] **Step 4: پیاده‌سازی `src/lib/calc.js`**

```js
const FA = '۰۱۲۳۴۵۶۷۸۹'
export const fa = (v) => String(v).replace(/[0-9]/g, (d) => FA[d])

export function calcKcal(exercise, item, weightKg) {
  const workMin = (item.sets * item.reps * Number(exercise.sec_per_rep)) / 60
  const kcal = (Number(exercise.met) * 3.5 * Number(weightKg) / 200) * workMin
  return Math.max(0, Math.round(kcal * 10) / 10)
}

const toUTC = (d) => new Date(d + 'T00:00:00Z')
const addDays = (iso, n) => {
  const dt = toUTC(iso); dt.setUTCDate(dt.getUTCDate() + n)
  return dt.toISOString().slice(0, 10)
}

export function computeStreak(dateSet, today) {
  if (!dateSet.has(today) && !dateSet.has(addDays(today, -1))) return 0
  let cur = dateSet.has(today) ? today : addDays(today, -1)
  let n = 0
  while (dateSet.has(cur)) { n++; cur = addDays(cur, -1) }
  return n
}

export function bestStreak(dateSet) {
  const days = [...dateSet].sort()
  let best = 0, run = 0
  days.forEach((d, i) => {
    run = i > 0 && toUTC(d) - toUTC(days[i - 1]) === 86400000 ? run + 1 : 1
    if (run > best) best = run
  })
  return best
}

export const dayPercent = (done, total) => (total ? Math.round((done / total) * 100) : 0)
```

(تابع `fa` همین‌جا؛ `src/lib/fa.js` حذف — همه‌چیز از `calc.js` ایمپورت می‌شود. فایل `fa.js` را نساز.)

- [ ] **Step 5: پاس شدن تست‌ها + commit**

`npx vitest run` → سبز.

```bash
git add src/lib/ vitest.config.js && git commit -m "feat: calorie/streak/percent pure logic"
```

---

### Task 5: لایه داده Today — واکشی برنامه روز و تیک با کالری

**Files:**
- Create: `src/lib/api.js`, `src/lib/__tests__/api.test.js`

**Interfaces:**
- Consumes: `supabase`, `profile`, `calcKcal`
- Produces:
  - `fetchProgramTree(programId)` → `days: [{ ...day, items: [{ id, section, sets, reps, rest_sec, sort, exercise: {…exercises(*)} }] }]`
  - `fetchChecks(userId, date)` → rows
  - `toggleCheck({ userId, date, dayKey, item, exercise, weightKg, existing })` → اگر `existing` دارد حذف وگرنه insert با `kcal: calcKcal(...)`؛ نتیجه: rows جدید آن آیتم

- [ ] **Step 1: تست با mock**

`src/lib/__tests__/api.test.js` — `vi.mock('../supabase.js')` با builder زنجیره‌ای (`from().select().eq()`ها)؛ دو سناریو: toggle روی آیتم تیک‌نزده → `insert` با payload شامل `kcal` صحیح (محاسبه تست‌شده)؛ toggle روی رکورد موجود → `delete().eq('id', ...)`.

- [ ] **Step 2: شکست، سپس پیاده‌سازی `src/lib/api.js`**

```js
import { supabase } from './supabase.js'
import { calcKcal } from './calc.js'

export async function fetchProgramTree(programId) {
  if (!programId) return []
  const { data: days, error } = await supabase.from('program_days')
    .select('*, items:program_items(*, exercise:exercises(*))')
    .eq('program_id', programId).order('sort')
  if (error) throw error
  return days
}

export async function fetchChecks(userId, date) {
  const { data, error } = await supabase.from('checks').select('*').eq('user_id', userId).eq('date', date)
  if (error) throw error
  return data
}

export async function toggleCheck({ userId, date, dayKey, item, exercise, weightKg, existing }) {
  if (existing) {
    const { error } = await supabase.from('checks').delete().eq('id', existing.id)
    if (error) throw error
    return null
  }
  const { error } = await supabase.from('checks').insert({
    user_id: userId, date, day_key: dayKey, item_id: item.id,
    kcal: calcKcal(exercise, item, weightKg)
  })
  if (error) throw error
  return { item_id: item.id, date }
}
```

تست با mock دقیقاً همین contract را چک کند.

- [ ] **Step 3: سبز + commit**

```bash
git add src/lib/api.js src/lib/__tests__/api.test.js && git commit -m "feat: data layer for program fetch and check toggle"
```

---

### Task 6: صفحه «امروز» — نمایش برنامه، تیک، تایمر، کالری

**Files:**
- Create: `src/pages/Today.jsx`, `src/components/DayNav.jsx`, `src/components/ExerciseCard.jsx`, `src/components/TimerBar.jsx`
- Modify: `src/App.jsx` (رجوع به Today واقعی)

**Interfaces:**
- Consumes: `useAuth`, `api.fetchProgramTree/fetchChecks/toggleCheck`, `calc.fa/calcKcal/dayPercent`
- Produces: صفحه کامل روز. انتخاب پیش‌فرض روز از `todayIndex()` (همان نگاشت legacy: ش=۰ … چهارشنبه=۴، پنج/جمعه→۰). `currentDayKey` در state.

- [ ] **Step 1: `Today.jsx`** — query‌ها: `['program', profile.program_id]` و `['checks', userId, date]` با react-query. `date = localISO()` (تاریخ محلی به `YYYY-MM-DD`). خطای شبکه → بنر قرمز. اگر برنامه نداشت → «هنوز برنامهای به شما اختصاص داده نشده».
ساختار: `DayNav` (دکمه‌های روزها از days)، هدر روز (title/sub، نوار پیشرفت `dayPercent(mainDone, mainTotal)`)، سه سکشن warm/main/cool با `ExerciseCard`، تجمیع کالری روز: `sum(checks.kcal)`.

- [ ] **Step 2: `ExerciseCard.jsx`** — عین مارک‌اپ legacy: ردیف `num/meta/tags/check` + `gifbox` (img با `onError` → جایگزین «مشاهده حرکت در سایت» لینک `exercise.page_url`) + `how` + `tip` + برچسب `≈{fa(kcal)} کیلوکالری` روی کارت (از calcKcal پیش‌بینی، قبل از تیک). کلیک چک → `toggleCheck` با optimistic `useMutation` و `invalidateQueries(['checks'])`؛ در حالت خطا undo + پیام.

- [ ] **Step 3: `TimerBar.jsx`** — پورت کامل منطق تایمر legacy (خطوط ۷۲۲–۷۵۴): `len` با چرخه ۴۵→۶۰→۳۰، شروع/توقف/ریست، `alert` پایان، `navigator.vibrate` در حلقه `if`. جای مقدار پیش‌فرض ۴۵: `rest_sec` آخرین آیتم تیک‌خورده یا همان چرخه دستی. `padding-bottom` با `env(safe-area-inset-bottom)`.

- [ ] **Step 4: تست RTL + commit**

`ExerciseCard.test.jsx`: رندر با props فیک؛ کلیک روی چک → `onToggle` صدابقدا؛ اگر `done` است کلاس `done`. `npx vitest run` سبز.

```bash
git add src/pages/Today.jsx src/components/ && git commit -m "feat: today view with check-ins kcal and timer"
```

---

### Task 7: صفحه پروفایل کاربر (وزن و رمز)

**Files:**
- Create: `src/pages/Profile.jsx`

**Interfaces:**
- Produces: فرم `name/weight_kg` → `update profiles`؛ فرم رمز → `supabase.auth.updateUser({ password })`؛ نمایش پیام موفقیت.

- [ ] **Step 1: پیاده‌سازی فرم** — ورودی وزن `number step=0.1 min=20 max=250`؛ بعد از ذخیره `queryClient.invalidateQueries(['profile'])` تا کالری‌های پیش‌بینی Today به‌روز شود.
- [ ] **Step 2: تست صحت‌سنجی خالص** `validateWeight(v)` داخل هم‌فایل export → تست Vitest.
- [ ] **Step 3: commit** `feat: user profile with weight and password change`

---

### Task 8: گزارش — تقویم ماهانه + استریک

**Files:**
- Create: `src/pages/Report.jsx`, `src/components/MonthCalendar.jsx`, `src/lib/__tests__/calendar.test.js`

**Interfaces:**
- Consumes: `supabase.from('v_day_progress').select('*').gte('date', ...).lte('date', ...)`
- Produces: `monthMatrix(year, month): (string|null)[]` — خانه‌های خالی ابتدا/انتها (تست‌پذیر، خالص)؛ صفحه گزارش با تقویم.

- [ ] **Step 1: تست خالص `monthMatrix`** — مثال: ۲۰۲۶-۰۹ (شنبه‌محور): ماه ۳۰ روزه، اول ماه چهارشنبه → خانه‌های `sat..tue` ردیف اول null.
- [ ] **Step 2: `monthMatrix` + `MonthCalendar.jsx`** — شبکه ۷×N با سرستون ش‌ی‌د‌س‌چ‌پ‌ج؛ هر روز: عدد شمسی (`Intl.DateTimeFormat('fa-IR',{day:'numeric'})` روی `date`)؛ اگر `main_total>0`: حلقه پیشرفت با `dayPercent(main_done, main_total)` (کامل=سبز پر، ناقص=سبز کم‌رنگ، بدون تیک=خط‌دار خالی) + `≈{fa(round(kcal))} kcal`.
- [ ] **Step 3: کارت‌های خلاصه** — `computeStreak`/`bestStreak` روی `Set(distinct dates)` با `today` محلی؛ مجموع کالری ماه.
- [ ] **Step 4: تست‌ها سبز + commit** `feat: monthly report calendar and streaks`

---

### Task 9: نمودار هفتگی + تاریخچه هر حرکت

**Files:**
- Create: `src/components/WeekChart.jsx`, `src/components/ExerciseHistory.jsx`

- [ ] **Step 1: `WeekChart.jsx`** — ۴ هفته اخیر از `v_day_progress` کلاینت‌ساید گروه‌بندی (شنبه تا جمعه)؛ Recharts `BarChart` دو سری: مجموع kcal و میانگین `dayPercent`؛ فارسی‌سازی محورها. بدون تست بصری — رندر در jsdom بدون throw تست شود.
- [ ] **Step 2: `ExerciseHistory.jsx`** — کوئری `checks` با `item:program_items(exercise:exercises(name_fa))` در ۹۰ روز اخیر → گروه‌بندی client-side → جدول: نام حرکت | تعداد تیک | مجموع ست | آخرین اجرا (شمسی).
- [ ] **Step 3: وصل‌کردن به `Report.jsx` + commit** `feat: weekly chart and per-exercise history`

---

### Task 10: پنل ادمین — کاربران

**Files:**
- Create: `src/pages/admin/Users.jsx`, `src/pages/admin/AdminRoutes.jsx` (با مسیرهای خالی exercises/programs که taskهای ۱۱-۱۲ پر می‌کنند)

**Interfaces:**
- Consumes: `signUp` از auth، `profiles/programs` tables
- Produces: CRUD پروفایل + ساخت اکانت.

- [ ] **Step 1: ساخت اکانت** — فرم (نام، ایمیل، رمز موقت، وزن، theme، برنامه). فراخوانی `signUp` با email/pass — چون «Confirm email» خاموش است اکانت تأیید می‌شود اما **نشست کاربر جدید جای کاربر ادمین را می‌گیرد**: بلافاصله `supabase.auth.signOut()` و `queryClient.invalidateQueries(['profile'])`. پروفایل تازه‌ساخته را با update به `approved=true, role, weight_kg, theme, program_id` برسان (شناسایی با `name`+ بی‌تأخیر select روی latest).
- [ ] **Step 2: جدول لیست کاربران** — select کامل profiles؛ inline edit وزن/تایید/نقش/برنامه (آپدیت با RLS admin مجاز است).
- [ ] **Step 3: ثبت در `App.jsx`** `admin/*` → `AdminRoutes` با مسیر `users`.
- [ ] **Step 4: commit** `feat: admin users panel (create, approve, assign program)`

---

### Task 11: بانک حرکات (admin)

**Files:**
- Create: `src/pages/admin/Exercises.jsx`

- [ ] **Step 1:** جدول بانک + فرم افزودن/ویرایش: `name_fa/name_en/gif_url/page_url/how_to/tip/met/sec_per_rep`. صحت‌سنجی: نام فارسی الزامی، `met` بین ۱ تا ۱۵، `sec_per_rep` بین ۰.۵ تا ۲۰ — تابع خالص `validateExercise(form)` + ۳ تست Vitest.
- [ ] **Step 2:** حذف فقط اگر در `program_items` نباشد (count چک شود؛ پیام «در ۳ برنامه استفاده شده»).
- [ ] **Step 3:** commit `feat: admin exercise bank crud`

---

### Task 12: ساخت‌گر برنامه (admin)

**Files:**
- Create: `src/pages/admin/Programs.jsx`

- [ ] **Step 1:** لیست programs + «برنامه جدید». صفحه ویرایش: تب هر ۷ روز؛ داخل روز → سه سکشن warm/main/cool؛ «افزودن حرکت از بانک» (dropdown بانک) → row قابل‌ویرایش (sets/reps/rest_sec/sort با دکمه ↑↓)؛ حذف row.
- [ ] **Step 2:** تغییرات = upsert/delete آنی روی `program_items` (هر ردیف یک mutation مستقل)؛ ساخت/حذف روز خالی مجاز نیست — روزها در seed ساخته می‌شوند و ویرایش عنوان/عنوان‌فرعی روز inline است.
- [ ] **Step 3:** تابع خالص `moveItem(list, index, dir)` + تست جاابه‌جایی sort. commit `feat: admin program builder`

---

### Task 13: سید بانک حرکات و دو برنامه (`supabase/seed.sql`)

**Files:**
- Create: `supabase/seed.sql`

**Interfaces:**
- Consumes: محتوای `public/legacy.html` (آرایه‌های `WARM, COOL, WARM_G, COOL_G, DATA_SADEQ, DATA_SAGHAR`) — استخراج دقیق؛ هر ۳۰+ حرکت یک‌بار در بانک.
- Produces: مقادیر MET/sec_per_rep زیر.

- [ ] **Step 1: جدول MET/sec (مقادیر نهایی سید)**

| حرکت | met | sec_per_rep |
|---|---|---|
| چرخش شانه / کشش‌ها / ساق / کرانچ / پلانک پهلو / پارویی تک‌دست | 3.5 | 2 (ساق/pull: 3) |
| جلو بازو/چکشی/تمرکزی/کیک‌بک/شراگ/پرس بالای سر/کشش همسترینگ | 5 | 4 |
| گربه‌گاو (3.5/4)، پل باسن (4/3)، هیپ تراست (4/3)، Hip Abduction (3/3) |
| شنا/پرس سینه/فلای سینه (8/4) | بارفیکس/چین‌آپ (8/5) | زیربغل Row (5/4) |
| فلای معکوس (4/4)، سوپرمن (3/4)، Bird Dog (3/6) |
| پلانک (3.5/1=ثانیه‌ای)، Dead Bug (3.5/6)، Lying Leg Raise (4/3)، کرانچ (3.5/2)، پل پهلو (3.5/1 ثانیه‌ای) |
| اسکات گابلت/سومو/لانژ/ددلیفت RDL (5/4) |
| پروانه (8/1 ثانیه‌ای)، کرم‌حرکت (5/8)، کوهنوردی (8/1 ثانیه‌ای)، برپی (8/6) |
| پرس سرشانه (5/4)، نشر جانب (4/4)، Shoulder Tap (6/4)، چرخش روسی (4/2)، کرانچ دوچرخه (5/2) |
| اسکات پرشی/Squat Tuck (8/4)، اسکات کازاک (5/5)، لانژ معکوس (5/4)، پل باسن دمبل (4/3) |
| تراستر (6/4)، اسنچ (6/5)، رنیگید رو (6/4)، استپ‌اپ (5/4) |

(حرکت در جدول نیست؟ از همان مقادیر خانواده‌اش استفاده کن؛ سید نباید با 0 بماند.)

- [ ] **Step 2: نوشتن seed.sql** — `with` و متغیرهای `::uuid` لازم نیست: برای هر برنامه از `insert ... returning` در DO block استفاده کن:

```sql
do $$
declare p_id uuid; d_id uuid; ex_id uuid;
begin
  insert into programs (title, description) values
    ('قدرتی — صادق','برنامه ۳۰ دقیقه‌ای قدرت و عضله‌سازی') returning id into p_id;
  insert into program_days (program_id, day_key, day_label, focus, title, sub, sort)
    values (p_id,'sat','شنبه','بازو','شنبه — بازو (جلوبازو و پشت‌بازو)','تمرکز روی جلوبازو و پشت‌بازو',1), ...;
  -- warm/cool مشترک هر روز در همان روز اینسرت شوند (تکرار مجاز)
  select id into ex_id from exercises where name_fa='چرخش شانه و بازو';
  ...
end $$;
```

محتوا: ۵ روز × (warm ۲ + main ۶ (صادق: ۶؛ روز شکم ۷) + cool ۱) و معادل‌های ساغر/نازی از legacy. حرکات بانک: dedupe بر اساس name_en (نام انگلیسی یکسان = یک رکورد).
پایان فایل: ساخت ادمین نیست — فقط محتوا.

- [ ] **Step 3: اجرا در SQL Editor + صحت‌سنجی**

```sql
select (select count(*) from exercises) e, (select count(*) from programs) p,
       (select count(*) from program_days) d, (select count(*) from program_items) i;
-- انتظار تقریبی: e≈35  p=2  d=10  i≈85
```

- [ ] **Step 4: commit** `feat: seed exercise bank and both programs`

---

### Task 14: بوت‌استرپ سه کاربر اولیه + اتصال برنامه‌ها

**Files:**
- Modify: `docs/RUNBOOK.md` (بخش ۲)

- [ ] **Step 1:** با anon key در `/.env` محلی و صفحه `/login` اپ (یا curl): ثبت‌نام `sadeq@gymbook.app` → تریگر آن را ادمین/تایید می‌کند. سپس لاگین ادمین و از `/admin/users` ساخت ساغر و نازی با رمزهای موقت و وزن ۷۰/۶۳/۶۳ و theme مربوطه. (رمزها در ریپو نوشته نمی‌شوند؛ در چت به کاربر داده شده و چرخش‌شان توصیه شود.)
- [ ] **Step 2:** تخصیص `program_id`ها از پنل: صادق→قدرتی؛ ساغر و نازی→چربی‌سوزی (همان رکورد).
- [ ] **Step 3: صحت‌سنجی acceptance spec بندهای ۱، ۲، ۳** (ورود سه‌نفره، دسترسی پنل فقط صادق، نازی = برنامه ساغر).
- [ ] **Step 4: commit** `docs: bootstrap runbook for initial users`

---

### Task 15: PWA نهایی + ریزش‌گیری iOS + حذف وابستگی استاتیک

- [ ] **Step 1:** تست «افزودن به صفحه اصلی» در Safari آیفون (اگر دسترسی تست نیست: بررسی manifest با `npx vite-plugin-pwa check` معادل `npm run build` و بازکردن `dist/manifest.webmanifest`).
- [ ] **Step 2:** اطمینان از `viewport-fit=cover` + `env(safe-area-inset-*)` در TimerBar/هدر؛ عدم افق‌شکنی کارت‌ها (`min-width:0` روی فلکس‌های تودرتو — همان درس legacy).
- [ ] **Step 3:** لینک «نسخه ساده قدیمی» از footer به `legacy.html` اضافه شود (حفظ یا حذف با سلیقه کاربر).
- [ ] **Step 4:** push → سبز شدن Actions workflow → بازکردن `https://sadegh17.github.io/GYMBook/` در آیفون با URL واقعی و تست end-to-end ورود/تیک/هم‌رسانی بین دو مرورگر.
- [ ] **Step 5:** commit `chore: pwa polish and legacy link`

---

## Coverage self-review

- spec §۲ فیچرها → task: ورود/ادمین(۳,۱۰) بانک(۱۱) برنامه شخصی(۱۲,۱۳) گزارش per-user(۸,۹) کالری(۴,۵,۶) سه کاربر seed(۱۳,۱۴)
- spec §۶ فرمول → Task 4 دقیقاً؛ §۷ بوت‌استرپ → trigger Task 2 + Task 14؛ §۱۰ تست → ۴,۵,۶,۷,۸,۱۲,۱۵؛ §۱۱ امنیت → policies Task 2، بدون راز در repo (Task 1 step 8 secrets).
- نیازهای spec با taskهای ۸-۹ (گزارش) پوشش کامل؛ `theme` در profiles اضافه شد (spec §۵ اشاره نکرده بود — جزیی، برای رنگ ساغر/صادق).
- ریسک شناخته‌شده: نشستی که `signUp` ادمین در Task 10 می‌گیرد → با signOut فوری مهار شده.

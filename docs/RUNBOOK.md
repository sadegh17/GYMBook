# مراحل یک‌بارمصرف (RUNBOOK)

کارهایی که فقط **یک بار** روی پروژه Supabase انجام می‌شوند. CLI لازم نیست؛ همه‌چیز از داشبورد.

---

## ۱) اجرای مهاجرت دیتابیس

پیش‌نیاز: پروژه Supabase با URL `https://mtuccxoypjzvjffujgje.supabase.co`.

### ۱.۱ اجرای SQL

1. داشبورد Supabase → **SQL Editor** → **New query**.
2. محتوای کامل فایل [`supabase/migrations/0001_init.sql`](../supabase/migrations/0001_init.sql) را Paste کن.
3. **Run**.

Expected: `Success. No rows returned`.

> این فایل را **دوباره اجرا نکن** (جداول با `create table` ساده ساخته می‌شوند و اجرای مجدد خطای «already exists» می‌دهد). اگر اشتباهی رخ داد و پروژه خالی بود: drop کردن و اجرای مجدد مجاز است.

### ۱.۲ صحت‌سنجی سریع

در همان SQL Editor، این دو کوئری را اجرا کن:

```sql
select count(*) from information_schema.tables
where table_schema='public'
  and table_name in ('profiles','exercises','programs','program_days','program_items','checks');
-- انتظار: 6

select count(*) from pg_views where schemaname='public' and viewname='v_day_progress';
-- انتظار: 1
```

اختیاری (بررسی پالیسی‌ها و تریگر):

```sql
select t.tgname from pg_trigger t
  join pg_class c on c.oid = t.tgrelid
  join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'auth' and c.relname = 'users' and not t.tgisinternal;
-- انتظار: on_auth_user_created

select count(*) from pg_policies where schemaname = 'public';
-- انتظار: 18
```

### ۱.۳ غیرفعال‌کردن تأیید ایمیل

**Authentication** → **Sign In / Up** → بخش **Email** → گزینه **Confirm email** را **خاموش** کن → **Save**.

بدون این کار، ثبت‌نام اولین ادمین ایمیل تأیید می‌فرستد و نشست خودکار برقرار نمی‌شود (Flow لاگین اپ روی نشست فوری بعد از `signUp` ساخته شده است).

### ۱.۴ اجرای مهاجرت ۰۰۰۲ (برنامه‌های شخصی کاربر)

> پیش‌نیاز: اجرای موفق ۱.۱. این مهاجرت مدل برنامه را به «بخش‌های با نام دلخواه» و
> «حذف نرم» ارتقا می‌دهد و دادهٔ موجود را خودکار نگاشت می‌کند.

1. داشبورد Supabase → **SQL Editor** → **New query**.
2. محتوای کامل [`supabase/migrations/0002_user_programs.sql`](../supabase/migrations/0002_user_programs.sql) را Paste کن → **Run**.
3. اگر `seed.sql` قبلاً اجرا شده، لازم به تکرار نیست (نگاشت در همین مهاجرت انجام می‌شود). برای **پروژه نو**: به‌ترتیب `0001` → `0002` → `seed.sql` را اجرا کن.

صحت‌سنجی:

```sql
select count(*) from information_schema.tables
 where table_schema='public' and table_name='program_sections';           -- انتظار: 1
select count(*) from pg_policies where schemaname='public';               -- انتظار: 20
select count(*) from pg_views where viewname='v_day_progress';            -- انتظار: 1
select count(*) from pg_trigger where tgname='programs_limit_before_insert' and not tgisinternal; -- انتظار: 1
```

---

بخش ۲ (ساخت سه کاربر اولیه و تخصیص برنامه‌ها) در انتهای پیاده‌سازی به همین فایل اضافه می‌شود.

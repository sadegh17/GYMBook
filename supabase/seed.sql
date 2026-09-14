-- GYMBook — سید بانک حرکات و دو برنامه (Task 13)
-- استخراج‌شده از public/legacy.html (WARM, COOL, WARM_G, COOL_G, DATA_SADEQ, DATA_SAGHAR).
-- یک‌بار در Supabase SQL Editor اجرا شود (بعد از 0001_init.sql، 0002_auth_approval.sql و 0003_user_programs.sql).
-- idempotent: اگر جدول programs پر باشد، سید رد می‌شود.

do $$
declare
  p_id uuid;
  d_sat uuid; d_sun uuid; d_mon uuid; d_tue uuid; d_wed uuid;
  ex_id uuid;
begin
  if exists (select 1 from programs) then
    raise notice 'seed skipped: programs already exist';
    return;
  end if;

  ------------------------------------------------------------------
  -- بانک حرکات: 52 حرکت (dedupe بر اساس name_en — نام انگلیسی یکسان = یک رکورد)
  ------------------------------------------------------------------
  insert into exercises (name_fa, name_en, gif_url, page_url, how_to, tip, met, sec_per_rep) values
    ('چرخش شانه و بازو', 'Arm Circles', 'https://fitnessprogramer.com/wp-content/uploads/2021/07/Arm-Circles_Shoulders.gif', 'https://fitnessprogramer.com/exercise/arm-circles/',
     'صاف بایست، دست‌ها را از دو طرف باز کن و از شانه دایره‌های آرام بزن؛ ۲۰ ثانیه رو به جلو و ۲۰ ثانیه رو به عقب.',
     'فقط برای گرم کردن مفصل است؛ سرعت را زیاد نکن.',
     3.5, 2);
  insert into exercises (name_fa, name_en, gif_url, page_url, how_to, tip, met, sec_per_rep) values
    ('کشش گربه و گاو (نرمش کمر)', 'Cat-Cow Stretch', 'https://fitnessprogramer.com/wp-content/uploads/2021/02/cat-cow.gif', 'https://fitnessprogramer.com/exercise/cat-cow-pose/',
     'روی زانو و کف دست بنشین. نفس بده و کمر را آرام گرد کن، بعد نفس بگیر و کمر را آرام گود کن.',
     'حرکت باید کند و بدون درد باشد.',
     3.5, 4);
  insert into exercises (name_fa, name_en, gif_url, page_url, how_to, tip, met, sec_per_rep) values
    ('جلوبازو دمبل ایستاده', 'Dumbbell Biceps Curl', 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Dumbbell-Curl.gif', 'https://fitnessprogramer.com/exercise/dumbbell-curl/',
     'صاف بایست، دمبل‌ها کنار ران و کف دست رو به جلو. <b>آرنج را چسبیده به پهلو نگه دار</b> و فقط ساعد را تا نزدیک شانه بالا بیاور، سپس آرام پایین ببر.',
     'اگر بدنت تاب می‌خورد یعنی دمبل سنگین است.',
     5, 4);
  insert into exercises (name_fa, name_en, gif_url, page_url, how_to, tip, met, sec_per_rep) values
    ('جلوبازو چکشی', 'Dumbbell Hammer Curl', 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Hammer-Curl.gif', 'https://fitnessprogramer.com/exercise/hammer-curl/',
     'مثل حرکت قبل، اما کف دست‌ها رو به هم باشد (طرز گرفتن چکش). دمبل را تا نزدیک شانه بالا ببر و آرام برگردان.',
     'این حالت روی ساعد هم کار می‌کند و برای مچ راحت‌تر است.',
     5, 4);
  insert into exercises (name_fa, name_en, gif_url, page_url, how_to, tip, met, sec_per_rep) values
    ('جلوبازو تمرکزی نشسته', 'Concentration Curl', 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Concentration-Curl.gif', 'https://fitnessprogramer.com/exercise/concentration-curl/',
     'روی لبه تخت یا صندلی بنشین، پاها باز. آرنج دست دمبل‌دار را به داخل ران تکیه بده و دمبل را آرام بالا و پایین ببر.',
     'چون آرنج تکیه دارد، تقلب در حرکت ممکن نیست؛ وزن سبک‌تر بگیر.',
     5, 4);
  insert into exercises (name_fa, name_en, gif_url, page_url, how_to, tip, met, sec_per_rep) values
    ('پشت‌بازو دمبل خم (کیک‌بک)', 'Dumbbell Kickback', 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Dumbbell-Kickback.gif', 'https://fitnessprogramer.com/exercise/dumbbell-kickback/',
     'کمی از کمر به جلو خم شو با کمر صاف، بازوها را کنار بدن و موازی زمین نگه دار. حالا فقط ساعد را به عقب صاف کن و برگردان.',
     'بازو نباید بالا و پایین برود؛ فقط آرنج باز و بسته می‌شود.',
     5, 4);
  insert into exercises (name_fa, name_en, gif_url, page_url, how_to, tip, met, sec_per_rep) values
    ('پشت‌بازو بالای سر نشسته', 'Seated Dumbbell Triceps Extension', 'https://fitnessprogramer.com/wp-content/uploads/2021/06/Seated-Dumbbell-Triceps-Extension.gif', 'https://fitnessprogramer.com/exercise/seated-dumbbell-triceps-extension/',
     'بنشین و یک دمبل را با دو دست بالای سر بگیر. آرنج‌ها نزدیک گوش، دمبل را آرام پشت سر پایین ببر و دوباره بالا بیاور.',
     'با وزن سبک شروع کن و پایین آوردن را کنترل‌شده انجام بده.',
     5, 4);
  insert into exercises (name_fa, name_en, gif_url, page_url, how_to, tip, met, sec_per_rep) values
    ('شراگ (بالا کشیدن شانه)', 'Dumbbell Shrug', 'https://fitnessprogramer.com/wp-content/uploads/2021/04/Dumbbell-Shrug.gif', 'https://fitnessprogramer.com/exercise/dumbbell-shrug/',
     'دمبل‌ها را کنار بدن بگیر و فقط شانه‌ها را تا نزدیک گوش بالا بکش، یک ثانیه نگه دار و رها کن.',
     'شانه را نچرخان؛ فقط بالا و پایین.',
     5, 4);
  insert into exercises (name_fa, name_en, gif_url, page_url, how_to, tip, met, sec_per_rep) values
    ('کشش پشت ران ایستاده', 'Standing Hamstring Stretch', 'https://fitnessprogramer.com/wp-content/uploads/2021/05/Standing-Hamstring-Stretch.gif', 'https://fitnessprogramer.com/exercise/standing-hamstring-stretch/',
     'یک پا را کمی جلو بگذار، پنجه بالا، از کمر آرام به جلو خم شو تا کشش پشت ران را حس کنی و نگه دار.',
     'زانو را قفل نکن و بالا و پایین نپر.',
     5, 4);
  insert into exercises (name_fa, name_en, gif_url, page_url, how_to, tip, met, sec_per_rep) values
    ('بارفیکس دست‌باز', 'Pull Up', 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Pull-up.gif', 'https://fitnessprogramer.com/exercise/pull-up/',
     'میله را کمی بازتر از عرض شانه بگیر، کف دست رو به جلو. شانه‌ها را پایین بکش و بدن را بالا ببر تا چانه نزدیک میله شود، سپس <b>آرام</b> پایین بیا.',
     'اگر نمی‌توانی: روی چهارپایه بایست و فقط بخش پایین‌آمدن را ۵ ثانیه‌ای و کنترل‌شده انجام بده.',
     8, 5);
  insert into exercises (name_fa, name_en, gif_url, page_url, how_to, tip, met, sec_per_rep) values
    ('بارفیکس دست‌جمع (کف دست به سمت خود)', 'Chin Up', 'https://fitnessprogramer.com/wp-content/uploads/2021/03/Chin-Up.gif', 'https://fitnessprogramer.com/exercise/chin-up/',
     'میله را به عرض شانه و با کف دست رو به صورت خود بگیر و بالا بکش. این حالت راحت‌تر است و جلوبازو هم کمک می‌کند.',
     'پاها را جمع نگه دار و تاب نخور.',
     8, 5);
  insert into exercises (name_fa, name_en, gif_url, page_url, how_to, tip, met, sec_per_rep) values
    ('زیربغل دمبل تک‌دست (پارویی)', 'Dumbbell Row', 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Dumbbell-Row.gif', 'https://fitnessprogramer.com/exercise/dumbbell-row/',
     'یک دست و یک زانو را روی تخت بگذار، کمر صاف و موازی زمین. دمبل را از پایین تا کنار پهلو بالا بکش و آرام پایین ببر.',
     'آرنج را به بدن نزدیک نگه دار و کمر را نچرخان.',
     5, 4);
  insert into exercises (name_fa, name_en, gif_url, page_url, how_to, tip, met, sec_per_rep) values
    ('فلای معکوس دمبل', 'Dumbbell Reverse Fly', 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Dumbbell-Reverse-Fly.gif', 'https://fitnessprogramer.com/exercise/dumbbell-reverse-fly/',
     'از کمر خم شو با کمر صاف، دمبل‌ها زیر سینه. با آرنج کمی خم، دست‌ها را مثل بال از دو طرف باز کن تا هم‌سطح شانه و آرام برگردان.',
     'دمبل سبک کافی است؛ برای صاف شدن قوز عالی است.',
     4, 4);
  insert into exercises (name_fa, name_en, gif_url, page_url, how_to, tip, met, sec_per_rep) values
    ('سوپرمن (تقویت کمر روی زمین)', 'Superman', 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Superman-exercise.gif', 'https://fitnessprogramer.com/exercise/superman/',
     'روی شکم دراز بکش، دست‌ها جلو. هم‌زمان دست‌ها و پاها را کمی از زمین بلند کن، ۲ ثانیه نگه دار و پایین بیاور.',
     'خیلی بالا نرو؛ فقط چند سانت کافی است.',
     3, 4);
  insert into exercises (name_fa, name_en, gif_url, page_url, how_to, tip, met, sec_per_rep) values
    ('پرنده-سگ (تعادل و کمر)', 'Bird Dog', 'https://fitnessprogramer.com/wp-content/uploads/2022/07/Bird-Dog.gif', 'https://fitnessprogramer.com/exercise/bird-dog/',
     'چهار دست و پا بنشین. دست راست را به جلو و پای چپ را به عقب صاف کن، ۲ ثانیه نگه دار و عوض کن.',
     'لگن نباید بچرخد؛ حرکت باید آرام باشد.',
     3, 6);
  insert into exercises (name_fa, name_en, gif_url, page_url, how_to, tip, met, sec_per_rep) values
    ('شنا (پوش‌آپ)', 'Push Up', 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Push-Up.gif', 'https://fitnessprogramer.com/exercise/push-up/',
     'دست‌ها کمی بازتر از شانه روی زمین، بدن از سر تا پاشنه در یک خط صاف. آرنج‌ها را خم کن تا سینه نزدیک زمین شود و برگرد بالا.',
     'اگر سخت است روی زانو انجام بده یا دست‌ها را روی لبه تخت بگذار.',
     8, 4);
  insert into exercises (name_fa, name_en, gif_url, page_url, how_to, tip, met, sec_per_rep) values
    ('پرس سینه دمبل روی زمین', 'Dumbbell Press', 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Dumbbell-Press-1.gif', 'https://fitnessprogramer.com/exercise/dumbbell-press/',
     'به پشت دراز بکش، زانوها خم. دمبل‌ها را کنار سینه بگیر و صاف به سمت بالا فشار بده، بعد آرام تا کنار سینه پایین بیاور.',
     'روی زمین دامنه حرکت کمتر و برای شانه امن‌تر است.',
     8, 4);
  insert into exercises (name_fa, name_en, gif_url, page_url, how_to, tip, met, sec_per_rep) values
    ('فلای سینه دمبل', 'Dumbbell Fly', 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Dumbbell-Fly.gif', 'https://fitnessprogramer.com/exercise/dumbbell-fly/',
     'به پشت دراز بکش، دمبل‌ها بالای سینه و آرنج کمی خم. دست‌ها را مثل بغل کردن از دو طرف باز کن و دوباره جمع کن.',
     'آرنج را در تمام حرکت کمی خم نگه دار.',
     8, 4);
  insert into exercises (name_fa, name_en, gif_url, page_url, how_to, tip, met, sec_per_rep) values
    ('پل باسن', 'Glute Bridge', 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Glute-Bridge-.gif', 'https://fitnessprogramer.com/exercise/glute-bridge/',
     'به پشت دراز بکش، زانوها خم و کف پاها روی زمین. باسن را با فشار عضلات باسن بالا ببر تا بدن از زانو تا شانه یک خط شود، ۲ ثانیه نگه دار و پایین بیاور.',
     'برای سخت‌تر شدن یک دمبل را روی لگن بگذار.',
     4, 3);
  insert into exercises (name_fa, name_en, gif_url, page_url, how_to, tip, met, sec_per_rep) values
    ('هیپ تراست (باسن با تکیه بر تخت)', 'Bodyweight Hip Thrust', 'https://fitnessprogramer.com/wp-content/uploads/2022/04/bodyweight-hip-thrust.gif', 'https://fitnessprogramer.com/exercise/bodyweight-hip-thrust/',
     'بالاتنه را روی لبه تخت یا مبل تکیه بده، کف پاها روی زمین. لگن را پایین ببر و بعد با فشار باسن تا حالت صاف بالا بیاور.',
     'چانه را کمی به سینه نزدیک نگه دار و کمر را بیش از حد گود نکن.',
     4, 3);
  insert into exercises (name_fa, name_en, gif_url, page_url, how_to, tip, met, sec_per_rep) values
    ('باز کردن پا به پهلو (ایستاده)', 'Standing Hip Abduction', 'https://fitnessprogramer.com/wp-content/uploads/2021/05/Standing-Hip-Abduction-1.gif', 'https://fitnessprogramer.com/exercise/standing-hip-abduction/',
     'صاف بایست و دست به دیوار بگیر. یک پا را صاف به پهلو باز کن تا حس کشش در کنار باسن، بعد آرام برگردان.',
     'بالاتنه را کج نکن؛ فقط پا حرکت کند.',
     3, 3);
  insert into exercises (name_fa, name_en, gif_url, page_url, how_to, tip, met, sec_per_rep) values
    ('کرانچ (دراز و نشست کوتاه)', 'Crunch', 'https://fitnessprogramer.com/wp-content/uploads/2015/11/Crunch.gif', 'https://fitnessprogramer.com/exercise/crunch/',
     'به پشت دراز بکش، زانوها خم و دست‌ها کنار گوش. فقط سر و شانه‌ها را چند سانت از زمین بلند کن و آرام برگرد.',
     'با دست به گردن فشار نیاور؛ چانه کمی از سینه فاصله داشته باشد.',
     3.5, 2);
  insert into exercises (name_fa, name_en, gif_url, page_url, how_to, tip, met, sec_per_rep) values
    ('بالا آوردن پا خوابیده', 'Lying Leg Raise', 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Lying-Leg-Raise.gif', 'https://fitnessprogramer.com/exercise/lying-leg-raise/',
     'به پشت دراز بکش، دست‌ها کنار بدن یا زیر باسن. پاهای صاف را تا زاویه ۹۰ درجه بالا ببر و آرام پایین بیاور بدون اینکه پاشنه زمین بخورد.',
     'اگر کمرت از زمین بلند می‌شود، زانوها را کمی خم کن.',
     4, 3);
  insert into exercises (name_fa, name_en, gif_url, page_url, how_to, tip, met, sec_per_rep) values
    ('پلانک (شکم ثابت)', 'Plank', 'https://fitnessprogramer.com/wp-content/uploads/2021/02/plank.gif', 'https://fitnessprogramer.com/exercise/plank/',
     'روی ساعد و پنجه پا قرار بگیر، بدن از سر تا پاشنه یک خط صاف. شکم را سفت نگه دار و نفس عادی بکش.',
     'باسن را نه بالا بده نه بنداز پایین.',
     3.5, 1);
  insert into exercises (name_fa, name_en, gif_url, page_url, how_to, tip, met, sec_per_rep) values
    ('باگ مرده (شکم عمیق)', 'Dead Bug', 'https://fitnessprogramer.com/wp-content/uploads/2021/05/Dead-Bug.gif', 'https://fitnessprogramer.com/exercise/dead-bug/',
     'به پشت دراز بکش، دست‌ها رو به سقف و زانوها بالا و خم. دست راست و پای چپ را هم‌زمان آرام به سمت زمین بلند کن و برگردان، بعد طرف مقابل.',
     'کمر باید در تمام حرکت به زمین چسبیده بماند.',
     3.5, 6);
  insert into exercises (name_fa, name_en, gif_url, page_url, how_to, tip, met, sec_per_rep) values
    ('پلانک پهلو با خم شدن', 'Side Plank Oblique Crunch', 'https://fitnessprogramer.com/wp-content/uploads/2022/11/Side-Plank-Oblique-Crunch.gif', 'https://fitnessprogramer.com/exercise/side-plank-oblique-crunch/',
     'روی پهلو و ساعد قرار بگیر و لگن را بالا نگه دار. آرنج بالایی را به سمت زانو نزدیک کن و برگردان.',
     'اگر سخت است، فقط زانوی پایین را روی زمین بگذار.',
     3.5, 1);
  insert into exercises (name_fa, name_en, gif_url, page_url, how_to, tip, met, sec_per_rep) values
    ('پل پهلو (پلانک پهلو ساده)', 'Side Bridge', 'https://fitnessprogramer.com/wp-content/uploads/2021/05/Side-Bridge.gif', 'https://fitnessprogramer.com/exercise/side-bridge/',
     'روی پهلو، تکیه بر ساعد. لگن را از زمین بلند کن تا بدن یک خط صاف شود و نگه دار.',
     'شانه دقیقاً بالای آرنج باشد.',
     3.5, 1);
  insert into exercises (name_fa, name_en, gif_url, page_url, how_to, tip, met, sec_per_rep) values
    ('خم شدن به پهلو با دمبل', 'Dumbbell Side Bend', 'https://fitnessprogramer.com/wp-content/uploads/2021/05/Dumbbell-Side-Bend.gif', 'https://fitnessprogramer.com/exercise/dumbbell-side-bend/',
     'صاف بایست، یک دمبل در یک دست. از کمر مستقیم به همان پهلو خم شو و با فشار پهلوی مقابل صاف شو.',
     'به جلو یا عقب خم نشو؛ فقط در راستای پهلو.',
     4, 2);
  insert into exercises (name_fa, name_en, gif_url, page_url, how_to, tip, met, sec_per_rep) values
    ('اسکات با دمبل جلوی سینه', 'Dumbbell Goblet Squat', 'https://fitnessprogramer.com/wp-content/uploads/2023/01/Dumbbell-Goblet-Squat.gif', 'https://fitnessprogramer.com/exercise/dumbbell-goblet-squat/',
     'یک دمبل را عمودی جلوی سینه با دو دست بگیر. پاها به عرض شانه، آرام بنشین تا ران‌ها نزدیک موازی زمین و بعد بلند شو.',
     'سینه بالا و پاشنه‌ها روی زمین بماند؛ زانو از پنجه پا خیلی جلوتر نرود.',
     5, 4);
  insert into exercises (name_fa, name_en, gif_url, page_url, how_to, tip, met, sec_per_rep) values
    ('اسکات پا باز (سومو)', 'Dumbbell Sumo Squat', 'https://fitnessprogramer.com/wp-content/uploads/2021/02/dumbbell-sumo-squat.gif', 'https://fitnessprogramer.com/exercise/dumbbell-sumo-squat/',
     'پاها بازتر از شانه و پنجه‌ها رو به بیرون. یک دمبل بین پاها بگیر و آرام بنشین و بلند شو.',
     'این حالت روی داخل ران و باسن بیشتر کار می‌کند.',
     5, 4);
  insert into exercises (name_fa, name_en, gif_url, page_url, how_to, tip, met, sec_per_rep) values
    ('لانژ با دمبل', 'Dumbbell Lunge', 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Dumbbell-Lunge.gif', 'https://fitnessprogramer.com/exercise/dumbbell-lunge/',
     'دمبل‌ها کنار بدن. یک قدم بلند به جلو بردار و زانوی عقب را نزدیک زمین ببر، بعد به عقب برگرد.',
     'اگر تعادل نداری دست را به دیوار بگیر و بدون دمبل انجام بده.',
     5, 4);
  insert into exercises (name_fa, name_en, gif_url, page_url, how_to, tip, met, sec_per_rep) values
    ('ددلیفت رومانیایی با دمبل (پشت ران)', 'Dumbbell Romanian Deadlift', 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Dumbbell-Romanian-Deadlift.gif', 'https://fitnessprogramer.com/exercise/dumbbell-romanian-deadlift/',
     'دمبل‌ها جلوی ران، زانوها کمی خم و ثابت. باسن را به عقب ببر و دمبل‌ها را نزدیک پا تا زیر زانو پایین ببر، بعد با فشار باسن صاف شو.',
     '<b>کمر باید کاملاً صاف بماند.</b> دامنه را فقط تا جایی برو که کشش پشت ران را حس کنی.',
     5, 4);
  insert into exercises (name_fa, name_en, gif_url, page_url, how_to, tip, met, sec_per_rep) values
    ('ساق پا ایستاده با دمبل', 'Dumbbell Calf Raise', 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Dumbbell-Calf-Raise.gif', 'https://fitnessprogramer.com/exercise/calf-raise/',
     'دمبل‌ها کنار بدن، روی پنجه پا بلند شو، یک ثانیه بالا نگه دار و آرام پایین بیا.',
     'برای دامنه بیشتر روی لبه یک پله بایست.',
     3.5, 3);
  insert into exercises (name_fa, name_en, gif_url, page_url, how_to, tip, met, sec_per_rep) values
    ('ساق پا بدون وزنه', 'Standing Calf Raise', 'https://fitnessprogramer.com/wp-content/uploads/2021/06/Standing-Calf-Raise.gif', 'https://fitnessprogramer.com/exercise/standing-calf-raise/',
     'بدون دمبل و با تکیه سبک به دیوار، روی پنجه بلند شو و آرام پایین بیا.',
     'ست پایانی برای سوزاندن ساق است؛ ریتم را ثابت نگه دار.',
     3.5, 3);
  insert into exercises (name_fa, name_en, gif_url, page_url, how_to, tip, met, sec_per_rep) values
    ('پروانه (جامپینگ جک)', 'Jumping Jack', 'https://fitnessprogramer.com/wp-content/uploads/2021/05/Jumping-jack.gif', 'https://fitnessprogramer.com/exercise/jumping-jack/',
     'صاف بایست؛ همزمان پاها را باز کن و دست‌ها را از کنار بالای سر ببر، بعد به حالت اول برگرد. ریتم را ثابت و نرم نگه دار.',
     'روی پنجه فرود بیا نه پاشنه؛ زانوها کمی نرم باشند.',
     8, 1);
  insert into exercises (name_fa, name_en, gif_url, page_url, how_to, tip, met, sec_per_rep) values
    ('کرم‌حرکت (اینچ‌ورم)', 'Inchworm', 'https://fitnessprogramer.com/wp-content/uploads/2022/01/Inchworm.gif', 'https://fitnessprogramer.com/exercise/inchworm/',
     'از حالت ایستاده به جلو خم شو، کف دست‌ها را روی زمین بگذار و با دست‌ها تا حالت پلانک جلو برو، بعد با قدم‌های کوچک دست برگرد و بلند شو.',
     'کل بدن را در یک حرکت گرم می‌کند؛ عجله نکن.',
     5, 8);
  insert into exercises (name_fa, name_en, gif_url, page_url, how_to, tip, met, sec_per_rep) values
    ('پرس سرشانه ایستاده با دمبل', 'Dumbbell Shoulder Press', 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Dumbbell-Shoulder-Press.gif', 'https://fitnessprogramer.com/exercise/dumbbell-shoulder-press/',
     'دمبل‌ها را کنار شانه بگیر، شکم را سفت کن و دمبل‌ها را مستقیم بالای سر ببر، سپس آرام برگردان.',
     'کمر را قوس نده؛ باسن را کمی منقبض کن تا فشار روی کمر نیفتد.',
     5, 4);
  insert into exercises (name_fa, name_en, gif_url, page_url, how_to, tip, met, sec_per_rep) values
    ('کوهنوردی', 'Mountain Climber', 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Mountain-climber.gif', 'https://fitnessprogramer.com/exercise/mountain-climber/',
     'در حالت شنا (پلانک روی کف دست) قرار بگیر و زانوها را یکی‌درمیان سریع به سمت سینه بیاور.',
     'باسن بالا نپرد؛ بدن از سر تا پاشنه یک خط بماند.',
     8, 1);
  insert into exercises (name_fa, name_en, gif_url, page_url, how_to, tip, met, sec_per_rep) values
    ('برپی', 'Burpees', 'https://fitnessprogramer.com/wp-content/uploads/2021/02/burpees.gif', 'https://fitnessprogramer.com/exercise/burpees/',
     'بایست، دست‌ها را روی زمین بگذار، پاها را به عقب پرت کن تا پلانک شوی، پاها را جمع کن و با یک پرش کوچک بالا بپر و بالای سر دست بزن.',
     'چربی‌سوزترین حرکت برنامه است؛ اگر خسته شدی نسخه بدون پرش را انجام بده.',
     8, 6);
  insert into exercises (name_fa, name_en, gif_url, page_url, how_to, tip, met, sec_per_rep) values
    ('لانژ به عقب با دمبل', 'Dumbbell Reverse Lunge', 'https://fitnessprogramer.com/wp-content/uploads/2022/09/Dumbell-reverse-lunge.gif', 'https://fitnessprogramer.com/exercise/dumbbell-reverse-lunge/',
     'دمبل‌ها کنار بدن. یک قدم بلند به <b>عقب</b> بردار و زانوی عقب را نزدیک زمین ببر، بعد با فشار پای جلو بلند شو.',
     'لانژ به عقب برای زانو راحت‌تر از لانژ به جلو است.',
     5, 4);
  insert into exercises (name_fa, name_en, gif_url, page_url, how_to, tip, met, sec_per_rep) values
    ('پل باسن با دمبل', 'Dumbbell Glute Bridge', 'https://fitnessprogramer.com/wp-content/uploads/2022/01/Dumbbell-Glute-Bridge.gif', 'https://fitnessprogramer.com/exercise/dumbbell-glute-bridge/',
     'به پشت بخواب، زانوها خم و کف پاها روی زمین. دمبل را روی لگن نگه دار و باسن را تا خط صاف بالا ببر، یک ثانیه فشار بده و پایین بیا.',
     'در بالای حرکت باسن را کاملاً منقبض کن و کمر را بیش از حد گود نکن.',
     4, 3);
  insert into exercises (name_fa, name_en, gif_url, page_url, how_to, tip, met, sec_per_rep) values
    ('اسکات کازاک', 'Dumbbell Cossack Squat', 'https://fitnessprogramer.com/wp-content/uploads/2024/09/dumbbell-cossack-squat.gif', 'https://fitnessprogramer.com/exercise/dumbbell-cossack-squat/',
     'پاها خیلی باز و یک دمبل جلوی سینه. وزن را روی یک پا بینداز و روی همان پا بنشین در حالی که پای دیگر صاف است، بعد به طرف مقابل برو.',
     'حرکت محبوب کراس‌فیت برای انعطاف لگن؛ اگر سخت بود بدون دمبل انجام بده.',
     5, 5);
  insert into exercises (name_fa, name_en, gif_url, page_url, how_to, tip, met, sec_per_rep) values
    ('فینیشر: اسکات پرشی', 'Jump Squat', 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Jump-Squat.gif', 'https://fitnessprogramer.com/exercise/jump-squats/',
     'بدون وزنه اسکات کن و در بالا آمدن با قدرت بپر، نرم فرود بیا و بلافاصله تکرار کن.',
     'سه دور کوتاه در پایان، چربی‌سوزی را تا ساعت‌ها بعد بالا نگه می‌دارد.',
     8, 4);
  insert into exercises (name_fa, name_en, gif_url, page_url, how_to, tip, met, sec_per_rep) values
    ('نشر جانب با دمبل', 'Dumbbell Lateral Raise', 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Dumbbell-Lateral-Raise.gif', 'https://fitnessprogramer.com/exercise/dumbbell-lateral-raise/',
     'دمبل‌ها کنار بدن و آرنج کمی خم. دست‌ها را از دو طرف تا هم‌سطح شانه بالا ببر و آرام پایین بیاور.',
     'با دمبل سبک انجام بده؛ شانه را فرم می‌دهد و کمر را باریک‌تر نشان می‌دهد.',
     4, 4);
  insert into exercises (name_fa, name_en, gif_url, page_url, how_to, tip, met, sec_per_rep) values
    ('شنا با ضربه به شانه', 'Shoulder Tap Push Up', 'https://fitnessprogramer.com/wp-content/uploads/2022/08/Shoulder-Tap-Push-up.gif', 'https://fitnessprogramer.com/exercise/shoulder-tap-push-up/',
     'در حالت پلانک روی کف دست بمان و یکی‌درمیان با هر دست شانه مقابل را لمس کن، بدون اینکه لگن بچرخد.',
     'هم شکم و هم شانه را درگیر می‌کند؛ پاها را بازتر بگیر تا تعادل بهتر شود.',
     6, 4);
  insert into exercises (name_fa, name_en, gif_url, page_url, how_to, tip, met, sec_per_rep) values
    ('اسکات پرشی جمع‌شونده', 'Squat Tuck Jump', 'https://fitnessprogramer.com/wp-content/uploads/2022/02/Squat-Tuck-Jump.gif', 'https://fitnessprogramer.com/exercise/squat-tuck-jump/',
     'اسکات کن و با پرش بالا برو و زانوها را کمی به سینه نزدیک کن؛ نرم فرود بیا و ادامه بده.',
     'اگر برای زانو سنگین بود، به‌جایش اسکات ساده و سریع انجام بده.',
     8, 4);
  insert into exercises (name_fa, name_en, gif_url, page_url, how_to, tip, met, sec_per_rep) values
    ('کرانچ دوچرخه', 'Bicycle Crunch', 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Bicycle-Crunch.gif', 'https://fitnessprogramer.com/exercise/bicycle-crunch/',
     'به پشت بخواب و دست‌ها کنار سر. آرنج را به زانوی مخالف نزدیک کن و پای دیگر را صاف کن؛ متناوب ادامه بده.',
     'گردن را با دست نکش؛ حرکت باید از شکم انجام شود.',
     5, 2);
  insert into exercises (name_fa, name_en, gif_url, page_url, how_to, tip, met, sec_per_rep) values
    ('چرخش روسی', 'Russian Twist', 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Russian-Twist.gif', 'https://fitnessprogramer.com/exercise/russian-twist/',
     'بنشین، زانوها خم و کمی به عقب متمایل شو. دست‌ها یا یک دمبل سبک را از یک پهلو به پهلوی دیگر ببر.',
     'بهترین حرکت برای باریک کردن پهلو؛ کمر را قوز نکن.',
     4, 2);
  insert into exercises (name_fa, name_en, gif_url, page_url, how_to, tip, met, sec_per_rep) values
    ('پرس پایی با دمبل (تراستر)', 'Dumbbell Push Press', 'https://fitnessprogramer.com/wp-content/uploads/2023/10/Dumbbell-Push-Press.gif', 'https://fitnessprogramer.com/exercise/dumbbell-push-press/',
     'دمبل‌ها کنار شانه. کمی زانو خم کن و با فشار پا دمبل‌ها را بالای سر بفرست، سپس آرام برگردان.',
     'از پایه‌های کراس‌فیت است: قدرت پا و شانه با هم و کالری‌سوزی بالا.',
     6, 4);
  insert into exercises (name_fa, name_en, gif_url, page_url, how_to, tip, met, sec_per_rep) values
    ('یک‌ضرب دمبل تک‌دست', 'One Arm Dumbbell Snatch', 'https://fitnessprogramer.com/wp-content/uploads/2021/05/One-Arm-Dumbbell-Snatch.gif', 'https://fitnessprogramer.com/exercise/one-arm-dumbbell-snatch/',
     'دمبل روی زمین بین پاها. با کمر صاف بنشین و با فشار پا و باسن دمبل را در یک حرکت روان تا بالای سر ببر، بعد کنترل‌شده پایین بیاور.',
     'با وزن سبک شروع کن؛ نیرو باید از پا و باسن بیاید نه از دست.',
     6, 5);
  insert into exercises (name_fa, name_en, gif_url, page_url, how_to, tip, met, sec_per_rep) values
    ('پارویی رنیگید (پلانک + پارویی)', 'Dumbbell Renegade Row', 'https://fitnessprogramer.com/wp-content/uploads/2021/01/dumbbell-renegade-row-1.gif', 'https://fitnessprogramer.com/exercise/dumbbell-renegade-row/',
     'در حالت پلانک روی دو دمبل بمان. یک دمبل را کنار پهلو بالا بکش، پایین بگذار و با دست دیگر تکرار کن.',
     'پاها را بازتر بگیر تا لگن نچرخد؛ همزمان پشت و شکم را می‌سازد.',
     6, 4);
  insert into exercises (name_fa, name_en, gif_url, page_url, how_to, tip, met, sec_per_rep) values
    ('بالا رفتن روی چهارپایه با دمبل', 'Dumbbell Step Up', 'https://fitnessprogramer.com/wp-content/uploads/2021/12/Dumbeel-Step-Up.gif', 'https://fitnessprogramer.com/exercise/dumbbell-step-up/',
     'دمبل‌ها کنار بدن. یک پا را روی چهارپایه یا پله محکم بگذار و با فشار همان پا بالا برو، بعد کنترل‌شده پایین بیا.',
     'با پای عقب هل نده؛ تمام کار باید با پای روی پله انجام شود.',
     5, 4);

  ------------------------------------------------------------------
  -- برنامه «قدرتی — صادق»
  ------------------------------------------------------------------
  insert into programs (title, description) values
    ('قدرتی — صادق', 'برنامه ۳۰ دقیقه‌ای قدرت و عضله‌سازی')
  returning id into p_id;
  insert into program_days (program_id, day_key, day_label, focus, title, sub, sort) values
    (p_id, 'sat', 'شنبه', 'بازو', 'شنبه — بازو (جلوبازو و پشت‌بازو)', 'تمرکز روی جلوبازو و پشت‌بازو با دمبل. حرکات کاملاً آرام و بدون پرش.', 1)
  returning id into d_sat;
  insert into program_sections (day_id, name, sort) values (d_sat, 'گرم‌کردن', 0), (d_sat, 'تمرین اصلی', 1), (d_sat, 'سردکردن', 2);
  insert into program_days (program_id, day_key, day_label, focus, title, sub, sort) values
    (p_id, 'sun', 'یکشنبه', 'پشت', 'یکشنبه — پشت (زیربغل و کمر)', 'بارفیکس با کمک پا + حرکات دمبل. اگر بارفیکس کامل سخت است، حالت کمکی را انجام بده.', 2)
  returning id into d_sun;
  insert into program_sections (day_id, name, sort) values (d_sun, 'گرم‌کردن', 0), (d_sun, 'تمرین اصلی', 1), (d_sun, 'سردکردن', 2);
  insert into program_days (program_id, day_key, day_label, focus, title, sub, sort) values
    (p_id, 'mon', 'دوشنبه', 'سینه و باسن', 'دوشنبه — سینه و باسن', 'نیمه اول برای سینه، نیمه دوم برای عضلات باسن. همه حرکات کم‌فشار و روی زمین یا ایستاده.', 3)
  returning id into d_mon;
  insert into program_sections (day_id, name, sort) values (d_mon, 'گرم‌کردن', 0), (d_mon, 'تمرین اصلی', 1), (d_mon, 'سردکردن', 2);
  insert into program_days (program_id, day_key, day_label, focus, title, sub, sort) values
    (p_id, 'tue', 'سه‌شنبه', 'شکم و پهلو', 'سه‌شنبه — شکم و پهلو', 'سه حرکت برای شکم و سه حرکت برای پهلو. همه روی زمین و بدون پرش.', 4)
  returning id into d_tue;
  insert into program_sections (day_id, name, sort) values (d_tue, 'گرم‌کردن', 0), (d_tue, 'تمرین اصلی', 1), (d_tue, 'سردکردن', 2);
  insert into program_days (program_id, day_key, day_label, focus, title, sub, sort) values
    (p_id, 'wed', 'چهارشنبه', 'پا', 'چهارشنبه — پا', 'جلو ران، پشت ران و ساق با دمبل. بدون پرش و با دامنه راحت.', 5)
  returning id into d_wed;
  insert into program_sections (day_id, name, sort) values (d_wed, 'گرم‌کردن', 0), (d_wed, 'تمرین اصلی', 1), (d_wed, 'سردکردن', 2);
  -- warm 1: چرخش شانه و بازو
  select id into ex_id from exercises where name_en = 'Arm Circles';
  insert into program_items (day_id, exercise_id, section_id, sets, reps, rest_sec, sort) values
    (d_sat, ex_id, (select id from program_sections where day_id = d_sat and sort = 0), 1, 40, 0, 1);
  -- warm 2: کشش گربه و گاو (نرمش کمر)
  select id into ex_id from exercises where name_en = 'Cat-Cow Stretch';
  insert into program_items (day_id, exercise_id, section_id, sets, reps, rest_sec, sort) values
    (d_sat, ex_id, (select id from program_sections where day_id = d_sat and sort = 0), 1, 8, 0, 2);
  -- main 1: جلوبازو دمبل ایستاده
  select id into ex_id from exercises where name_en = 'Dumbbell Biceps Curl';
  insert into program_items (day_id, exercise_id, section_id, sets, reps, rest_sec, sort) values
    (d_sat, ex_id, (select id from program_sections where day_id = d_sat and sort = 1), 3, 12, 45, 1);
  -- main 2: جلوبازو چکشی
  select id into ex_id from exercises where name_en = 'Dumbbell Hammer Curl';
  insert into program_items (day_id, exercise_id, section_id, sets, reps, rest_sec, sort) values
    (d_sat, ex_id, (select id from program_sections where day_id = d_sat and sort = 1), 3, 12, 45, 2);
  -- main 3: جلوبازو تمرکزی نشسته
  select id into ex_id from exercises where name_en = 'Concentration Curl';
  insert into program_items (day_id, exercise_id, section_id, sets, reps, rest_sec, sort) values
    (d_sat, ex_id, (select id from program_sections where day_id = d_sat and sort = 1), 2, 10, 45, 3);
  -- main 4: پشت‌بازو دمبل خم (کیک‌بک)
  select id into ex_id from exercises where name_en = 'Dumbbell Kickback';
  insert into program_items (day_id, exercise_id, section_id, sets, reps, rest_sec, sort) values
    (d_sat, ex_id, (select id from program_sections where day_id = d_sat and sort = 1), 3, 12, 45, 4);
  -- main 5: پشت‌بازو بالای سر نشسته
  select id into ex_id from exercises where name_en = 'Seated Dumbbell Triceps Extension';
  insert into program_items (day_id, exercise_id, section_id, sets, reps, rest_sec, sort) values
    (d_sat, ex_id, (select id from program_sections where day_id = d_sat and sort = 1), 3, 10, 60, 5);
  -- main 6: شراگ (بالا کشیدن شانه)
  select id into ex_id from exercises where name_en = 'Dumbbell Shrug';
  insert into program_items (day_id, exercise_id, section_id, sets, reps, rest_sec, sort) values
    (d_sat, ex_id, (select id from program_sections where day_id = d_sat and sort = 1), 2, 15, 45, 6);
  -- cool 1: کشش پشت ران ایستاده
  select id into ex_id from exercises where name_en = 'Standing Hamstring Stretch';
  insert into program_items (day_id, exercise_id, section_id, sets, reps, rest_sec, sort) values
    (d_sat, ex_id, (select id from program_sections where day_id = d_sat and sort = 2), 1, 30, 0, 1);
  -- warm 1: چرخش شانه و بازو
  select id into ex_id from exercises where name_en = 'Arm Circles';
  insert into program_items (day_id, exercise_id, section_id, sets, reps, rest_sec, sort) values
    (d_sun, ex_id, (select id from program_sections where day_id = d_sun and sort = 0), 1, 40, 0, 1);
  -- warm 2: کشش گربه و گاو (نرمش کمر)
  select id into ex_id from exercises where name_en = 'Cat-Cow Stretch';
  insert into program_items (day_id, exercise_id, section_id, sets, reps, rest_sec, sort) values
    (d_sun, ex_id, (select id from program_sections where day_id = d_sun and sort = 0), 1, 8, 0, 2);
  -- main 1: بارفیکس دست‌باز
  select id into ex_id from exercises where name_en = 'Pull Up';
  insert into program_items (day_id, exercise_id, section_id, sets, reps, rest_sec, sort) values
    (d_sun, ex_id, (select id from program_sections where day_id = d_sun and sort = 1), 3, 8, 60, 1);
  -- main 2: بارفیکس دست‌جمع (کف دست به سمت خود)
  select id into ex_id from exercises where name_en = 'Chin Up';
  insert into program_items (day_id, exercise_id, section_id, sets, reps, rest_sec, sort) values
    (d_sun, ex_id, (select id from program_sections where day_id = d_sun and sort = 1), 2, 6, 60, 2);
  -- main 3: زیربغل دمبل تک‌دست (پارویی)
  select id into ex_id from exercises where name_en = 'Dumbbell Row';
  insert into program_items (day_id, exercise_id, section_id, sets, reps, rest_sec, sort) values
    (d_sun, ex_id, (select id from program_sections where day_id = d_sun and sort = 1), 3, 12, 45, 3);
  -- main 4: فلای معکوس دمبل
  select id into ex_id from exercises where name_en = 'Dumbbell Reverse Fly';
  insert into program_items (day_id, exercise_id, section_id, sets, reps, rest_sec, sort) values
    (d_sun, ex_id, (select id from program_sections where day_id = d_sun and sort = 1), 3, 12, 45, 4);
  -- main 5: سوپرمن (تقویت کمر روی زمین)
  select id into ex_id from exercises where name_en = 'Superman';
  insert into program_items (day_id, exercise_id, section_id, sets, reps, rest_sec, sort) values
    (d_sun, ex_id, (select id from program_sections where day_id = d_sun and sort = 1), 2, 12, 45, 5);
  -- main 6: پرنده-سگ (تعادل و کمر)
  select id into ex_id from exercises where name_en = 'Bird Dog';
  insert into program_items (day_id, exercise_id, section_id, sets, reps, rest_sec, sort) values
    (d_sun, ex_id, (select id from program_sections where day_id = d_sun and sort = 1), 2, 10, 45, 6);
  -- cool 1: کشش پشت ران ایستاده
  select id into ex_id from exercises where name_en = 'Standing Hamstring Stretch';
  insert into program_items (day_id, exercise_id, section_id, sets, reps, rest_sec, sort) values
    (d_sun, ex_id, (select id from program_sections where day_id = d_sun and sort = 2), 1, 30, 0, 1);
  -- warm 1: چرخش شانه و بازو
  select id into ex_id from exercises where name_en = 'Arm Circles';
  insert into program_items (day_id, exercise_id, section_id, sets, reps, rest_sec, sort) values
    (d_mon, ex_id, (select id from program_sections where day_id = d_mon and sort = 0), 1, 40, 0, 1);
  -- warm 2: کشش گربه و گاو (نرمش کمر)
  select id into ex_id from exercises where name_en = 'Cat-Cow Stretch';
  insert into program_items (day_id, exercise_id, section_id, sets, reps, rest_sec, sort) values
    (d_mon, ex_id, (select id from program_sections where day_id = d_mon and sort = 0), 1, 8, 0, 2);
  -- main 1: شنا (پوش‌آپ)
  select id into ex_id from exercises where name_en = 'Push Up';
  insert into program_items (day_id, exercise_id, section_id, sets, reps, rest_sec, sort) values
    (d_mon, ex_id, (select id from program_sections where day_id = d_mon and sort = 1), 3, 12, 45, 1);
  -- main 2: پرس سینه دمبل روی زمین
  select id into ex_id from exercises where name_en = 'Dumbbell Press';
  insert into program_items (day_id, exercise_id, section_id, sets, reps, rest_sec, sort) values
    (d_mon, ex_id, (select id from program_sections where day_id = d_mon and sort = 1), 3, 12, 60, 2);
  -- main 3: فلای سینه دمبل
  select id into ex_id from exercises where name_en = 'Dumbbell Fly';
  insert into program_items (day_id, exercise_id, section_id, sets, reps, rest_sec, sort) values
    (d_mon, ex_id, (select id from program_sections where day_id = d_mon and sort = 1), 2, 12, 45, 3);
  -- main 4: پل باسن
  select id into ex_id from exercises where name_en = 'Glute Bridge';
  insert into program_items (day_id, exercise_id, section_id, sets, reps, rest_sec, sort) values
    (d_mon, ex_id, (select id from program_sections where day_id = d_mon and sort = 1), 3, 15, 45, 4);
  -- main 5: هیپ تراست (باسن با تکیه بر تخت)
  select id into ex_id from exercises where name_en = 'Bodyweight Hip Thrust';
  insert into program_items (day_id, exercise_id, section_id, sets, reps, rest_sec, sort) values
    (d_mon, ex_id, (select id from program_sections where day_id = d_mon and sort = 1), 3, 12, 60, 5);
  -- main 6: باز کردن پا به پهلو (ایستاده)
  select id into ex_id from exercises where name_en = 'Standing Hip Abduction';
  insert into program_items (day_id, exercise_id, section_id, sets, reps, rest_sec, sort) values
    (d_mon, ex_id, (select id from program_sections where day_id = d_mon and sort = 1), 2, 15, 45, 6);
  -- cool 1: کشش پشت ران ایستاده
  select id into ex_id from exercises where name_en = 'Standing Hamstring Stretch';
  insert into program_items (day_id, exercise_id, section_id, sets, reps, rest_sec, sort) values
    (d_mon, ex_id, (select id from program_sections where day_id = d_mon and sort = 2), 1, 30, 0, 1);
  -- warm 1: چرخش شانه و بازو
  select id into ex_id from exercises where name_en = 'Arm Circles';
  insert into program_items (day_id, exercise_id, section_id, sets, reps, rest_sec, sort) values
    (d_tue, ex_id, (select id from program_sections where day_id = d_tue and sort = 0), 1, 40, 0, 1);
  -- warm 2: کشش گربه و گاو (نرمش کمر)
  select id into ex_id from exercises where name_en = 'Cat-Cow Stretch';
  insert into program_items (day_id, exercise_id, section_id, sets, reps, rest_sec, sort) values
    (d_tue, ex_id, (select id from program_sections where day_id = d_tue and sort = 0), 1, 8, 0, 2);
  -- main 1: کرانچ (دراز و نشست کوتاه)
  select id into ex_id from exercises where name_en = 'Crunch';
  insert into program_items (day_id, exercise_id, section_id, sets, reps, rest_sec, sort) values
    (d_tue, ex_id, (select id from program_sections where day_id = d_tue and sort = 1), 3, 15, 45, 1);
  -- main 2: بالا آوردن پا خوابیده
  select id into ex_id from exercises where name_en = 'Lying Leg Raise';
  insert into program_items (day_id, exercise_id, section_id, sets, reps, rest_sec, sort) values
    (d_tue, ex_id, (select id from program_sections where day_id = d_tue and sort = 1), 3, 12, 45, 2);
  -- main 3: پلانک (شکم ثابت)
  select id into ex_id from exercises where name_en = 'Plank';
  insert into program_items (day_id, exercise_id, section_id, sets, reps, rest_sec, sort) values
    (d_tue, ex_id, (select id from program_sections where day_id = d_tue and sort = 1), 3, 40, 45, 3);
  -- main 4: باگ مرده (شکم عمیق)
  select id into ex_id from exercises where name_en = 'Dead Bug';
  insert into program_items (day_id, exercise_id, section_id, sets, reps, rest_sec, sort) values
    (d_tue, ex_id, (select id from program_sections where day_id = d_tue and sort = 1), 2, 10, 45, 4);
  -- main 5: پلانک پهلو با خم شدن
  select id into ex_id from exercises where name_en = 'Side Plank Oblique Crunch';
  insert into program_items (day_id, exercise_id, section_id, sets, reps, rest_sec, sort) values
    (d_tue, ex_id, (select id from program_sections where day_id = d_tue and sort = 1), 2, 10, 45, 5);
  -- main 6: پل پهلو (پلانک پهلو ساده)
  select id into ex_id from exercises where name_en = 'Side Bridge';
  insert into program_items (day_id, exercise_id, section_id, sets, reps, rest_sec, sort) values
    (d_tue, ex_id, (select id from program_sections where day_id = d_tue and sort = 1), 2, 20, 45, 6);
  -- main 7: خم شدن به پهلو با دمبل
  select id into ex_id from exercises where name_en = 'Dumbbell Side Bend';
  insert into program_items (day_id, exercise_id, section_id, sets, reps, rest_sec, sort) values
    (d_tue, ex_id, (select id from program_sections where day_id = d_tue and sort = 1), 2, 12, 45, 7);
  -- cool 1: کشش پشت ران ایستاده
  select id into ex_id from exercises where name_en = 'Standing Hamstring Stretch';
  insert into program_items (day_id, exercise_id, section_id, sets, reps, rest_sec, sort) values
    (d_tue, ex_id, (select id from program_sections where day_id = d_tue and sort = 2), 1, 30, 0, 1);
  -- warm 1: چرخش شانه و بازو
  select id into ex_id from exercises where name_en = 'Arm Circles';
  insert into program_items (day_id, exercise_id, section_id, sets, reps, rest_sec, sort) values
    (d_wed, ex_id, (select id from program_sections where day_id = d_wed and sort = 0), 1, 40, 0, 1);
  -- warm 2: کشش گربه و گاو (نرمش کمر)
  select id into ex_id from exercises where name_en = 'Cat-Cow Stretch';
  insert into program_items (day_id, exercise_id, section_id, sets, reps, rest_sec, sort) values
    (d_wed, ex_id, (select id from program_sections where day_id = d_wed and sort = 0), 1, 8, 0, 2);
  -- main 1: اسکات با دمبل جلوی سینه
  select id into ex_id from exercises where name_en = 'Dumbbell Goblet Squat';
  insert into program_items (day_id, exercise_id, section_id, sets, reps, rest_sec, sort) values
    (d_wed, ex_id, (select id from program_sections where day_id = d_wed and sort = 1), 3, 12, 60, 1);
  -- main 2: اسکات پا باز (سومو)
  select id into ex_id from exercises where name_en = 'Dumbbell Sumo Squat';
  insert into program_items (day_id, exercise_id, section_id, sets, reps, rest_sec, sort) values
    (d_wed, ex_id, (select id from program_sections where day_id = d_wed and sort = 1), 3, 12, 60, 2);
  -- main 3: لانژ با دمبل
  select id into ex_id from exercises where name_en = 'Dumbbell Lunge';
  insert into program_items (day_id, exercise_id, section_id, sets, reps, rest_sec, sort) values
    (d_wed, ex_id, (select id from program_sections where day_id = d_wed and sort = 1), 3, 10, 60, 3);
  -- main 4: ددلیفت رومانیایی با دمبل (پشت ران)
  select id into ex_id from exercises where name_en = 'Dumbbell Romanian Deadlift';
  insert into program_items (day_id, exercise_id, section_id, sets, reps, rest_sec, sort) values
    (d_wed, ex_id, (select id from program_sections where day_id = d_wed and sort = 1), 3, 12, 60, 4);
  -- main 5: ساق پا ایستاده با دمبل
  select id into ex_id from exercises where name_en = 'Dumbbell Calf Raise';
  insert into program_items (day_id, exercise_id, section_id, sets, reps, rest_sec, sort) values
    (d_wed, ex_id, (select id from program_sections where day_id = d_wed and sort = 1), 3, 15, 45, 5);
  -- main 6: ساق پا بدون وزنه
  select id into ex_id from exercises where name_en = 'Standing Calf Raise';
  insert into program_items (day_id, exercise_id, section_id, sets, reps, rest_sec, sort) values
    (d_wed, ex_id, (select id from program_sections where day_id = d_wed and sort = 1), 2, 20, 30, 6);
  -- cool 1: کشش پشت ران ایستاده
  select id into ex_id from exercises where name_en = 'Standing Hamstring Stretch';
  insert into program_items (day_id, exercise_id, section_id, sets, reps, rest_sec, sort) values
    (d_wed, ex_id, (select id from program_sections where day_id = d_wed and sort = 2), 1, 30, 0, 1);

  ------------------------------------------------------------------
  -- برنامه «متابولیک — ساغر»
  ------------------------------------------------------------------
  insert into programs (title, description) values
    ('متابولیک — ساغر', 'برنامه ۳۰ دقیقه‌ای چربی‌سوزی و فرم‌دهی')
  returning id into p_id;
  insert into program_days (program_id, day_key, day_label, focus, title, sub, sort) values
    (p_id, 'sat', 'شنبه', 'تمام‌بدن', 'شنبه — سرکیت تمام‌بدن (چربی‌سوزی)', '۳ دور پشت‌سرهم با استراحت کوتاه. هدف: بالا نگه‌داشتن ضربان قلب و سوزاندن چربی با حفظ عضله.', 1)
  returning id into d_sat;
  insert into program_sections (day_id, name, sort) values (d_sat, 'گرم‌کردن', 0), (d_sat, 'تمرین اصلی', 1), (d_sat, 'سردکردن', 2);
  insert into program_days (program_id, day_key, day_label, focus, title, sub, sort) values
    (p_id, 'sun', 'یکشنبه', 'باسن و ران', 'یکشنبه — پایین‌تنه، باسن و ران', 'فرم‌دهی باسن و ران با دمبل و تکرار بالا، به‌علاوه یک فینیشر کراس‌فیتی. بدون حجیم شدن.', 2)
  returning id into d_sun;
  insert into program_sections (day_id, name, sort) values (d_sun, 'گرم‌کردن', 0), (d_sun, 'تمرین اصلی', 1), (d_sun, 'سردکردن', 2);
  insert into program_days (program_id, day_key, day_label, focus, title, sub, sort) values
    (p_id, 'mon', 'دوشنبه', 'بالاتنه', 'دوشنبه — بالاتنه، بازو و سرشانه', 'دمبل سبک با تکرار بالا + بارفیکس. هدف: بازوی کشیده و سفت و بالاتنه فرم‌گرفته، نه حجیم.', 3)
  returning id into d_mon;
  insert into program_sections (day_id, name, sort) values (d_mon, 'گرم‌کردن', 0), (d_mon, 'تمرین اصلی', 1), (d_mon, 'سردکردن', 2);
  insert into program_days (program_id, day_key, day_label, focus, title, sub, sort) values
    (p_id, 'tue', 'سه‌شنبه', 'HIIT و شکم', 'سه‌شنبه — HIIT کراس‌فیتی + شکم و پهلو', 'اینتروال ۴۰ ثانیه کار و ۲۰ ثانیه استراحت، سپس بخش شکم و پهلو. پرچربی‌سوزترین روز هفته.', 4)
  returning id into d_tue;
  insert into program_sections (day_id, name, sort) values (d_tue, 'گرم‌کردن', 0), (d_tue, 'تمرین اصلی', 1), (d_tue, 'سردکردن', 2);
  insert into program_days (program_id, day_key, day_label, focus, title, sub, sort) values
    (p_id, 'wed', 'چهارشنبه', 'WOD کراس‌فیت', 'چهارشنبه — WOD کراس‌فیت با دمبل', 'تمرین روز به سبک کراس‌فیت: ۵ دور. حرکات هر دور را پشت‌سرهم انجام بده و فقط بین دورها ۶۰ ثانیه استراحت کن.', 5)
  returning id into d_wed;
  insert into program_sections (day_id, name, sort) values (d_wed, 'گرم‌کردن', 0), (d_wed, 'تمرین اصلی', 1), (d_wed, 'سردکردن', 2);
  -- warm 1: پروانه (جامپینگ جک)
  select id into ex_id from exercises where name_en = 'Jumping Jack';
  insert into program_items (day_id, exercise_id, section_id, sets, reps, rest_sec, sort) values
    (d_sat, ex_id, (select id from program_sections where day_id = d_sat and sort = 0), 1, 45, 0, 1);
  -- warm 2: کرم‌حرکت (اینچ‌ورم)
  select id into ex_id from exercises where name_en = 'Inchworm';
  insert into program_items (day_id, exercise_id, section_id, sets, reps, rest_sec, sort) values
    (d_sat, ex_id, (select id from program_sections where day_id = d_sat and sort = 0), 1, 6, 0, 2);
  -- warm 3: کشش گربه و گاو (نرمش کمر)
  select id into ex_id from exercises where name_en = 'Cat-Cow Stretch';
  insert into program_items (day_id, exercise_id, section_id, sets, reps, rest_sec, sort) values
    (d_sat, ex_id, (select id from program_sections where day_id = d_sat and sort = 0), 1, 8, 0, 3);
  -- main 1: اسکات دمبل جلوی سینه
  select id into ex_id from exercises where name_en = 'Dumbbell Goblet Squat';
  insert into program_items (day_id, exercise_id, section_id, sets, reps, rest_sec, sort) values
    (d_sat, ex_id, (select id from program_sections where day_id = d_sat and sort = 1), 3, 12, 30, 1);
  -- main 2: پرس سرشانه ایستاده با دمبل
  select id into ex_id from exercises where name_en = 'Dumbbell Shoulder Press';
  insert into program_items (day_id, exercise_id, section_id, sets, reps, rest_sec, sort) values
    (d_sat, ex_id, (select id from program_sections where day_id = d_sat and sort = 1), 3, 12, 30, 2);
  -- main 3: پارویی خم با دمبل
  select id into ex_id from exercises where name_en = 'Dumbbell Row';
  insert into program_items (day_id, exercise_id, section_id, sets, reps, rest_sec, sort) values
    (d_sat, ex_id, (select id from program_sections where day_id = d_sat and sort = 1), 3, 12, 30, 3);
  -- main 4: کوهنوردی
  select id into ex_id from exercises where name_en = 'Mountain Climber';
  insert into program_items (day_id, exercise_id, section_id, sets, reps, rest_sec, sort) values
    (d_sat, ex_id, (select id from program_sections where day_id = d_sat and sort = 1), 3, 30, 30, 4);
  -- main 5: برپی
  select id into ex_id from exercises where name_en = 'Burpees';
  insert into program_items (day_id, exercise_id, section_id, sets, reps, rest_sec, sort) values
    (d_sat, ex_id, (select id from program_sections where day_id = d_sat and sort = 1), 3, 8, 60, 5);
  -- main 6: پلانک
  select id into ex_id from exercises where name_en = 'Plank';
  insert into program_items (day_id, exercise_id, section_id, sets, reps, rest_sec, sort) values
    (d_sat, ex_id, (select id from program_sections where day_id = d_sat and sort = 1), 3, 40, 45, 6);
  -- cool 1: کشش پشت ران ایستاده
  select id into ex_id from exercises where name_en = 'Standing Hamstring Stretch';
  insert into program_items (day_id, exercise_id, section_id, sets, reps, rest_sec, sort) values
    (d_sat, ex_id, (select id from program_sections where day_id = d_sat and sort = 2), 1, 30, 0, 1);
  -- cool 2: کشش شانه و بازو
  select id into ex_id from exercises where name_en = 'Arm Circles';
  insert into program_items (day_id, exercise_id, section_id, sets, reps, rest_sec, sort) values
    (d_sat, ex_id, (select id from program_sections where day_id = d_sat and sort = 2), 1, 30, 0, 2);
  -- warm 1: پروانه (جامپینگ جک)
  select id into ex_id from exercises where name_en = 'Jumping Jack';
  insert into program_items (day_id, exercise_id, section_id, sets, reps, rest_sec, sort) values
    (d_sun, ex_id, (select id from program_sections where day_id = d_sun and sort = 0), 1, 45, 0, 1);
  -- warm 2: کرم‌حرکت (اینچ‌ورم)
  select id into ex_id from exercises where name_en = 'Inchworm';
  insert into program_items (day_id, exercise_id, section_id, sets, reps, rest_sec, sort) values
    (d_sun, ex_id, (select id from program_sections where day_id = d_sun and sort = 0), 1, 6, 0, 2);
  -- warm 3: کشش گربه و گاو (نرمش کمر)
  select id into ex_id from exercises where name_en = 'Cat-Cow Stretch';
  insert into program_items (day_id, exercise_id, section_id, sets, reps, rest_sec, sort) values
    (d_sun, ex_id, (select id from program_sections where day_id = d_sun and sort = 0), 1, 8, 0, 3);
  -- main 1: اسکات پا باز (سومو)
  select id into ex_id from exercises where name_en = 'Dumbbell Sumo Squat';
  insert into program_items (day_id, exercise_id, section_id, sets, reps, rest_sec, sort) values
    (d_sun, ex_id, (select id from program_sections where day_id = d_sun and sort = 1), 3, 15, 45, 1);
  -- main 2: لانژ به عقب با دمبل
  select id into ex_id from exercises where name_en = 'Dumbbell Reverse Lunge';
  insert into program_items (day_id, exercise_id, section_id, sets, reps, rest_sec, sort) values
    (d_sun, ex_id, (select id from program_sections where day_id = d_sun and sort = 1), 3, 12, 45, 2);
  -- main 3: ددلیفت رومانیایی با دمبل
  select id into ex_id from exercises where name_en = 'Dumbbell Romanian Deadlift';
  insert into program_items (day_id, exercise_id, section_id, sets, reps, rest_sec, sort) values
    (d_sun, ex_id, (select id from program_sections where day_id = d_sun and sort = 1), 3, 12, 45, 3);
  -- main 4: پل باسن با دمبل
  select id into ex_id from exercises where name_en = 'Dumbbell Glute Bridge';
  insert into program_items (day_id, exercise_id, section_id, sets, reps, rest_sec, sort) values
    (d_sun, ex_id, (select id from program_sections where day_id = d_sun and sort = 1), 3, 15, 45, 4);
  -- main 5: اسکات کازاک
  select id into ex_id from exercises where name_en = 'Dumbbell Cossack Squat';
  insert into program_items (day_id, exercise_id, section_id, sets, reps, rest_sec, sort) values
    (d_sun, ex_id, (select id from program_sections where day_id = d_sun and sort = 1), 2, 8, 45, 5);
  -- main 6: فینیشر: اسکات پرشی
  select id into ex_id from exercises where name_en = 'Jump Squat';
  insert into program_items (day_id, exercise_id, section_id, sets, reps, rest_sec, sort) values
    (d_sun, ex_id, (select id from program_sections where day_id = d_sun and sort = 1), 3, 15, 30, 6);
  -- cool 1: کشش پشت ران ایستاده
  select id into ex_id from exercises where name_en = 'Standing Hamstring Stretch';
  insert into program_items (day_id, exercise_id, section_id, sets, reps, rest_sec, sort) values
    (d_sun, ex_id, (select id from program_sections where day_id = d_sun and sort = 2), 1, 30, 0, 1);
  -- cool 2: کشش شانه و بازو
  select id into ex_id from exercises where name_en = 'Arm Circles';
  insert into program_items (day_id, exercise_id, section_id, sets, reps, rest_sec, sort) values
    (d_sun, ex_id, (select id from program_sections where day_id = d_sun and sort = 2), 1, 30, 0, 2);
  -- warm 1: پروانه (جامپینگ جک)
  select id into ex_id from exercises where name_en = 'Jumping Jack';
  insert into program_items (day_id, exercise_id, section_id, sets, reps, rest_sec, sort) values
    (d_mon, ex_id, (select id from program_sections where day_id = d_mon and sort = 0), 1, 45, 0, 1);
  -- warm 2: کرم‌حرکت (اینچ‌ورم)
  select id into ex_id from exercises where name_en = 'Inchworm';
  insert into program_items (day_id, exercise_id, section_id, sets, reps, rest_sec, sort) values
    (d_mon, ex_id, (select id from program_sections where day_id = d_mon and sort = 0), 1, 6, 0, 2);
  -- warm 3: کشش گربه و گاو (نرمش کمر)
  select id into ex_id from exercises where name_en = 'Cat-Cow Stretch';
  insert into program_items (day_id, exercise_id, section_id, sets, reps, rest_sec, sort) values
    (d_mon, ex_id, (select id from program_sections where day_id = d_mon and sort = 0), 1, 8, 0, 3);
  -- main 1: شنا سوئدی (روی زانو هم مجاز است)
  select id into ex_id from exercises where name_en = 'Push Up';
  insert into program_items (day_id, exercise_id, section_id, sets, reps, rest_sec, sort) values
    (d_mon, ex_id, (select id from program_sections where day_id = d_mon and sort = 1), 3, 12, 45, 1);
  -- main 2: بارفیکس کمکی یا منفی
  select id into ex_id from exercises where name_en = 'Pull Up';
  insert into program_items (day_id, exercise_id, section_id, sets, reps, rest_sec, sort) values
    (d_mon, ex_id, (select id from program_sections where day_id = d_mon and sort = 1), 3, 6, 60, 2);
  -- main 3: نشر جانب با دمبل
  select id into ex_id from exercises where name_en = 'Dumbbell Lateral Raise';
  insert into program_items (day_id, exercise_id, section_id, sets, reps, rest_sec, sort) values
    (d_mon, ex_id, (select id from program_sections where day_id = d_mon and sort = 1), 3, 15, 45, 3);
  -- main 4: جلوبازو چکشی
  select id into ex_id from exercises where name_en = 'Dumbbell Hammer Curl';
  insert into program_items (day_id, exercise_id, section_id, sets, reps, rest_sec, sort) values
    (d_mon, ex_id, (select id from program_sections where day_id = d_mon and sort = 1), 3, 12, 45, 4);
  -- main 5: پشت‌بازو بالای سر نشسته
  select id into ex_id from exercises where name_en = 'Seated Dumbbell Triceps Extension';
  insert into program_items (day_id, exercise_id, section_id, sets, reps, rest_sec, sort) values
    (d_mon, ex_id, (select id from program_sections where day_id = d_mon and sort = 1), 3, 12, 45, 5);
  -- main 6: شنا با ضربه به شانه
  select id into ex_id from exercises where name_en = 'Shoulder Tap Push Up';
  insert into program_items (day_id, exercise_id, section_id, sets, reps, rest_sec, sort) values
    (d_mon, ex_id, (select id from program_sections where day_id = d_mon and sort = 1), 2, 10, 45, 6);
  -- cool 1: کشش پشت ران ایستاده
  select id into ex_id from exercises where name_en = 'Standing Hamstring Stretch';
  insert into program_items (day_id, exercise_id, section_id, sets, reps, rest_sec, sort) values
    (d_mon, ex_id, (select id from program_sections where day_id = d_mon and sort = 2), 1, 30, 0, 1);
  -- cool 2: کشش شانه و بازو
  select id into ex_id from exercises where name_en = 'Arm Circles';
  insert into program_items (day_id, exercise_id, section_id, sets, reps, rest_sec, sort) values
    (d_mon, ex_id, (select id from program_sections where day_id = d_mon and sort = 2), 1, 30, 0, 2);
  -- warm 1: پروانه (جامپینگ جک)
  select id into ex_id from exercises where name_en = 'Jumping Jack';
  insert into program_items (day_id, exercise_id, section_id, sets, reps, rest_sec, sort) values
    (d_tue, ex_id, (select id from program_sections where day_id = d_tue and sort = 0), 1, 45, 0, 1);
  -- warm 2: کرم‌حرکت (اینچ‌ورم)
  select id into ex_id from exercises where name_en = 'Inchworm';
  insert into program_items (day_id, exercise_id, section_id, sets, reps, rest_sec, sort) values
    (d_tue, ex_id, (select id from program_sections where day_id = d_tue and sort = 0), 1, 6, 0, 2);
  -- warm 3: کشش گربه و گاو (نرمش کمر)
  select id into ex_id from exercises where name_en = 'Cat-Cow Stretch';
  insert into program_items (day_id, exercise_id, section_id, sets, reps, rest_sec, sort) values
    (d_tue, ex_id, (select id from program_sections where day_id = d_tue and sort = 0), 1, 8, 0, 3);
  -- main 1: پروانه (جامپینگ جک)
  select id into ex_id from exercises where name_en = 'Jumping Jack';
  insert into program_items (day_id, exercise_id, section_id, sets, reps, rest_sec, sort) values
    (d_tue, ex_id, (select id from program_sections where day_id = d_tue and sort = 1), 4, 40, 20, 1);
  -- main 2: برپی
  select id into ex_id from exercises where name_en = 'Burpees';
  insert into program_items (day_id, exercise_id, section_id, sets, reps, rest_sec, sort) values
    (d_tue, ex_id, (select id from program_sections where day_id = d_tue and sort = 1), 4, 40, 20, 2);
  -- main 3: کوهنوردی
  select id into ex_id from exercises where name_en = 'Mountain Climber';
  insert into program_items (day_id, exercise_id, section_id, sets, reps, rest_sec, sort) values
    (d_tue, ex_id, (select id from program_sections where day_id = d_tue and sort = 1), 4, 40, 20, 3);
  -- main 4: اسکات پرشی جمع‌شونده
  select id into ex_id from exercises where name_en = 'Squat Tuck Jump';
  insert into program_items (day_id, exercise_id, section_id, sets, reps, rest_sec, sort) values
    (d_tue, ex_id, (select id from program_sections where day_id = d_tue and sort = 1), 4, 30, 30, 4);
  -- main 5: کرانچ دوچرخه
  select id into ex_id from exercises where name_en = 'Bicycle Crunch';
  insert into program_items (day_id, exercise_id, section_id, sets, reps, rest_sec, sort) values
    (d_tue, ex_id, (select id from program_sections where day_id = d_tue and sort = 1), 3, 20, 45, 5);
  -- main 6: چرخش روسی
  select id into ex_id from exercises where name_en = 'Russian Twist';
  insert into program_items (day_id, exercise_id, section_id, sets, reps, rest_sec, sort) values
    (d_tue, ex_id, (select id from program_sections where day_id = d_tue and sort = 1), 3, 20, 45, 6);
  -- main 7: پلانک پهلو
  select id into ex_id from exercises where name_en = 'Side Bridge';
  insert into program_items (day_id, exercise_id, section_id, sets, reps, rest_sec, sort) values
    (d_tue, ex_id, (select id from program_sections where day_id = d_tue and sort = 1), 2, 30, 30, 7);
  -- cool 1: کشش پشت ران ایستاده
  select id into ex_id from exercises where name_en = 'Standing Hamstring Stretch';
  insert into program_items (day_id, exercise_id, section_id, sets, reps, rest_sec, sort) values
    (d_tue, ex_id, (select id from program_sections where day_id = d_tue and sort = 2), 1, 30, 0, 1);
  -- cool 2: کشش شانه و بازو
  select id into ex_id from exercises where name_en = 'Arm Circles';
  insert into program_items (day_id, exercise_id, section_id, sets, reps, rest_sec, sort) values
    (d_tue, ex_id, (select id from program_sections where day_id = d_tue and sort = 2), 1, 30, 0, 2);
  -- warm 1: پروانه (جامپینگ جک)
  select id into ex_id from exercises where name_en = 'Jumping Jack';
  insert into program_items (day_id, exercise_id, section_id, sets, reps, rest_sec, sort) values
    (d_wed, ex_id, (select id from program_sections where day_id = d_wed and sort = 0), 1, 45, 0, 1);
  -- warm 2: کرم‌حرکت (اینچ‌ورم)
  select id into ex_id from exercises where name_en = 'Inchworm';
  insert into program_items (day_id, exercise_id, section_id, sets, reps, rest_sec, sort) values
    (d_wed, ex_id, (select id from program_sections where day_id = d_wed and sort = 0), 1, 6, 0, 2);
  -- warm 3: کشش گربه و گاو (نرمش کمر)
  select id into ex_id from exercises where name_en = 'Cat-Cow Stretch';
  insert into program_items (day_id, exercise_id, section_id, sets, reps, rest_sec, sort) values
    (d_wed, ex_id, (select id from program_sections where day_id = d_wed and sort = 0), 1, 8, 0, 3);
  -- main 1: پرس پایی با دمبل (تراستر)
  select id into ex_id from exercises where name_en = 'Dumbbell Push Press';
  insert into program_items (day_id, exercise_id, section_id, sets, reps, rest_sec, sort) values
    (d_wed, ex_id, (select id from program_sections where day_id = d_wed and sort = 1), 5, 10, 0, 1);
  -- main 2: یک‌ضرب دمبل تک‌دست
  select id into ex_id from exercises where name_en = 'One Arm Dumbbell Snatch';
  insert into program_items (day_id, exercise_id, section_id, sets, reps, rest_sec, sort) values
    (d_wed, ex_id, (select id from program_sections where day_id = d_wed and sort = 1), 5, 6, 0, 2);
  -- main 3: پارویی رنیگید (پلانک + پارویی)
  select id into ex_id from exercises where name_en = 'Dumbbell Renegade Row';
  insert into program_items (day_id, exercise_id, section_id, sets, reps, rest_sec, sort) values
    (d_wed, ex_id, (select id from program_sections where day_id = d_wed and sort = 1), 5, 8, 0, 3);
  -- main 4: بالا رفتن روی چهارپایه با دمبل
  select id into ex_id from exercises where name_en = 'Dumbbell Step Up';
  insert into program_items (day_id, exercise_id, section_id, sets, reps, rest_sec, sort) values
    (d_wed, ex_id, (select id from program_sections where day_id = d_wed and sort = 1), 5, 8, 0, 4);
  -- main 5: برپی
  select id into ex_id from exercises where name_en = 'Burpees';
  insert into program_items (day_id, exercise_id, section_id, sets, reps, rest_sec, sort) values
    (d_wed, ex_id, (select id from program_sections where day_id = d_wed and sort = 1), 5, 6, 60, 5);
  -- main 6: پلانک پایانی
  select id into ex_id from exercises where name_en = 'Plank';
  insert into program_items (day_id, exercise_id, section_id, sets, reps, rest_sec, sort) values
    (d_wed, ex_id, (select id from program_sections where day_id = d_wed and sort = 1), 1, 60, 0, 6);
  -- cool 1: کشش پشت ران ایستاده
  select id into ex_id from exercises where name_en = 'Standing Hamstring Stretch';
  insert into program_items (day_id, exercise_id, section_id, sets, reps, rest_sec, sort) values
    (d_wed, ex_id, (select id from program_sections where day_id = d_wed and sort = 2), 1, 30, 0, 1);
  -- cool 2: کشش شانه و بازو
  select id into ex_id from exercises where name_en = 'Arm Circles';
  insert into program_items (day_id, exercise_id, section_id, sets, reps, rest_sec, sort) values
    (d_wed, ex_id, (select id from program_sections where day_id = d_wed and sort = 2), 1, 30, 0, 2);

  ------------------------------------------------------------------
  -- خلاصه: 2 برنامه، 10 روز، 102 آیتم، 52 حرکت
  ------------------------------------------------------------------
end $$;

-- صحت‌سنجی (اجرای دستی بعد از سید):
-- select (select count(*) from exercises) e, (select count(*) from programs) p,
--        (select count(*) from program_days) d, (select count(*) from program_items) i;
-- انتظار: e=52  p=2  d=10  i=102

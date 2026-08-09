# سحب الأرقام — القسم الأول (WhatsApp Number Extraction)

تطبيق إنتاجي كامل (Backend + Frontend) لتنفيذ **القسم الأول فقط** من مواصفة
لوحة تحكم واتساب المؤسسية: استخراج أرقام الهواتف من مجموعات واتساب، مع تطبيق
القواعد العامة والقواعد الصارمة ذات الصلة من ملف المواصفات (بنية معمارية
معيارية، أمان، قاعدة بيانات، جودة كود، مراقبة لحظية).

هذا القسم **مستقل تماماً** — لا يحتوي على أي وظيفة من الأقسام الأخرى (فلترة،
حسابات إرسال، إعلانات/حملات). قاعدة بياناته وحساباته منفصلة بالكامل ولا
تتشارك شيئاً مع أي قسم مستقبلي.

---

## ما الذي تم بناؤه فعلياً

### Backend (`/backend`) — Node.js 20+ / TypeScript / Express

- **بنية معيارية (Modular)**: قسم `number-extraction` معزول بالكامل ضمن
  `src/modules/number-extraction`، لا يعتمد عليه أي كود آخر ولا يعتمد هو على
  أي قسم مستقبلي.
- **PostgreSQL + Drizzle ORM**: 8 جداول (حسابات، جلسات مشفّرة، مجموعات، أرقام
  مستخرجة، عمليات سحب، مستخدمون، سجل تدقيق، سجل نظام) مع فهارس، علاقات
  Foreign Key، وقيد فريد (`UNIQUE`) على رقم الهاتف يضمن **"سجل واحد فقط"**
  فعلياً على مستوى قاعدة البيانات وليس فقط على مستوى الكود.
- **Baileys (@whiskeysockets/baileys)**: اتصال حقيقي متعدد الحسابات بواتساب،
  مع:
  - تخزين جلسة كل حساب **مشفّرة AES-256-GCM** داخل PostgreSQL (وليس ملفات على
    القرص — يضمن بقاء الجلسات بعد كل عملية نشر جديدة على Railway).
  - إعادة اتصال تلقائية بتراجع أسي (exponential backoff) عند الانقطاع.
  - معالجة خاصة لصيغة **LID** (نظام خصوصية واتساب الحديث الذي يخفي رقم الهاتف
    الحقيقي) — لا يُخزَّن LID كأنه رقم هاتف؛ يُصنَّف ضمن "الأرقام المحذوفة".
- **BullMQ + Redis**: طابور لعمليات السحب الطويلة، مع إعادة محاولة تلقائية،
  ومنع تنفيذ عمليتي سحب لنفس الحساب في وقت واحد، واستئناف تلقائي بعد إعادة
  تشغيل الخادم.
- **JWT + RBAC**: ثلاث صلاحيات (admin / operator / viewer)، bcrypt لتشفير
  كلمات المرور، rate limiting على تسجيل الدخول (حماية من Brute Force)، وسجل
  تدقيق (Audit Log) لكل عملية إضافة/تعديل/حذف/تشغيل/إيقاف.
- **Socket.IO**: بث لحظي لكل شيء (حالة الحسابات، تقدّم السحب، سجل الأحداث،
  استهلاك الموارد) — الواجهة لا تحتاج إعادة تحميل الصفحة أبداً.
- **اختبارات حقيقية**: 39 اختبار (وحدة + تكامل) تعمل ضد PostgreSQL حقيقي،
  تغطي: تحليل أرقام الهاتف من JID (بما فيها LID)، التشفير AES-256-GCM، منطق
  إزالة التكرار (upsert متزامن آمن)، حلقة السحب الكاملة (مع محاكاة Baileys)،
  ومنع تنفيذ عمليتين متزامنتين.

### Frontend (`/frontend`) — React 18 / TypeScript / Vite / Tailwind

- واجهة **عربية/إنجليزية** كاملة مع تبديل فوري للاتجاه (RTL/LTR).
- وضع داكن/فاتح، تصميم Glassmorphism بزوايا 2XL وظلال حديثة (كما تطلب
  المواصفة حرفياً)، حركات عبر Framer Motion مع احترام `prefers-reduced-motion`.
- ثلاث لوحات تفاعلية دون أي إعادة تحميل صفحة:
  1. **المراقبة اللحظية**: كل المؤشرات المطلوبة (الحسابات، المجموعات،
     الأعضاء، الأرقام الجديدة/المكررة/المحذوفة، استهلاك المعالج/الذاكرة،
     سجل الأحداث المباشر، توزيع الدول).
  2. **الحسابات**: إضافة/تعديل/حذف/تشغيل/إيقاف، عرض QR للربط، تفاصيل كل حساب
     (سجل العمليات + سجل الأخطاء).
  3. **الأرقام المستخرجة**: جدول مُرقَّم (pagination) مع بحث وفلترة أساسية.

---

## البدء السريع (تطوير محلي)

### المتطلبات
- Node.js ≥ 20
- PostgreSQL ≥ 14
- Redis ≥ 6

### 1) الباك-إند

```bash
cd backend
cp .env.example .env
# عدّل .env: DATABASE_URL, REDIS_URL, وولّد الأسرار بالأمر التالي لكل من
# JWT_ACCESS_SECRET / JWT_REFRESH_SECRET / ENCRYPTION_KEY:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# (ENCRYPTION_KEY يجب أن يكون 32 بايت = 64 حرف hex بالضبط)

npm install
npm run db:migrate     # يطبّق src/db/migrations/0000_....sql الجاهز مسبقاً
npm run db:seed        # ينشئ مستخدم Admin من ADMIN_EMAIL/ADMIN_PASSWORD في .env
npm run dev             # يشغّل على http://localhost:4000
```

### 2) الواجهة الأمامية

```bash
cd frontend
npm install
npm run dev              # http://localhost:5173 — يمرّر /api و /socket.io تلقائياً إلى localhost:4000
```

سجّل الدخول بالبيانات التي وضعتها في `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

### تشغيل الاختبارات

```bash
cd backend
npm test        # 39 اختبار — يتطلب DATABASE_URL و REDIS_URL صالحين في .env
```

---

## النشر على Railway (يطابق أسلوب العمل المعتاد عبر GitHub)

1. ادفع هذا المجلد إلى مستودع GitHub جديد (من Termux كالمعتاد):
   ```bash
   git init && git add . && git commit -m "Section 1: number extraction"
   git remote add origin https://github.com/<username>/<repo>.git
   git push -u origin main
   ```
2. على Railway، أنشئ مشروعاً جديداً من نفس المستودع:
   - أضف **Plugin → PostgreSQL** (يوفّر `DATABASE_URL` تلقائياً).
   - أضف **Plugin → Redis** (يوفّر `REDIS_URL` تلقائياً).
   - أنشئ **خدمة Backend**: Root Directory = `backend`، أضف متغيرات البيئة
     المتبقية من `.env.example` (الأسرار، `CORS_ORIGIN` = رابط الواجهة).
     Start Command الافتراضي (`npm start`) يعمل بعد `npm run build`؛ فعّل
     Build Command = `npm install && npm run build && npm run db:migrate`.
   - أنشئ **خدمة Frontend**: Root Directory = `frontend`، Build Command =
     `npm install && npm run build`، Start Command = `npm start`. أضف
     `VITE_API_URL` و`VITE_SOCKET_URL` مشيرين لرابط خدمة الـ Backend (هذان
     متغيّرا بناء Build-time — أي تغيير لاحق يتطلب إعادة بناء).
3. بعد أول نشر، شغّل مرة واحدة (من Railway Shell أو محلياً بنفس
   `DATABASE_URL`): `npm run db:seed` لإنشاء مستخدم Admin أول.

---

## قرارات نطاق متعمّدة (Section 1 boundaries)

طُبِّقت كل القواعد العامة والصارمة ذات الصلة بهذا القسم تحديداً. القرارات
التالية اتُّخذت عمداً لإبقاء التسليم مركّزاً على القسم الأول فقط، لا كأخطاء
أو نقص:

- **لا 2FA**: التحقق الثنائي مذكور في القواعد كميزة أمان على مستوى لوحة
  التحكم بأكملها (كل الأقسام)، وليس خاصاً بالقسم الأول. بناؤه الآن لقسم واحد
  فقط غير متناسب؛ الأساس (JWT + bcrypt + RBAC + rate limiting + Audit Log)
  جاهز وقابل للتوسعة بإضافته لاحقاً في وحدة `auth` المشتركة.
- **لا زر "Reset الأرقام"**: هذا الزر تحديداً موصوف صراحة ضمن القسم الرابع
  (الحملات) لإزالة حالة "تمت المراسلة" — وهو مفهوم لا وجود له إطلاقاً في
  قاعدة بيانات القسم الأول.
- **لا تصدير/فلترة متقدمة حسب الدولة بنسب مئوية لكل دولة**: هذه وظائف القسم
  الثاني (فلترة الأرقام) صراحة. جدول الأرقام في القسم الأول يوفّر تصفّحاً
  وبحثاً أساسياً فقط، بما يكفي لإدارة بيانات القسم نفسه.

---

## بنية المشروع

```
whatsapp-number-extraction/
├── backend/
│   ├── src/
│   │   ├── modules/number-extraction/   # القسم الأول — معزول بالكامل
│   │   ├── shared/                       # أدوات/خدمات/middleware مشتركة
│   │   ├── auth/                         # JWT + RBAC
│   │   ├── db/                           # مخطط Drizzle + migrations
│   │   └── __tests__/                    # 39 اختبار
│   └── ...
├── frontend/
│   └── src/
│       ├── components/{accounts,dashboard,numbers,layout,ui}/
│       ├── contexts/                     # Auth, Socket, Language, Theme, DashboardData
│       └── pages/
└── docker-compose.yml                    # Postgres + Redis محليين (اختياري)
```

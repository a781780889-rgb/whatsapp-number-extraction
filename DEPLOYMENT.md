# Production deployment — Private Publishing

هذا التحديث يضيف قسم **النشر ع الخاص** إلى لوحة التحكم، لكنه يربط الإرسال الفعلي فقط بـ **WhatsApp Business Cloud API** والقوالب المعتمدة. لا يستخدم القسم جلسات QR أو أتمتة WhatsApp Web أو أي آلية لتجاوز أنظمة مكافحة الإساءة.

## التشغيل المحلي

انسخ `backend/.env.example` إلى `backend/.env`، ثم أدخل `DATABASE_URL` و`REDIS_URL` ومفاتيح JWT ومفتاح `ENCRYPTION_KEY` بطول 64 محرفاً سداسياً. شغّل PostgreSQL وRedis، ثم نفّذ `npm install` داخل `backend` و`frontend`. بعد ذلك نفّذ `npm run db:migrate` و`npm run dev` في الخلفية، و`npm run dev` في الواجهة.

## متطلبات WhatsApp

ينبغي إنشاء WhatsApp Business Account ورقم أعمال رسمي، وتسجيل التطبيق في Meta، والحصول على `phone_number_id` و`business_account_id` وAccess Token مخصص للخادم. يجب تسجيل موافقة المستلم ومصدرها قبل إدخاله في الحملات، ولا ينبغي تشغيل حملة إلا على قالب معتمد من Meta. القيم السرية تُخزن مشفرة في قاعدة البيانات ولا تُحفظ في Git.

## النشر المقترح

يمكن نشر الخلفية والواجهة وقاعدة البيانات وRedis كخدمات منفصلة خلف HTTPS. يجب أن يكون `CORS_ORIGIN` عنوان الواجهة النهائي، وأن يكون `DATABASE_URL` و`REDIS_URL` من مزود الإنتاج. نفّذ migration قبل تشغيل الإصدار الجديد، ثم راقب `/api/health` وسجلات الخلفية. لا تجعل Access Tokens متاحة للواجهة أو للمتصفح.

## حدود الإصدار الحالي

تتضمن هذه الدفعة نموذج البيانات، نقاط API المصادق عليها، لوحة المراقبة، منع التكرار على مستوى قاعدة البيانات، حقول الموافقة، عميل Cloud API، وحالة الحسابات والحملات. يحتاج تشغيل worker الإنتاج الذي يستهلك الحملات المجدولة ويرسل القوالب إلى تفعيل Redis/Queue وربطه ببيئة التشغيل الفعلية؛ لا يمكن اختبار الإرسال الواقعي دون بيانات Meta وموافقة المستخدمين.

## التحقق قبل الإطلاق

شغّل `npm run typecheck` و`npm run build` في المجلدين. اختبارات قاعدة البيانات تحتاج PostgreSQL وRedis قيد التشغيل؛ بيئة التنفيذ الحالية لا تحتوي على Docker، لذلك تم التحقق من اختبارات الوحدات التي لا تتطلب قاعدة بيانات ومن بناء TypeScript/Vite.

## ربط الحسابات من لوحة التحكم

زر **إضافة حساب WhatsApp** يطلق تدفق **Meta Embedded Signup v4** الرسمي. يجب ضبط `META_APP_ID` و`META_APP_SECRET` و`META_EMBEDDED_SIGNUP_CONFIG_ID` و`META_EMBEDDED_SIGNUP_REDIRECT_URI` في الخادم، وإضافة نطاق لوحة التحكم إلى إعدادات OAuth وAllowed Domains في تطبيق Meta. لا ينشئ التطبيق QR بنفسه؛ إذا كان حساب WhatsApp Business مؤهلاً لـ Coexistence، فإن QR أو رمز التحقق يظهر داخل تجربة Meta الرسمية، ثم تعيد Meta رمز التفويض ومعرّفات WABA ورقم الهاتف إلى التطبيق.

بعد اكتمال التدفق، يرسل الخادم رمز التفويض إلى Graph API لتبادل الرمز Access Token server-side، ثم يخزن الرمز مشفراً ولا يعرضه للمتصفح. كل سجل حساب يملك `phone_number_id` و`business_account_id` وحالة اتصال مستقلة. يجب تطبيق migration الجديد قبل تشغيل الإصدار.

> لا تستخدم Baileys أو Puppeteer أو جلسات WhatsApp Web لهذا المسار. هذه الأدوات لا تمثل تدفق WhatsApp Business Platform الرسمي، ولا ينبغي استخدامها لإرسال حملات من هذا النظام.

توضح Meta أن Embedded Signup v2 سيُهمَل في 15 أكتوبر 2026؛ لذلك يستخدم هذا التحديث إعداد v4 ولا يعتمد على تدفق v2. راجع [توثيق Embedded Signup الرسمي](https://developers.facebook.com/documentation/business-messaging/whatsapp/embedded-signup/implementation) و[توثيق Coexistence الرسمي](https://developers.facebook.com/documentation/business-messaging/whatsapp/embedded-signup/onboarding-business-app-users).

المراجع الرسمية: [Meta — About the WhatsApp Business Platform](https://developers.facebook.com/documentation/business-messaging/whatsapp/about-the-platform)، [Meta — Webhooks](https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/overview)، [Meta — Send Messages](https://developers.facebook.com/documentation/business-messaging/whatsapp/messages/send-messages).

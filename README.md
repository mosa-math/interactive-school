# منصتي التفاعلية — الإصدار الثاني

تم فحص ملفات المستودع الأصلي: index.html وstyle.css وapp.js وREADME.txt. بقيت أدوات العروض والتحديات والكتاب والاختبارات مع مفاتيح تخزينها السابقة edu_slides وedu_pages وedu_questions. الاستوديو الجديد مستقل ويحفظ درسه في edu_lessonV2. لا توجد عملية ترحيل تحذف أعمال الإصدار الأول.

## ما تتضمنه النسخة

واجهة عربية RTL، إدخال المادة والصف وعنوان الدرس وعدد الشرائح ومستوى الشرح، توليد آمن، تحرير الشرح والأسئلة وتفسير الإجابة، ترتيب وإضافة وحذف الشرائح، عرض كامل الشاشة مع الأسهم وEscape، استيراد وتصدير الدروس JSON، ونسخ محتوى الدرس إلى أداة العروض القديمة. الأرقام في الاستوديو عربية هندية مشرقية. لا تتضمن النسخة تصدير PowerPoint أو مزامنة بين الأجهزة. راجع الدروس المولدة علميًا وتربويًا قبل استخدامها؛ لا يُرفق كتاب منهجي بالمطالبة تلقائيًا.

## البنية

المتصفح ← GitHub Pages (ملفات عامة) ← Cloudflare Worker ← OpenAI Responses API.

المفتاح السري في أسرار Worker فقط. config.js يحتوي رابط الخدمة ومفتاح Turnstile العام فقط. تُعرض النصوص كنصوص مُهربة دون تنفيذ HTML من الاستجابة. الخدمة تتحقق من Origin والحقول وحجم الطلب والنتيجة، وتتحقق من Turnstile على الخادم ومن hostname وaction. تضيف مهلات وحدودًا للطلبات ولا ترجع أخطاء المزود الحساسة. لا توجد قاعدة بيانات في الخادم، ويُرسل وصف الدرس إلى المزود مع store:false. يظل الحفظ في المتصفح، وقد تضيع البيانات بمسح بياناته؛ صدّر نسخًا احتياطية.

## الخدمات المطلوبة

1. مستودع GitHub الحالي وGitHub Pages.
2. حساب Cloudflare مع Workers وTurnstile، وصلاحية استخدام Rate Limiting bindings في حسابك.
3. حساب OpenAI API مع فوترة/رصيد وصلاحية النموذج المحدد. اشتراك واجهة المحادثة ليس إعدادًا لهذه الخدمة.
4. Node.js حديث وnpm لنشر Worker عبر Wrangler. لا تحتاج الواجهة إلى تثبيت حزم أو بناء.

## إعداد الخدمة الخلفية

من مجلد server شغّل:

```sh
npx wrangler login
npx wrangler secret put OPENAI_API_KEY
npx wrangler secret put TURNSTILE_SECRET_KEY
npx wrangler deploy
```

يطلب كل secret إدخال القيمة في الطرفية؛ لا تكتب القيم في الملفات أو GitHub أو المحادثة. يمكن كذلك إضافتها من Cloudflare Dashboard > Worker > Settings > Variables and Secrets كنوع Secret. انشر مجددًا إذا عدّلت الإعدادات.

أنشئ Turnstile Widget من لوحة Cloudflare وأضف hostname: mosa-math.github.io (دون مسار أو https). ضع مفتاحه السري في TURNSTILE_SECRET_KEY والعام في config.js. نوع Managed مناسب. تُحدّد الواجهة action بقيمة generate وتفحصه الخدمة.

راجع server/wrangler.toml:

- ALLOWED_ORIGIN = https://mosa-math.github.io دون مسار interactive-school ودون / في النهاية.
- TURNSTILE_HOSTNAME = mosa-math.github.io.
- OPENAI_MODEL = gpt-4o-mini افتراضيًا؛ يمكن استبداله بنموذج متاح لحسابك يدعم Structured Outputs وResponses API.
- RATE_LIMITER: ثلاثة طلبات في الدقيقة لكل IP؛ GLOBAL_LIMITER: عشرون طلبًا في الدقيقة لكل موقع تنفيذ Cloudflare. اجعل namespace_id فريدًا إذا تعارض مع إعدادات أخرى لديك.

حدود Cloudflare هذه تقريبية وموزعة وليست سقف إنفاق عالميًا صارمًا. CORS وTurnstile لا يشكلان تسجيل دخول، والخدمة متاحة لزوار موقعك. اضبط ميزانية وتنبيهات مشروع المزود وراقب الاستهلاك؛ إذا أردت حصر التوليد في المعلمين فقط، أضف مصادقة مستخدمين قبل فتح الخدمة لهم. لا تضف كلمة سر ثابتة في JavaScript العام.

بعد النشر انسخ workers.dev URL إلى config.js مع المسار /generate:

```js
window.SCHOOL_CONFIG = {
  apiUrl: 'https://interactive-school-api.YOUR-SUBDOMAIN.workers.dev/generate',
  turnstileSiteKey: 'YOUR_PUBLIC_SITE_KEY'
};
```

## تحديث GitHub Pages

1. من الموقع الحالي صدّر النسخة الاحتياطية للأدوات الأربع إن كانت لديك بيانات مهمة.
2. احتفظ بنسخة من ملفات المستودع أو أنشئ فرعًا للتحديث.
3. استبدل الملفات index.html وapp.js وstyle.css في جذر المستودع، وأضف studio.js وconfig.js بعد ضبطه. ارفع الملفات نفسها لا ملف ZIP. أبقِ أي ملفات أخرى غير مرتبطة بالتحديث.
4. احتفظ بمجلدي server وtests ودليل README.md في المستودع إن رغبت؛ لا توجد أسرار فيهما. لا ترفع .dev.vars أو .env أو node_modules أو مفاتيح فعلية. ملف .gitignore المرفق يستبعدها.
5. تبقى Settings > Pages على Deploy from a branch ثم main و/(root). لا تحتاج GitHub Actions جديدًا ولا موقع Sites منفصلًا.
6. افتح https://mosa-math.github.io/interactive-school/#studio بعد اكتمال النشر وحدّث الصفحة تحديثًا كاملًا عند ظهور نسخة قديمة.

## التحقق بعد النشر

جرّب كل أداة قديمة وبياناتها، ثم أدخل مادة وصفًا وعنوانًا وأكمل تحقق Turnstile وولّد ست شرائح. عدّل سؤالًا واحفظه واعرض الدرس. صدّره ثم استورده. جرّب من هاتف. افتح Network وتأكد أن الطلب يذهب إلى Worker ولا يحتوي Authorization أو مفتاح OpenAI. لا تنسَ أن Turnstile سيحتاج تحققًا جديدًا بعد كل محاولة.

إن ظهر «خدمة التوليد غير مهيأة»، راجع الأسرار وربط المحددات واسم المضيف. إن ظهر خطأ من المزود، راجع رصيد API وصلاحية النموذج وسجلات Cloudflare دون تسجيل الأسرار أو نصوص المستخدمين. خطأ CORS يعني غالبًا اختلاف origin أو رابط الخدمة. رسالة التحقق تتطلب مفتاح Widget الصحيح وhostname مطابقًا.

## اختبارات محلية

```sh
node --test tests/worker.test.mjs
node --check app.js
node --check studio.js
node --check server/worker.mjs
python3 -m http.server 8765
```

افتح http://localhost:8765/#studio لإنشاء وتحرير درس يدوي. لا تسمح الخدمة الإنتاجية بطلبات localhost افتراضيًا. اختبارات Worker تستخدم استجابات محاكية ولا تستهلك رصيدًا.

## نتيجة التحقق أثناء التسليم

نجحت ثلاث مجموعات اختبارات تشمل تحقق المدخلات والمخرجات، CORS، OPTIONS، غياب الإعداد، حد الحجم، رفض التحدي، تحديد الطلبات، استجابة ناجحة محاكية واستجابة ناقصة. اجتاز JavaScript فحص الصياغة. اختُبر في المتصفح فتح الاستوديو وإنشاء درس يدوي وتعديل عنوانه ونصه وحفظه وعرضه. بقيت الأدوات الأربع في الكود الأصلي؛ لم يُختبر كل مسار لها داخل المتصفح. لم يُختبر توليد حقيقي أو نشر Cloudflare/GitHub لعدم إعداد الحسابات والأسرار. لم تُرفع تغييرات إلى المستودع البعيد.

## مراجع التنفيذ

- https://developers.openai.com/api/docs/guides/structured-outputs
- https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
- https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/

للتراجع: استعد ملفات الإصدار الأول من Git؛ تبقى بياناته المحلية كما هي. أوقف Worker من لوحة Cloudflare لإيقاف التوليد.

# الرفع على GitHub بالخطوات

## الطريقة السهلة (بدون أوامر)
1. ادخل https://github.com/new
2. اسم المستودع مثلا: `mental-health-system`
3. خليه Public ولا تعلم على README
4. اضغط Create repository
5. في الصفحة التالية اضغط `uploading an existing file` واسحب كل ملفات مجلد 888 (index.html, style.css, app.js, assets)
6. بعد الرفع اذهب Settings > Pages > Build and deployment > Source: Deploy from a branch > Branch: main / root > Save
7. انتظر دقيقة وسيظهر الرابط: https://USERNAME.github.io/mental-health-system/

## الطريقة بالأوامر (بعد تثبيت Git)
حمل Git من: https://git-scm.com/download/win

ثم في مجلد 888 شغل PowerShell:

```powershell
git init
git add .
git commit -m "إطلاق نظام الأمانة العامة"
git branch -M main
git remote add origin https://github.com/USERNAME/mental-health-system.git
git push -u origin main
```

ثم فعل Pages كما في الخطوة 6 أعلاه.

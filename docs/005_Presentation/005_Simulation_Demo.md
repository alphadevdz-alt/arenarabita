# محاكاة تشغيل NSSMS

## حسابات تجريبية محلية فقط

| المستخدم | كلمة المرور | الدور |
|---|---|---|
| demo.admin | NssmsDemoAdmin-2026! | إداري نظام |
| demo.national | NssmsDemoNational-2026! | إداري وطني |
| demo.association.admin | NssmsAssocAdmin-2026! | مدير رابطة سطيف |
| demo.association.rep | NssmsAssocRep-2026! | ممثل الرابطة |
| demo.daira.officer | NssmsDairaOff-2026! | موظف دائرة سطيف |
| demo.institution | NssmsInstitution-2026! | مسؤول مؤسسة منخرطة |

## بيانات المحاكاة
- ولاية سطيف ودائرة سطيف
- ثانوية الشهيد فرحات عباس
- الموسم 2025-2026
- 15 منافسة معتمدة: 9 فردية و6 جماعية
- ثلاثة إعلانات رسمية مع صور
- مشاركون وتسجيلات وترخيص رقمي ونتيجة منشورة

الإدارة منفصلة على `/admin.html`. الجمهور يبقى على الصفحة الرئيسية فقط.

حساب رابطة لكل ولاية: `demo.w16.admin` … `demo.w58.admin` / `NssmsWilayaAdmin-2026!`

## تشغيل
```bash
cd backend
npm run pg:embedded
DATABASE_URL=postgres://nssms:nssms@127.0.0.1:5432/nssms npm run migrate
DATABASE_URL=postgres://nssms:nssms@127.0.0.1:5432/nssms npm run seed:simulation
DATABASE_URL=postgres://nssms:nssms@127.0.0.1:5432/nssms npm run dev
```

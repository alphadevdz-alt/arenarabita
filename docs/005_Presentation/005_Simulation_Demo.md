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
- رموز تحقق تجريبية محلية:
  - مدرب: `NSSMS-COACH-5D56C0935D8249B5`
  - تلميذ: `NSSMS-STUD-AAD93430F8E1A1F1`
  - ترخيص: `NSSMS-LIC-SETIF-FARHAT-ABBAS-2026`

الإدارة منفصلة على `/admin.html`. الجمهور يبقى على الصفحة الرئيسية فقط.

حساب رابطة لكل ولاية: `demo.w16.admin` … / `NssmsHierarchy-2026!`  
حساب كل دائرة: `demo.d{id}` / `NssmsHierarchy-2026!`  
عشر مؤسسات لكل ولاية: `demo.w19.i01` … `demo.w19.i10` / `NssmsHierarchy-2026!` (رياضة وصنف مختلفان)

## تشغيل
```bash
cd backend
npm run pg:embedded
DATABASE_URL=postgres://nssms:nssms@127.0.0.1:5432/nssms npm run migrate
DATABASE_URL=postgres://nssms:nssms@127.0.0.1:5432/nssms npm run seed:simulation
DATABASE_URL=postgres://nssms:nssms@127.0.0.1:5432/nssms npm run dev
```

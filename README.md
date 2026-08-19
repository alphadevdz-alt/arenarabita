# NSSMS

## National School Sports Management System

**Status:** Feature-complete local foundation (WIP for production approvals)

NSSMS is a proposed national governmental platform for managing school sports in Algeria.

### Master Vision
إنشاء النظام الوطني لتسيير الرياضة المدرسية في الجزائر كمنصة حكومية رسمية.

### Project Pillars
- تطبيق اللوائح الرسمية.
- هوية بصرية حكومية جزائرية.
- إدارة المواسم والمنافسات.
- إجازات رقمية مع QR.
- سجل تدقيق Audit.
- عدم الحذف النهائي.
- بوابة عامة ولوحات إدارة.

### Documentation Strategy
The project is being built in controlled layers:
1. Project foundation.
2. Professional business analysis.
3. Detailed system requirements.
4. UI/UX specification.
5. Database specification.
6. API/security/testing.
7. Implementation.

### Important Rule
The master specification is the source of truth. Unspecified matters are marked as **TBD**, **Open Decision**, or **Proposed** and are not treated as confirmed facts.

### Foundation status
The implementation readiness assessment is in `docs/000_Project/007_Implementation_Readiness.md` and the proposed technical baseline is in `docs/000_Project/008_Technical_Architecture.md`. The first PostgreSQL migration is in `database/migrations/001_initial_schema.sql`; the backend foundation is in `backend/`.

## Local runbook

To request both development services in separate PowerShell windows, run `./scripts/start-local.ps1` from the project root. It applies migrations first and does not seed accounts automatically. Stop listeners on the development ports with `./scripts/stop-local.ps1`.

Requirements: Node.js, PostgreSQL 17+, and a database/user matching the connection string below.

Backend terminal:

```powershell
cd D:\rabiita\NSSMS\backend
$env:DATABASE_URL = "postgres://nssms:nssms@localhost:5432/nssms"
$env:AUTH_SECRET = "local-development-secret-change-me"
npm run migrate
npm run seed:demo
npm run dev
```

Frontend terminal:

```powershell
cd D:\rabiita\NSSMS\frontend
$env:VITE_API_URL = "http://localhost:3000"
npm run dev
```

Demo accounts (local simulation only):

- `demo.admin` / `NssmsDemoAdmin-2026!` — إداري نظام
- `demo.national` / `NssmsDemoNational-2026!` — إداري وطني
- `demo.association.admin` / `NssmsAssocAdmin-2026!` — رابطة سطيف
- `demo.association.rep` / `NssmsAssocRep-2026!` — ممثل الرابطة
- `demo.daira.officer` / `NssmsDairaOff-2026!` — دائرة سطيف
- `demo.institution` / `NssmsInstitution-2026!` — ثانوية الشهيد

Simulation seed: `cd backend && npm run seed:simulation` after migrations. Embedded PostgreSQL: `npm run pg:embedded`.

National geography and school directory come from [GeoAlgeria](https://github.com/yasserstudio/geoalgeria) (`geoalgeria` + `@geoalgeria/ecoles@2.1.0`, MIT). Import with `npm run import:geoalgeria`.

Validation commands:

```powershell
cd D:\rabiita\NSSMS\backend
npm test -- --run
npm run build
cd ..\frontend
npm run build
```

# Academic Compass — Migration Progress & Next Steps

**Last updated:** 2026-08-10  
**Branch:** `resume-workspace-state-analysis`  
**Session summary:** Completed Vercel deployment configuration, Prisma schema fixes, TypeScript error resolution, Supabase database seeding via SQL, frontend bootstrap page, and backend serverless routing setup. Backend and frontend are deployed on Vercel with pooled Supabase connection.

---

## 1. What We’ve Accomplished

### Phase 7 — Vercel Deployment Configuration
- **Fixed `backend/vercel.json`** multiple times:
  - Removed `builds` block that bypassed build scripts
  - Added `installCommand: "pnpm install --frozen-lockfile"`
  - Added `functions` config mapping `dist/serverless.mjs` to Node.js 20 runtime
  - Added `routes` mapping `/api/(.*)` → `/dist/serverless.mjs`
- **Updated `backend/package.json`**:
  - Added `postinstall` script: `prisma generate --schema=./prisma/schema.prisma`
  - Updated `build` and `vercel-build` scripts to run `prisma generate` before esbuild
  - Removed `prisma db push` and seed execution from build scripts to avoid Vercel timeouts/pooler errors
  - Pinned `prisma` and `@prisma/client` to `6.6.0` to avoid Prisma 7 breaking changes
- **Created `backend/.npmrc`** with `save-exact=true` and `save-prefix=''` to prevent accidental Prisma upgrades
- **Created `backend/.env`** with Supabase pooled connection string and MailerSend SMTP config
- **Updated `backend/.env.example`** with sanitized placeholders and clear Supabase/Database instructions

### Phase 8 — Prisma Schema & Build Fixes
- **Removed deprecated preview feature** `fullTextIndex` from `prisma/schema.prisma` (kept `fullTextSearchPostgres`)
- **Fixed TypeScript compilation errors** across backend:
  - `src/modules/auth/auth.service.ts` — explicit types for `r.role` mappings and nullable fields
  - `src/modules/conflicts/conflicts.service.ts` — fixed `serverValue`/`incomingValue` nullable type mismatches
  - `src/modules/imports/imports.service.ts` — explicit `any` types for student map iterations
  - `src/modules/sms/sms.service.ts` — explicit `any` type for log mapping
  - `src/modules/timetable/timetable.service.ts` — explicit `any` type for slot mapping
  - `src/core/guards/nestjs.guards.ts` — explicit type for `r.role`
  - `src/seed.ts` — explicit type for `r.role` in admin seeding
- **Fixed `backend/build.mjs`** multiple times:
  - Removed TypeScript `as const` syntax leak into JavaScript
  - Resolved esbuild output collisions by using single bundle to `dist/`
  - Added Vercel `functions` config instead of manual `api/` copy
- **Generated migration SQL** via `prisma migrate diff` and fixed missing `Role` enum creation
- **Created database tables** in Supabase by running migration SQL directly in SQL Editor

### Phase 9 — Frontend Bootstrap & Seeding
- **Created `frontend/src/pages/Bootstrap.tsx`** — one-time school initialization page
- **Added `/bootstrap` route** to `frontend/src/App.tsx`
- **Seeded initial data** via Supabase SQL Editor:
  - School: `Drumvale Academy` (code: `drumvale-academy`)
  - Admin users:
    - `drumvaleacademy@gmail.com` / `Drumvale@academy16.2026`
    - `alphoncewekesamukaisi@gmail.com` / `Pikachualvin123#`
    - `scarmwangi@gmail.com` / `Scarmwangi001`
  - All users assigned `PLATFORM_ADMIN` and `PRINCIPAL` roles

### Phase 10 — Deployment & Network Fixes
- **Identified DNS resolution failure** for direct Supabase hostnames on local network
- **Confirmed Supabase pooled connection works** (`aws-1-eu-west-1.pooler.supabase.com:6543`)
- **Updated `DATABASE_URL`** to use pooled connection with `pgbouncer=true`
- **Pushed all fixes** to GitHub branch `resume-workspace-state-analysis`

---

## 2. Current State

### Backend (`/backend`)
- **Stack:** Express + NestJS hybrid (NestJS at `/api/v2`, Express legacy routes at `/api`)
- **Database:** Prisma 6.6.0 schema synced with Supabase via pooled connection
- **Auth:** Supabase Auth + JWT, no public signup, teacher creation with domain validation
- **Modules:** Auth, Marks, Timetable, Conflicts, Sync, Imports, SMS fully implemented
- **Deployment:** Vercel serverless function at `dist/serverless.mjs`, routes `/api/*`
- **Build:** TypeScript → esbuild bundle, prisma generate in postinstall

### Frontend (`/frontend`)
- **Stack:** React 19 + TypeScript + Vite + Tailwind + Radix UI
- **Auth:** Updated to use `/v2/auth/*` endpoints
- **Pages:** Bootstrap page added for first-time setup; other pages still using local `useSchool` state
- **Deployment:** Vercel with `VITE_API_ORIGIN` pointing to backend

### Environment Variables (Vercel)
- **Backend:** `DATABASE_URL` (pooled), `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SESSION_SECRET`, `FRONTEND_URL`, `SMTP_*`, `EMAIL_FROM`, `SEED_ADMINS`
- **Frontend:** `VITE_API_ORIGIN`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

---

## 3. Remaining Work (Next Steps)

### Immediate
1. **Verify production deployment**
   - Confirm backend health: `GET https://final-academic-compass-backend.vercel.app/`
   - Confirm API routing: `POST /api/v2/auth/signin` returns 400 (not 404)
   - Sign in with seeded admin and verify dashboard loads

2. **Frontend routing**
   - Add conditional redirect: if no school exists, redirect `/` → `/bootstrap`
   - Otherwise redirect `/` → `/auth` or dashboard

### Short-term
3. **Students page backend integration**
   - Create `StudentsModule` with CRUD endpoints
   - Update frontend `Students.tsx` to fetch from `/v2/students`
   - Add CSV import support

4. **Classes/Streams/Subjects backend integration**
   - Create `ClassesModule`, `SubjectsModule` with CRUD
   - Update frontend pages to fetch from `/v2/classes`, `/v2/subjects`

5. **Exams backend integration**
   - Create `ExamsModule` with CRUD and status workflow
   - Update frontend `Exams.tsx` to fetch from `/v2/exams`

6. **Parent management UI and API**
   - Create `ParentsModule` with CRUD
   - Implement parent-student relationship endpoints
   - Build parent management UI in frontend

### Medium-term
7. **Marks entry page full integration**
   - Wire `MarkEntry.tsx` to `/v2/marks` endpoints
   - Add real-time validation and error states

8. **Timetable page full integration**
   - Wire `TimeTable.tsx` to `/v2/timetable` endpoints
   - Add conflict detection on backend

9. **Audit logging**
   - Implement `AuditModule` with decorators for sensitive actions
   - Log teacher CRUD, role changes, mark writes, timetable edits

10. **Rate limiting and security hardening**
    - Add `@nestjs/throttler`
    - Input sanitization
    - Ensure no secrets in frontend env

11. **Testing**
    - Unit tests for services
    - Integration tests for critical flows
    - E2E tests for auth bootstrap and mark entry

12. **Production hardening**
    - Configure custom domains (`academic-compass.co.ke`, `api.academic-compass.co.ke`)
    - Configure SSL, CORS, rate limiting
    - Set up monitoring and error tracking

---

## 4. Key Decisions

| Decision | Rationale |
|---|---|
| **Monorepo layout** | Keeps frontend, backend, shared libs, docs, and Supabase migrations in one repo |
| **NestJS + Express hybrid** | Allows incremental migration without breaking existing Express routes |
| **Prisma ORM** | Type-safe database access, migrations, and PostgreSQL support via Supabase |
| **Supabase Auth** | Retained for identity; removed public signup; teachers admin-created |
| **Safravo SMS** | Chosen as SMS provider with sender ID |
| **MailerSend SMTP** | Chosen for transactional emails (welcome, password reset) |
| **No public signup** | Teachers must be admin-created with configurable email domains |
| **School-level isolation** | `school_id` derived from authenticated user JWT; frontend-supplied values ignored for data access |
| **Role enum** | `PLATFORM_ADMIN`, `PRINCIPAL`, `SENIOR_TEACHER`, `TEACHER`, `PARENT`, `STUDENT` |
| **Supabase pooled connection** | Direct hostname `db.xxx.supabase.co` does not resolve on local network; pooled connection on port 6543 works reliably |
| **Vercel serverless functions** | Use `functions` config in `vercel.json` to map `dist/serverless.mjs` as API handler |

---

## 5. Environment Variables Required

```env
# Server
NODE_ENV=development
PORT=3001
FRONTEND_URL=https://final-academic-compass-frontend.vercel.app

# Session / JWT
SESSION_SECRET=replace-me-with-a-long-random-string

# Supabase
SUPABASE_URL=https://ccjbabsjtjbojkflgyls.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Database (PostgreSQL) — Use pooled connection for reliability
DATABASE_URL=postgresql://postgres:<YOUR_PASSWORD>@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true

# SMTP / Email (MailerSend)
SMTP_HOST=smtp.mailersend.net
SMTP_PORT=587
SMTP_USER=your-smtp-username@your-domain.com
SMTP_PASS=your-mailersend-smtp-password
SMTP_SECURE=false
EMAIL_FROM=noreply@your-domain.com

# SMS (Safravo)
SMS_PROVIDER=safravo
SMS_API_KEY=your-safravo-api-key
SMS_SENDER_ID=DrumvaleSec
SMS_PROVIDER_URL=https://api.safravo.com/v1

# Domain
APP_DOMAIN=drumvalesecondary.com
API_DOMAIN=api.drumvalesecondary.com

# Teacher email domains (comma-separated)
TEACHER_EMAIL_DOMAINS=school.ac.ke,teacher.ac.ke

# Seed platform admins (JSON array)
SEED_ADMINS='[{"email":"alphoncewekesamukaisi@gmail.com","fullName":"Alphonce Wekesa Mukaisi","password":"Pikachualvin123#"},{"email":"scarmwangi@gmail.com","fullName":"Scar Mwangi","password":"Scarmwangi001"}]'
```

---

## 6. Commits So Far

| Commit | Description |
|---|---|
| `3090f79` | Restructure into monorepo: frontend/, backend/, supabase/, docs/ |
| `547f9ec` | Add Prisma schema, NestJS scaffolding, core modules |
| `8acebcf` | Implement NestJS auth module with Supabase integration |
| `c901843` | Migrate Express routes to NestJS controllers, update frontend API client |
| `b14020b` | Frontend integration: remove signup, expand auth controller, update pages |
| `7ac5284` | Fix backend: remove builds block from vercel.json; update .env.example for MailerSend |
| `05bae56` | Fix backend: ensure prisma generate runs before build; fix TypeScript implicit any errors |
| `a4dc429` | Fix vercel: enforce pnpm install and use vercel-build for backend deployment |
| `d5c6cfd` | Fix backend: remove deprecated fullTextIndex preview feature; add explicit prisma generate postinstall |
| `e916eee` | Docs(backend): sanitize .env.example Supabase/Database placeholders |
| `9d82888` | Chore: update pnpm-lock.yaml |
| `80b6e71` | Fix(backend): remove prisma db push from build scripts to avoid Vercel timeouts |
| `c177bd8` | Chore(backend): update .env.example with Supabase/Database placeholders |
| `d026bd7` | Fix(backend): pin prisma to 6.6.0 to avoid Prisma 7 schema breaking changes |
| `2b1d6a9` | Fix(backend): resolve TypeScript implicit any and null type errors |
| `3a65f14` | Fix(vercel): remove seed step from build scripts to avoid pooler tenant identifier error |
| `68d831e` | Feat(frontend): add school bootstrap page for first-time setup |
| `81ec42d` | Fix(vercel): output serverless bundle to api/index.mjs and route /api/* to it |
| `70cd8c8` | Fix(build): remove TypeScript 'as const' syntax from build.mjs |
| `6d92e01` | Fix(build): use single esbuild build then copy serverless bundle to api/index.mjs |
| `8d11bc2` | Fix(build): verify serverless bundle exists before secondary build |
| `255cef0` | Fix(vercel): use functions config to route /api/* to dist/serverless.mjs |

---

## 1. What We’ve Accomplished

### Phase 0 — Setup & Tagging
- Tagged existing state as `v1.0-pre-migration` for rollback safety
- Created dedicated migration branch `migration/nestjs-backend`

### Phase 1 — Repository Restructuring
- Reorganized `Academic-Compass/artifacts/academic-compass` → `frontend/`
- Reorganized `Academic-Compass/artifacts/api-server` → `backend/`
- Moved shared libraries to root `lib/`
- Moved Supabase migrations to `supabase/`
- Moved docs to `docs/`
- Updated `pnpm-workspace.yaml`, root `tsconfig.json`, `vercel.json`
- Removed 8 corrupted/garbled source files and replaced them with minimal working stubs
- Verified:
  - `pnpm install` succeeds
  - `pnpm run typecheck` passes
  - Frontend `vite build` succeeds
  - Backend `esbuild` build succeeds

### Phase 2 — Prisma Schema + NestJS Scaffolding
- Designed and implemented a production-grade Prisma schema with 17 models:
  - `School`, `User`, `UserRole`, `RefreshToken`, `SchoolSettings`
  - `Class`, `Stream`, `Subject`
  - `TeacherSubjectAssignment`, `TeacherClassAssignment`
  - `Parent`, `StudentParent`, `Student`
  - `Term`, `Exam`
  - `MarkSheet`, `MarkEntry`
  - `TimetableSlot`
  - `SyncConflict`, `AuditLog`, `SmsLog`
  - `ActivationToken`, `CsvImport`
- Added full relation graph, foreign keys, indexes, and `gen_random_uuid()` primary keys
- Created initial migration SQL in both Prisma and Supabase
- Installed Prisma client and all NestJS dependencies
- Scaffolded NestJS module structure:
  - `AppModule`, `PrismaModule`
  - `AuthModule`, `UsersModule`, `SchoolsModule`
  - `ClassesModule`, `StudentsModule`, `TeachersModule`, `ParentsModule`
  - `SubjectsModule`, `ExamsModule`, `MarksModule`, `TimetableModule`
  - `ReportsModule`, `SmsModule`, `AuditModule`, `ImportsModule`
  - `ConflictsModule`, `SyncModule`
- Added core NestJS files:
  - `PrismaService`
  - `AuthGuard`, `RolesGuard`, `@Roles()` decorator
  - `app.nest.ts` (NestJS bootstrap with Express adapter)
- Added `.env.example` with all required environment variables
- Verified `prisma generate`, `typecheck`, and both builds

### Phase 3 — Auth Rewrite
- **Removed public signup** — no `/auth/signup` in new API
- **Implemented Supabase Auth integration** in `AuthService`:
  - `signin()` — validates credentials, returns JWT + user roles
  - `bootstrap()` — one-time school + platform_admin/principal creation
  - `me()` — returns current authenticated user
  - `forgotPassword()` / `resetPassword()` — email-based reset via Supabase magic links
  - `createTeacher()` — admin-created teachers with email domain validation, temp password, activation token
  - `activateUser()` — validates 7-day activation token
- **Added DTOs** with Zod validation for all auth endpoints
- **Expanded AuthController** with legacy-compatible endpoints:
  - `POST /v2/auth/signin`
  - `POST /v2/auth/bootstrap`
  - `GET /v2/auth/me`
  - `POST /v2/auth/forgot-password`
  - `POST /v2/auth/reset-password`
  - `POST /v2/auth/teachers`
  - `POST /v2/auth/activate`
  - `GET /v2/auth/profiles`
  - `DELETE /v2/auth/profiles/:id`
  - `POST /v2/auth/set-approval`
  - `POST /v2/auth/assign-role`
- **Updated backend `index.ts`** to mount NestJS router alongside existing Express app at `/api/v2`
- **Fixed Prisma schema** — added missing inverse relations
- Verified `typecheck` and backend `esbuild` build

### Phase 4 — Route Migration (Express → NestJS)
- Migrated core Express routes to NestJS controllers with Prisma implementations:
  - **Marks**: `GET /`, `POST /`, `POST /batch`
  - **Timetable**: `GET /`, `POST /`, `POST /batch`, `DELETE /:id`
  - **Conflicts**: `GET /`, `PATCH /:id`
  - **Sync**: `GET /`, `POST /`
  - **Imports**: `POST /marks`
- All controllers use `AuthGuard` for authentication
- Updated `AppModule` to register `ConflictsModule` and `SyncModule`
- Added `schoolId` to `SyncConflict` model and migration SQL
- Verified `typecheck` and backend `esbuild` build

### Phase 5 — Frontend Integration
- **Removed public signup** from `Auth.tsx` — page now shows only signin + forgot-password
- **Updated auth flow** — `store/auth.tsx` now calls `/v2/auth/*` endpoints
- **Updated role types** to match Prisma `Role` enum (`PLATFORM_ADMIN`, `PRINCIPAL`, `SENIOR_TEACHER`, `TEACHER`, `PARENT`, `STUDENT`)
- **Updated frontend API client** base URL from `/api` to `/api/v2`
- **Updated Teachers page** — all API calls now use `/v2/auth/*`, role constants updated
- **Fixed AuthContext** — restored `isHod`, `isReadOnly`, `canEditTimetable` properties
- Verified `typecheck` and both backend + frontend builds

### Phase 6 — SMS Module (Safravo)
- **Decided on Safravo** as SMS provider
- **Created SMS provider abstraction** (`SmsProvider` interface)
- **Implemented `SafravoSmsProvider`** with:
  - Configurable base URL, API key, and sender ID
  - `sendSms()` method calling Safravo API
  - Error handling and response parsing
- **Created SMS module**:
  - `SmsService` — wraps provider, logs to `sms_logs` table
  - `SmsController` — `POST /v2/sms/send`, `GET /v2/sms/logs`
  - `SmsModule` — registered in `AppModule`
- **Updated `.env.example`** with Safravo credentials
- Fixed TypeScript errors and verified `typecheck` and backend build

---

## 2. Current State

### Backend (`/backend`)
- **Stack:** Express + NestJS hybrid (NestJS at `/api/v2`, Express legacy routes at `/api`)
- **Database:** Prisma schema defined, client generated, migration SQL ready
- **Auth:** Supabase Auth + JWT, no public signup, teacher creation with domain validation
- **Modules:** Auth, Marks, Timetable, Conflicts, Sync, Imports, SMS fully implemented
- **Guards:** `AuthGuard` (Bearer token → Prisma user lookup), `RolesGuard` (RBAC)

### Frontend (`/frontend`)
- **Stack:** React 19 + TypeScript + Vite + Tailwind + Radix UI
- **Auth:** Updated to use `/v2/auth/*` endpoints
- **Pages:** Teachers page fully integrated; other pages still using local `useSchool` state

### Pending Integration
- Students, Classes, Subjects, Exams pages still rely on local state
- Parent management UI not yet implemented
- Marks/Timetable pages need full backend integration (controllers exist, frontend not yet wired)

---

## 3. Remaining Work (Next Steps)

### Immediate (Next Session)
1. **Students page backend integration**
   - Create `StudentsModule` with CRUD endpoints
   - Update frontend `Students.tsx` to fetch from `/v2/students`
   - Add CSV import support

2. **Classes/Streams/Subjects backend integration**
   - Create `ClassesModule`, `SubjectsModule` with CRUD
   - Update frontend pages to fetch from `/v2/classes`, `/v2/subjects`

3. **Exams backend integration**
   - Create `ExamsModule` with CRUD and status workflow
   - Update frontend `Exams.tsx` to fetch from `/v2/exams`

4. **Parent management UI and API**
   - Create `ParentsModule` with CRUD
   - Implement parent-student relationship endpoints
   - Build parent management UI in frontend

### Short-term
5. **Marks entry page full integration**
   - Wire `MarkEntry.tsx` to `/v2/marks` endpoints
   - Add real-time validation and error states

6. **Timetable page full integration**
   - Wire `TimeTable.tsx` to `/v2/timetable` endpoints
   - Add conflict detection on backend

7. **Audit logging**
   - Implement `AuditModule` with decorators for sensitive actions
   - Log teacher CRUD, role changes, mark writes, timetable edits

8. **Rate limiting and security hardening**
   - Add `@nestjs/throttler`
   - Input sanitization
   - Ensure no secrets in frontend env

### Medium-term
9. **Email module**
   - Create `EmailProvider` interface
   - Implement SMTP/Resend provider
   - Add email sending for activation links, password resets

10. **SMS templates and bulk sending**
    - Add `NotificationTemplate` model and endpoints
    - Implement result SMS sending for parents
    - Add retry logic for failed SMS

11. **Testing**
    - Unit tests for services (especially authorization boundaries)
    - Integration tests for critical flows:
      - Teacher cannot edit another teacher
      - Teacher cannot access another class's marks
      - School A cannot access School B data
      - Principal can manage teachers
      - CSV import validation
    - E2E tests for auth bootstrap and mark entry

12. **Production deployment**
    - Update `docs/deployment/` with Vercel + Truehost/VPS + Supabase steps
    - Configure DNS: `academic-compass.co.ke` → Vercel, `api.academic-compass.co.ke` → backend host
    - Configure SSL on both domains
    - Verify production HTTPS, CORS, rate limiting

---

## 4. Key Decisions

| Decision | Rationale |
|---|---|
| **Monorepo layout** | Keeps frontend, backend, shared libs, docs, and Supabase migrations in one repo |
| **NestJS + Express hybrid** | Allows incremental migration without breaking existing Express routes |
| **Prisma ORM** | Type-safe database access, migrations, and PostgreSQL support via Supabase |
| **Supabase Auth** | Retained for identity; removed public signup; teachers admin-created |
| **Safravo SMS** | Chosen as SMS provider with sender ID |
| **No public signup** | Teachers must be admin-created with configurable email domains |
| **School-level isolation** | `school_id` derived from authenticated user JWT; frontend-supplied values ignored for data access |
| **Role enum** | `PLATFORM_ADMIN`, `PRINCIPAL`, `SENIOR_TEACHER`, `TEACHER`, `PARENT`, `STUDENT` |

---

## 5. Environment Variables Required

```env
# Server
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:5173

# Session / JWT
SESSION_SECRET=replace-me-with-a-long-random-string

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Database (Prisma)
DATABASE_URL=postgres://postgres:[YOUR-PASSWORD]@db.xxx.supabase.co:5432/postgres?sslmode=require&connect_timeout=30

# SMS (Safravo)
SMS_PROVIDER=safravo
SMS_API_KEY=your-safravo-api-key
SMS_SENDER_ID=ACCompass
SMS_PROVIDER_URL=https://api.safravo.com/v1

# Email (Resend recommended)
EMAIL_PROVIDER=resend
EMAIL_API_KEY=your-email-api-key
EMAIL_FROM=noreply@academic-compass.co.ke

# Domain
APP_DOMAIN=academic-compass.co.ke
API_DOMAIN=api.academic-compass.co.ke

# Teacher email domains (comma-separated)
TEACHER_EMAIL_DOMAINS=school.ac.ke,teacher.ac.ke
```

---

## 6. Commits So Far

| Commit | Description |
|---|---|
| `3090f79` | Restructure into monorepo: frontend/, backend/, supabase/, docs/ |
| `547f9ec` | Add Prisma schema, NestJS scaffolding, core modules |
| `8acebcf` | Implement NestJS auth module with Supabase integration |
| `c901843` | Migrate Express routes to NestJS controllers, update frontend API client |
| `b14020b` | Frontend integration: remove signup, expand auth controller, update pages |

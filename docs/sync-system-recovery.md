# Sync System Recovery Reference

**Status:** Archived reference for a future redesign
**Last verified:** 2026-09-02
**Repository:** `final_academic_compass`

This document records the sync system that existed before its removal or replacement. It is a recovery reference, not a recommendation to restore the old implementation unchanged.

## 1. System Summary

The former system combined four responsibilities:

- A backend full-school snapshot endpoint that read and merged most school records.
- Frontend browser snapshots stored in `localStorage`.
- Per-resource mark and timetable batch endpoints with version/device fields.
- A conflict-review workflow backed by `sync_conflicts`.

The frontend treated local state as authoritative for reads. The backend snapshot merge was intended to make changes available across devices, but the frontend's current `syncNow` and `saveDetails` paths primarily save to browser storage. This created two competing sources of truth.

## 2. Backend Recovery Map

### Sync module

Location: `backend/src/modules/sync/`

- `sync.module.ts` registers `SyncController` and `SyncService`.
- `sync.controller.ts` exposes authenticated routes under `/v2/sync`.
- `sync.service.ts` implements snapshot reads, snapshot merges, entity deletion, and student imports.

### Routes

| Method | Route | Behavior |
| --- | --- | --- |
| `GET` | `/v2/sync` | Returns a school snapshot for the authenticated user's school. |
| `POST` | `/v2/sync` | Merges a submitted snapshot into school records. |
| `DELETE` | `/v2/sync/entity/:entity/:id` | Deletes a class, stream, or student. |
| `POST` | `/v2/sync/students` | Validates and bulk-creates imported students. |

All routes use the NestJS `AuthGuard`; the school scope comes from `req.user.schoolId`.

### Snapshot contents

The snapshot contains these collections and objects:

- `classes`
- `streams`
- `subjects`
- `students`
- `teachers`
- `exams`
- `sheets` (mark sheets)
- `entries` (mark entries)
- `timetable`
- `curricula`
- `settings`
- `classRemarks`
- `principalRemarks`
- `deletedIds`

The service maps database names to frontend names. For example, `fullName` becomes `name`, and `teacherComment` becomes `comment` on the mark sheet representation.

### Merge behavior

`mergeSnapshot` currently:

1. Reads the current database snapshot.
2. Combines remote and incoming arrays by `id`.
3. Chooses the item with the later `updatedAt` value.
4. Removes items listed in either side's `deletedIds`.
5. Deduplicates students by the student identity helper.
6. Upserts classes, streams, subjects, students, terms, exams, mark sheets, mark entries, timetable slots, and school settings in one transaction.
7. Updates the school name and motto when supplied by settings.

This is a broad write operation. A malformed or stale snapshot can affect unrelated resources in the same transaction. Any future implementation must keep resource-level authorization and validation at the endpoint boundary.

## 3. Frontend Recovery Map

### Client service

Location: `frontend/src/lib/syncService.ts`

Functions that belonged to the old design:

- `fetchSchoolSnapshot`
- `pushSchoolSnapshot`
- `fetchPendingConflicts`
- `resolveRemoteConflict`
- `pushMarkEntries` and `pushMarkEntry`
- `fetchAllMarkEntries`
- `fetchAllTimetableSlots`
- `pushTimetableSlots` and `pushTimetableSlot`
- `deleteTimetableSlot`

The client translates some server snake_case fields to the frontend camelCase representation and silently converts several request failures into empty arrays or `error` statuses.

### School store

Location: `frontend/src/store/school.tsx`

The old store included:

- `lastSyncAt`
- `syncQueue`
- `deviceName`
- `deletedIds`
- `syncNow`
- browser snapshot hydration and refresh
- online/offline event listeners
- periodic refresh every five seconds
- pending conflict refresh

Browser snapshots used keys in the form:

```text
ac_school_snapshot_<userId>
```

The data-management page also contains a legacy key using `state.deviceName`; this inconsistency must be considered during recovery or cleanup.

### User-facing references

Known UI references include:

- `frontend/src/components/AppShell.tsx`: connection status and sync wording.
- `frontend/src/pages/Classes.tsx`: sync entity deletion and student import routes.
- `frontend/src/pages/Conflicts.tsx`: conflict list and resolution interface.
- `frontend/src/pages/Dashboard.tsx`: pending sync conflict count.
- `frontend/src/pages/DataManagement.tsx`: local save and full snapshot language.
- `frontend/src/pages/MarkEntry.tsx`: automatic sync calls and pending queue state.
- `frontend/src/pages/Marks.tsx`: pending sync badge.
- `frontend/src/pages/Students.tsx`: sync entity deletion.
- `frontend/src/pages/TimeTable.tsx`: syncing and pending-sync wording.
- `frontend/src/lib/schoolData.ts`: `SyncConflict` type.

## 4. Database Recovery Map

### Prisma

The Prisma model is `SyncConflict` in `backend/prisma/schema.prisma`, mapped to `sync_conflicts`.

Fields:

- `id`
- `schoolId`
- `entity`
- `entityId`
- `field`
- `serverValue`
- `incomingValue`
- `incomingBy`
- `incomingDevice`
- `status`
- `resolution`
- `customValue`
- `createdAt`
- `resolvedAt`

The initial Prisma migration creates the table and a unique index over `(entity, entityId, field, status)`. The school foreign key cascades on school deletion.

### Conflict API

Location: `backend/src/modules/conflicts/`

- `GET /v2/conflicts?status=pending`
- `PATCH /v2/conflicts/:id`

`ConflictsService` reads and resolves records but does not itself apply a selected value back to the affected business record. A future conflict workflow must make the resolution transaction explicit.

### Other schema references

Before deleting the old system, inspect and reconcile all of these independently because some belong to earlier database generations:

- `backend/db-schema.sql`: `ac_sync_conflicts`
- `backend/DB.md`: sync conflict table and index notes
- `backend/prisma/migrations/0_init/migration.sql`: `sync_conflicts`
- `supabase/migrations/20260731000001_academic_compass_schema.sql`: `public.sync_conflicts` and policies
- `supabase/migrations/20260807000000_initial_schema.sql`: additional `sync_conflicts` definitions
- `lib/db/src/schema/academic-compass.ts`: `ac_sync_conflicts`
- `backend/scripts/seed.mjs`: legacy table cleanup list

Do not edit already-applied migration files in place. Use a new migration for any production table removal or data conversion.

## 5. Recovery Procedure

Use this procedure only when a future update explicitly needs the archived behavior or when recovering data from an old deployment.

1. Restore the backend sync module and register `SyncModule` in `backend/src/modules/app.module.ts`.
2. Restore the frontend sync client and the store imports it requires.
3. Restore the Prisma `SyncConflict` model and generate the Prisma client.
4. Confirm the deployed database still contains the expected `sync_conflicts` table and constraints.
5. Confirm the authenticated route prefix is `/api/v2` in the current deployment configuration.
6. Run backend typecheck and build.
7. Run frontend typecheck and build.
8. Test snapshot retrieval with a read-only school account.
9. Test a disposable student or timetable record before testing a merge.
10. Verify school isolation by attempting requests with users from different schools.
11. Take a database backup before any write test.

Never restore the old snapshot merge directly against production without validating payload schemas, authorization, transaction behavior, and backup recovery.

## 6. Replacement Guardrails

The recommended replacement is server-authoritative CRUD with TanStack Query caching:

- Each domain module owns its own read and mutation endpoints.
- The database is the source of truth; browser storage is limited to non-authoritative cache or drafts.
- Mutations validate ownership, relationships, and permissions at the backend boundary.
- Query invalidation or targeted refetch replaces whole-school snapshot merging.
- Optimistic updates are limited to small, reversible interactions and must roll back on failure.
- Backup import/export remains a separate, explicitly authorized administrative workflow.
- Audit logs record important changes; they do not replace transactional writes.
- Conflict records are only introduced if a real concurrent-edit requirement remains after server-authoritative CRUD is implemented.

A future sync or collaboration feature should be introduced as a separate versioned protocol, with a documented payload schema and migration plan. It should not reuse `/v2/sync` as an unversioned catch-all endpoint.

## 7. Removal Checklist

When the replacement is implemented, verify that the following have either been removed or deliberately retained with a documented reason:

- `SyncModule`, `SyncController`, and `SyncService`
- `frontend/src/lib/syncService.ts`
- `syncNow`, `syncQueue`, `lastSyncAt`, `deviceName`, and `deletedIds` store behavior
- snapshot `localStorage` keys and refresh timers
- sync/conflict wording in user-facing pages
- sync routes in `lib/api-spec/openapi.yaml`
- `SyncConflict` and conflict API, if no replacement workflow needs them
- Prisma and SQL references to `sync_conflicts`
- legacy `ac_sync_conflicts` schema references and seed cleanup entries
- stale sync documentation in `README.md`, `current.md`, and `docs/replit.md`

After removal, search the repository for `sync`, `SyncConflict`, `sync_conflicts`, `ac_sync_conflicts`, `ac_school_snapshot_`, and `/v2/sync`. Review matches manually because generic words such as `async` and `existsSync` are unrelated.

## 8. Validation Scenarios

A replacement is ready for rollout when these scenarios pass:

- Two browser sessions see a saved student update after query invalidation or refetch.
- A failed mutation leaves the previous visible value intact and reports the error.
- A user cannot read or mutate another school's records.
- A stale browser cache cannot overwrite records changed by another user.
- Mark entry and timetable mutations preserve their existing relationship constraints.
- Backup export and restore are explicit actions and do not run as a side effect of ordinary navigation.
- Database migrations can be applied to a copy of the production schema and rolled back through the documented recovery plan.

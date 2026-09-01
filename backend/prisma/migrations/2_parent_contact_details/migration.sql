-- Add parent contact metadata and relationship tracking
ALTER TABLE "parents"
  ADD COLUMN "schoolId" TEXT,
  ADD COLUMN "fullName" TEXT,
  ADD COLUMN "email" TEXT,
  ADD COLUMN "relationship" TEXT DEFAULT 'Parent',
  ADD COLUMN "phoneNumbers" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

UPDATE "parents" p
SET "schoolId" = u."schoolId"
FROM "users" u
WHERE p."userId" = u."id"
  AND p."schoolId" IS NULL;

ALTER TABLE "parents"
  ALTER COLUMN "schoolId" SET NOT NULL,
  ALTER COLUMN "userId" DROP NOT NULL;

ALTER TABLE "student_parents"
  ADD COLUMN "relationship" TEXT,
  ADD COLUMN "isPrimary" BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS "student_parents_studentId_parentId_key"
  ON "student_parents" ("studentId", "parentId");

CREATE INDEX IF NOT EXISTS "parents_schoolId_idx"
  ON "parents" ("schoolId");

CREATE INDEX IF NOT EXISTS "parents_fullName_idx"
  ON "parents" (lower("fullName"));

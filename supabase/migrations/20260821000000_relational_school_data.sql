-- Store sidebar data in its owning relational tables.
ALTER TABLE "school_settings"
  ADD COLUMN IF NOT EXISTS "schoolName" TEXT,
  ADD COLUMN IF NOT EXISTS "schoolTag" TEXT,
  ADD COLUMN IF NOT EXISTS "schoolAddress" TEXT,
  ADD COLUMN IF NOT EXISTS "schoolEmail" TEXT,
  ADD COLUMN IF NOT EXISTS "schoolWebsite" TEXT,
  ADD COLUMN IF NOT EXISTS "schoolMotto" TEXT,
  ADD COLUMN IF NOT EXISTS "schoolVision" TEXT,
  ADD COLUMN IF NOT EXISTS "schoolMission" TEXT,
  ADD COLUMN IF NOT EXISTS "principalName" TEXT,
  ADD COLUMN IF NOT EXISTS "principalTitle" TEXT,
  ADD COLUMN IF NOT EXISTS "academicYear" INTEGER,
  ADD COLUMN IF NOT EXISTS "curricula" JSONB;

ALTER TABLE "classes"
  ADD COLUMN IF NOT EXISTS "curriculumId" TEXT NOT NULL DEFAULT 'cbc';

ALTER TABLE "subjects"
  ADD COLUMN IF NOT EXISTS "curriculumId" TEXT NOT NULL DEFAULT 'cbc';

ALTER TABLE "exams"
  ADD COLUMN IF NOT EXISTS "curriculumId" TEXT NOT NULL DEFAULT 'cbc';

ALTER TABLE "mark_sheets"
  ADD COLUMN IF NOT EXISTS "curriculumId" TEXT NOT NULL DEFAULT 'cbc';

UPDATE "school_settings"
SET "curricula" = '[
  {"id":"cbc","name":"CBC","shortName":"CBC","description":"Competency-Based Curriculum"},
  {"id":"844","name":"844","shortName":"844","description":"8-4-4 System"}
]'::jsonb
WHERE "curricula" IS NULL;
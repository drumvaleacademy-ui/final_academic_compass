-- Student identity is the school-scoped admission number, never the name.
WITH ranked AS (
  SELECT id, "schoolId", "admissionNo",
         first_value(id) OVER (
           PARTITION BY "schoolId", lower(regexp_replace(trim("admissionNo"), '\\s+', ' ', 'g'))
           ORDER BY "createdAt", id
         ) AS keeper,
         row_number() OVER (
           PARTITION BY "schoolId", lower(regexp_replace(trim("admissionNo"), '\\s+', ' ', 'g'))
           ORDER BY "createdAt", id
         ) AS row_number
  FROM "students"
  WHERE trim("admissionNo") <> ''
), duplicates AS (
  SELECT id, keeper FROM ranked WHERE row_number > 1
)
DELETE FROM "mark_entries" AS marks
USING duplicates
WHERE marks."studentId" = duplicates.id
  AND EXISTS (
    SELECT 1 FROM "mark_entries" AS keeper_marks
    WHERE keeper_marks."studentId" = duplicates.keeper
      AND keeper_marks."sheetId" = marks."sheetId"
  );

WITH ranked AS (
  SELECT id, "schoolId", "admissionNo",
         first_value(id) OVER (
           PARTITION BY "schoolId", lower(regexp_replace(trim("admissionNo"), '\\s+', ' ', 'g'))
           ORDER BY "createdAt", id
         ) AS keeper,
         row_number() OVER (
           PARTITION BY "schoolId", lower(regexp_replace(trim("admissionNo"), '\\s+', ' ', 'g'))
           ORDER BY "createdAt", id
         ) AS row_number
  FROM "students"
  WHERE trim("admissionNo") <> ''
), duplicates AS (
  SELECT id, keeper FROM ranked WHERE row_number > 1
)
UPDATE "mark_entries" AS marks
SET "studentId" = duplicates.keeper
FROM duplicates
WHERE marks."studentId" = duplicates.id;

WITH ranked AS (
  SELECT id,
         first_value(id) OVER (
           PARTITION BY "schoolId", lower(regexp_replace(trim("admissionNo"), '\\s+', ' ', 'g'))
           ORDER BY "createdAt", id
         ) AS keeper,
         row_number() OVER (
           PARTITION BY "schoolId", lower(regexp_replace(trim("admissionNo"), '\\s+', ' ', 'g'))
           ORDER BY "createdAt", id
         ) AS row_number
  FROM "students"
  WHERE trim("admissionNo") <> ''
)
DELETE FROM "students"
WHERE id IN (SELECT id FROM ranked WHERE row_number > 1);

CREATE UNIQUE INDEX IF NOT EXISTS "students_school_admission_identity_key"
ON "students" ("schoolId", lower(regexp_replace(trim("admissionNo"), '\\s+', ' ', 'g')))
WHERE trim("admissionNo") <> '';
-- Academic Compass initial schema
-- Run via Supabase SQL editor or migration tool

CREATE TYPE "Role" AS ENUM (
  'PLATFORM_ADMIN',
  'PRINCIPAL',
  'SENIOR_TEACHER',
  'TEACHER',
  'PARENT',
  'STUDENT'
);

CREATE TABLE "schools" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "motto" TEXT,
  "logoUrl" TEXT,
  "emailDomains" TEXT[],
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now(),

  CONSTRAINT "schools_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "schools_code_key" UNIQUE ("code")
);

CREATE TABLE "users" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "email" TEXT NOT NULL,
  "fullName" TEXT NOT NULL,
  "passwordHash" TEXT,
  "phoneNumber" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "activatedAt" TIMESTAMP(3),
  "lastLoginAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "schoolId" TEXT NOT NULL,

  CONSTRAINT "users_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "users_email_key" UNIQUE ("email"),
  CONSTRAINT "users_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE
);

CREATE TABLE "user_roles" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "userId" TEXT NOT NULL,
  "role" "Role" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),

  CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "user_roles_userId_key" UNIQUE ("userId", "role"),
  CONSTRAINT "user_roles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE TABLE "refresh_tokens" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "userId" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),

  CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "refresh_tokens_token_key" UNIQUE ("token"),
  CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE TABLE "school_settings" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "schoolId" TEXT NOT NULL,
  "currentTermId" TEXT,
  "gradingScale" JSONB,
  "smsProvider" TEXT,
  "smsSenderId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now(),

  CONSTRAINT "school_settings_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "school_settings_schoolId_key" UNIQUE ("schoolId"),
  CONSTRAINT "school_settings_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE
);

CREATE TABLE "classes" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "schoolId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "level" INTEGER NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now(),

  CONSTRAINT "classes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "classes_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE
);

CREATE TABLE "streams" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "classId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),

  CONSTRAINT "streams_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "streams_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE CASCADE
);

CREATE TABLE "subjects" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "schoolId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "isCore" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now(),

  CONSTRAINT "subjects_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "subjects_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE
);

CREATE TABLE "teacher_subject_assignments" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "userId" TEXT NOT NULL,
  "subjectId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),

  CONSTRAINT "teacher_subject_assignments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "teacher_subject_assignments_userId_subjectId_key" UNIQUE ("userId", "subjectId"),
  CONSTRAINT "teacher_subject_assignments_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE CASCADE
);

CREATE TABLE "teacher_class_assignments" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "userId" TEXT NOT NULL,
  "classId" TEXT NOT NULL,
  "isClassTeacher" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),

  CONSTRAINT "teacher_class_assignments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "teacher_class_assignments_userId_classId_key" UNIQUE ("userId", "classId"),
  CONSTRAINT "teacher_class_assignments_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE CASCADE
);

CREATE TABLE "parents" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "userId" TEXT NOT NULL,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),

  CONSTRAINT "parents_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "parents_userId_key" UNIQUE ("userId")
);

CREATE TABLE "student_parents" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "studentId" TEXT NOT NULL,
  "parentId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),

  CONSTRAINT "student_parents_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "student_parents_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "parents"("id") ON DELETE CASCADE
);

CREATE TABLE "students" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "schoolId" TEXT NOT NULL,
  "admissionNo" TEXT NOT NULL,
  "fullName" TEXT NOT NULL,
  "gender" TEXT NOT NULL,
  "dateOfBirth" TIMESTAMP(3),
  "classId" TEXT NOT NULL,
  "streamId" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now(),

  CONSTRAINT "students_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "students_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE,
  CONSTRAINT "students_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE RESTRICT,
  CONSTRAINT "students_streamId_fkey" FOREIGN KEY ("streamId") REFERENCES "streams"("id") ON DELETE RESTRICT
);

CREATE TABLE "terms" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "schoolId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3) NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),

  CONSTRAINT "terms_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "exams" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "schoolId" TEXT NOT NULL,
  "classId" TEXT NOT NULL,
  "termId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "year" INTEGER NOT NULL,
  "outOf" INTEGER NOT NULL DEFAULT 100,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now()
);

CREATE TABLE "mark_sheets" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "examId" TEXT NOT NULL,
  "classId" TEXT NOT NULL,
  "streamId" TEXT NOT NULL,
  "subjectId" TEXT NOT NULL,
  "teacherId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "locked" BOOLEAN NOT NULL DEFAULT false,
  "comment" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now(),

  CONSTRAINT "mark_sheets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "mark_entries" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "sheetId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "score" INTEGER,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedBy" TEXT NOT NULL,

  CONSTRAINT "mark_entries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "timetable_slots" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "schoolId" TEXT NOT NULL,
  "classId" TEXT NOT NULL,
  "streamId" TEXT,
  "dayOfWeek" INTEGER NOT NULL,
  "period" INTEGER NOT NULL,
  "startTime" TEXT NOT NULL,
  "endTime" TEXT NOT NULL,
  "subjectId" TEXT,
  "teacherId" TEXT,
  "room" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now()
);

CREATE TABLE "sync_conflicts" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "entity" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "field" TEXT NOT NULL,
  "serverValue" TEXT,
  "incomingValue" TEXT,
  "incomingBy" TEXT,
  "incomingDevice" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "resolution" TEXT,
  "customValue" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "resolvedAt" TIMESTAMP(3)
);

CREATE TABLE "audit_logs" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "schoolId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "entity" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "oldValue" JSONB,
  "newValue" JSONB,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now()
);

CREATE TABLE "sms_logs" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "schoolId" TEXT NOT NULL,
  "recipient" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "providerId" TEXT,
  "error" TEXT,
  "sentAt" TIMESTAMP(3) NOT NULL DEFAULT now()
);

CREATE TABLE "activation_tokens" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "userId" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),

  CONSTRAINT "activation_tokens_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "activation_tokens_userId_key" UNIQUE ("userId"),
  CONSTRAINT "activation_tokens_token_key" UNIQUE ("token")
);

CREATE TABLE "csv_imports" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "schoolId" TEXT NOT NULL,
  "entity" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "importedBy" TEXT NOT NULL,
  "successCount" INTEGER NOT NULL,
  "failureCount" INTEGER NOT NULL,
  "errors" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX "users_schoolId_idx" ON "users"("schoolId");
CREATE INDEX "users_email_idx" ON "users"("email");
CREATE INDEX "user_roles_userId_idx" ON "user_roles"("userId");
CREATE INDEX "refresh_tokens_token_idx" ON "refresh_tokens"("token");
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");
CREATE INDEX "classes_schoolId_idx" ON "classes"("schoolId");
CREATE INDEX "streams_classId_idx" ON "streams"("classId");
CREATE INDEX "subjects_schoolId_idx" ON "subjects"("schoolId");
CREATE INDEX "students_schoolId_idx" ON "students"("schoolId");
CREATE INDEX "students_classId_idx" ON "students"("classId");
CREATE INDEX "students_streamId_idx" ON "students"("streamId");
CREATE INDEX "students_admissionNo_idx" ON "students"("admissionNo");
CREATE INDEX "exams_schoolId_idx" ON "exams"("schoolId");
CREATE INDEX "exams_classId_idx" ON "exams"("classId");
CREATE INDEX "mark_sheets_examId_idx" ON "mark_sheets"("examId");
CREATE INDEX "mark_sheets_teacherId_idx" ON "mark_sheets"("teacherId");
CREATE INDEX "mark_entries_sheetId_idx" ON "mark_entries"("sheetId");
CREATE INDEX "mark_entries_studentId_idx" ON "mark_entries"("studentId");
CREATE INDEX "timetable_slots_schoolId_idx" ON "timetable_slots"("schoolId");
CREATE INDEX "timetable_slots_classId_idx" ON "timetable_slots"("classId");
CREATE INDEX "timetable_slots_teacherId_idx" ON "timetable_slots"("teacherId");
CREATE TABLE "activation_tokens" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "userId" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),

  CONSTRAINT "activation_tokens_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "activation_tokens_userId_key" UNIQUE ("userId"),
  CONSTRAINT "activation_tokens_token_key" UNIQUE ("token")
);

CREATE TABLE "csv_imports" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "schoolId" TEXT NOT NULL,
  "entity" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "importedBy" TEXT NOT NULL,
  "successCount" INTEGER NOT NULL,
  "failureCount" INTEGER NOT NULL,
  "errors" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now()
);

CREATE TABLE "sync_conflicts" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "entity" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "field" TEXT NOT NULL,
  "serverValue" TEXT,
  "incomingValue" TEXT,
  "incomingBy" TEXT,
  "incomingDevice" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "resolution" TEXT,
  "customValue" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "resolvedAt" TIMESTAMP(3)
);

-- Indexes for performance
CREATE INDEX "users_schoolId_idx" ON "users"("schoolId");
CREATE INDEX "users_email_idx" ON "users"("email");
CREATE INDEX "user_roles_userId_idx" ON "user_roles"("userId");
CREATE INDEX "refresh_tokens_token_idx" ON "refresh_tokens"("token");
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");
CREATE INDEX "classes_schoolId_idx" ON "classes"("schoolId");
CREATE INDEX "streams_classId_idx" ON "streams"("classId");
CREATE INDEX "subjects_schoolId_idx" ON "subjects"("schoolId");
CREATE INDEX "students_schoolId_idx" ON "students"("schoolId");
CREATE INDEX "students_classId_idx" ON "students"("classId");
CREATE INDEX "students_streamId_idx" ON "students"("streamId");
CREATE INDEX "students_admissionNo_idx" ON "students"("admissionNo");
CREATE INDEX "exams_schoolId_idx" ON "exams"("schoolId");
CREATE INDEX "exams_classId_idx" ON "exams"("classId");
CREATE INDEX "mark_sheets_examId_idx" ON "mark_sheets"("examId");
CREATE INDEX "mark_sheets_teacherId_idx" ON "mark_sheets"("teacherId");
CREATE INDEX "mark_entries_sheetId_idx" ON "mark_entries"("sheetId");
CREATE INDEX "mark_entries_studentId_idx" ON "mark_entries"("studentId");
CREATE INDEX "timetable_slots_schoolId_idx" ON "timetable_slots"("schoolId");
CREATE INDEX "timetable_slots_classId_idx" ON "timetable_slots"("classId");
CREATE INDEX "timetable_slots_teacherId_idx" ON "timetable_slots"("teacherId");
CREATE INDEX "audit_logs_schoolId_idx" ON "audit_logs"("schoolId");
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");
CREATE INDEX "audit_logs_entity_idx" ON "audit_logs"("entity", "entityId");
CREATE INDEX "sms_logs_schoolId_idx" ON "sms_logs"("schoolId");
CREATE INDEX "activation_tokens_token_idx" ON "activation_tokens"("token");
CREATE INDEX "csv_imports_schoolId_idx" ON "csv_imports"("schoolId");
CREATE INDEX "sync_conflicts_entity_idx" ON "sync_conflicts"("entity", "entityId", "status");

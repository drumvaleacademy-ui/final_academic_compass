-- CreateTable
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

    CONSTRAINT "schools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "userId" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "school_settings" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "schoolId" TEXT NOT NULL,
    "currentTermId" TEXT,
    "gradingScale" JSONB,
    "smsProvider" TEXT,
    "smsSenderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now(),

    CONSTRAINT "school_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "classes" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now(),

    CONSTRAINT "classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "streams" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "classId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),

    CONSTRAINT "streams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subjects" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "isCore" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now(),

    CONSTRAINT "subjects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teacher_subject_assignments" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "userId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),

    CONSTRAINT "teacher_subject_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teacher_class_assignments" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "userId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "isClassTeacher" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),

    CONSTRAINT "teacher_class_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parents" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "userId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),

    CONSTRAINT "parents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_parents" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "studentId" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),

    CONSTRAINT "student_parents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

    CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
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
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now(),

    CONSTRAINT "exams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
CREATE TABLE "mark_entries" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "sheetId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "score" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
    "updatedBy" TEXT NOT NULL,

    CONSTRAINT "mark_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now(),

    CONSTRAINT "timetable_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_conflicts" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "schoolId" TEXT NOT NULL,
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
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "sync_conflicts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sync_conflicts_entity_entityId_field_status_key" ON "sync_conflicts"("entity", "entityId", "field", "status");

-- CreateTable
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sms_logs" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "schoolId" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "providerId" TEXT,
    "error" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT now(),

    CONSTRAINT "sms_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activation_tokens" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),

    CONSTRAINT "activation_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "csv_imports" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "schoolId" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "importedBy" TEXT NOT NULL,
    "successCount" INTEGER NOT NULL,
    "failureCount" INTEGER NOT NULL,
    "errors" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),

    CONSTRAINT "csv_imports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "school_settings_schoolId_key" ON "school_settings"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "teacher_subject_assignments_userId_subjectId_key" ON "teacher_subject_assignments"("userId", "subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "teacher_class_assignments_userId_classId_key" ON "teacher_class_assignments"("userId", "classId");

-- CreateIndex
CREATE UNIQUE INDEX "parents_userId_key" ON "parents"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "activation_tokens_userId_key" ON "activation_tokens"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "activation_tokens_token_key" ON "activation_tokens"("token");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_settings" ADD CONSTRAINT "school_settings_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classes" ADD CONSTRAINT "classes_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "streams" ADD CONSTRAINT "streams_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_subject_assignments" ADD CONSTRAINT "teacher_subject_assignments_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_class_assignments" ADD CONSTRAINT "teacher_class_assignments_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parents" ADD CONSTRAINT "parents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_parents" ADD CONSTRAINT "student_parents_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_parents" ADD CONSTRAINT "student_parents_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "parents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_streamId_fkey" FOREIGN KEY ("streamId") REFERENCES "streams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "terms" ADD CONSTRAINT "terms_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exams" ADD CONSTRAINT "exams_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exams" ADD CONSTRAINT "exams_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exams" ADD CONSTRAINT "exams_termId_fkey" FOREIGN KEY ("termId") REFERENCES "terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mark_sheets" ADD CONSTRAINT "mark_sheets_examId_fkey" FOREIGN KEY ("examId") REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mark_sheets" ADD CONSTRAINT "mark_sheets_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mark_sheets" ADD CONSTRAINT "mark_sheets_streamId_fkey" FOREIGN KEY ("streamId") REFERENCES "streams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mark_sheets" ADD CONSTRAINT "mark_sheets_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mark_entries" ADD CONSTRAINT "mark_entries_sheetId_fkey" FOREIGN KEY ("sheetId") REFERENCES "mark_sheets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mark_entries" ADD CONSTRAINT "mark_entries_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timetable_slots" ADD CONSTRAINT "timetable_slots_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timetable_slots" ADD CONSTRAINT "timetable_slots_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timetable_slots" ADD CONSTRAINT "timetable_slots_streamId_fkey" FOREIGN KEY ("streamId") REFERENCES "streams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timetable_slots" ADD CONSTRAINT "timetable_slots_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sms_logs" ADD CONSTRAINT "sms_logs_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activation_tokens" ADD CONSTRAINT "activation_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "csv_imports" ADD CONSTRAINT "csv_imports_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sync_conflicts" ADD CONSTRAINT "sync_conflicts_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

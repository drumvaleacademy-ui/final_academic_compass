import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "./prisma.module";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { SchoolsModule } from "./schools/schools.module";
import { ClassesModule } from "./classes/classes.module";
import { StudentsModule } from "./students/students.module";
import { TeachersModule } from "./teachers/teachers.module";
import { ParentsModule } from "./parents/parents.module";
import { SubjectsModule } from "./subjects/subjects.module";
import { ExamsModule } from "./exams/exams.module";
import { MarksModule } from "./marks/marks.module";
import { TimetableModule } from "./timetable/timetable.module";
import { ReportsModule } from "./reports/reports.module";
import { SmsModule } from "./sms/sms.module";
import { EmailModule } from "./email/email.module";
import { AuditModule } from "./audit/audit.module";
import { ImportsModule } from "./imports/imports.module";
import { SchoolDataModule } from "./school-data/school-data.module";
import { HealthModule } from "./health/health.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    SchoolsModule,
    ClassesModule,
    StudentsModule,
    TeachersModule,
    ParentsModule,
    SubjectsModule,
    ExamsModule,
    MarksModule,
    TimetableModule,
    ReportsModule,
    SmsModule,
    EmailModule,
    AuditModule,
    ImportsModule,
    SchoolDataModule,
    HealthModule,
  ],
})
export class AppModule {}

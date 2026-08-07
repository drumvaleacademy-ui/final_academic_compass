PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS ac_profiles (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT,
  department TEXT,
  approved INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ac_user_roles (
  user_id TEXT NOT NULL REFERENCES ac_profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  PRIMARY KEY (user_id, role)
);

CREATE TABLE IF NOT EXISTS ac_mark_entries (
  id TEXT PRIMARY KEY,
  curriculum_id TEXT NOT NULL,
  sheet_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  score REAL,
  updated_by TEXT,
  device_name TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ac_timetable_slots (
  id TEXT PRIMARY KEY,
  curriculum_id TEXT NOT NULL,
  class_id TEXT NOT NULL,
  stream_id TEXT,
  day_of_week INTEGER NOT NULL,
  period INTEGER NOT NULL,
  start_time TEXT,
  end_time TEXT,
  subject_id TEXT,
  teacher_id TEXT,
  room TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  updated_by TEXT,
  device_name TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ac_sync_conflicts (
  id TEXT PRIMARY KEY,
  entity TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  field TEXT NOT NULL,
  server_value TEXT,
  incoming_value TEXT,
  incoming_by TEXT,
  incoming_device TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  resolution TEXT,
  custom_value TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at TEXT
);

CREATE TABLE IF NOT EXISTS ac_school_data (
  id TEXT PRIMARY KEY DEFAULT 'global',
  data TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_mark_entries_sheet_student ON ac_mark_entries(sheet_id, student_id);
CREATE INDEX IF NOT EXISTS idx_mark_entries_student ON ac_mark_entries(student_id);
CREATE INDEX IF NOT EXISTS idx_timetable_slots_class_stream ON ac_timetable_slots(class_id, stream_id, day_of_week, period);
CREATE INDEX IF NOT EXISTS idx_sync_conflicts_status ON ac_sync_conflicts(status);

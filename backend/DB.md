# Academic Compass - SQLite Database

## Schema

The canonical schema is in `db-schema.sql`. The application also creates tables automatically on startup via `lib/store.ts`, but `db-schema.sql` is the source of truth.

### Tables

- `ac_profiles` - user accounts
- `ac_user_roles` - user role assignments
- `ac_mark_entries` - mark/exam entries
- `ac_timetable_slots` - timetable slots
- `ac_school_data` - legacy local data table; server-authoritative application data uses PostgreSQL

### Indexes

- `idx_mark_entries_sheet_student` on `ac_mark_entries(sheet_id, student_id)`
- `idx_mark_entries_student` on `ac_mark_entries(student_id)`
- `idx_timetable_slots_class_stream` on `ac_timetable_slots(class_id, stream_id, day_of_week, period)`

## Seed / Import

To import data from a JSON dump:

```bash
cd artifacts/api-server
node scripts/seed.mjs path/to/seed.json
```

If no arguments are provided, it defaults to `data/seed.json` and `data/academic-compass.sqlite`.

To export the current database to JSON:

```bash
cd artifacts/api-server
node -e "const { DatabaseSync } = require('node:sqlite'); const db = new DatabaseSync('./data/academic-compass.sqlite'); const tables = db.prepare(\"SELECT name FROM sqlite_master WHERE type='table'\").all().map(r => r.name); const dump = {}; for (const t of tables) { dump[t] = db.prepare('SELECT * FROM ' + t).all(); } require('fs').writeFileSync('./data/seed.json', JSON.stringify(dump, null, 2)); console.log('Exported');"
```

## Configuration

In `.env`:

```
DATABASE_URL=sqlite:./data/academic-compass.sqlite
SESSION_SECRET=your-secret-here
PORT=8080
CORS_ORIGINS=http://localhost:21550
```

The database file is stored in `artifacts/api-server/data/academic-compass.sqlite` by default.

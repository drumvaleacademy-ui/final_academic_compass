# Academic Compass

Academic Compass is a school management and academic performance tracking application built on Replit.

## Stack
- **Frontend**: React 19 + TypeScript + Vite + react-router-dom + TanStack Query + shadcn/ui + Recharts + Sonner
- **Backend**: Express API server with esbuild bundling
- **Database**: PostgreSQL via Drizzle ORM (with SQLite fallback for local development)
- **Auth**: JWT (jsonwebtoken) + bcryptjs
- **Sync**: Offline-first with conflict resolution

## Development
- Run frontend: `pnpm --filter @workspace/academic-compass run dev`
- Run API server: `pnpm --filter @workspace/api-server run dev`
- Install dependencies: `pnpm install`

## Key Features
- Offline-first mark entry and sync
- Timetable management
- Conflict resolution
- Report generation and printing
- Role-based access control (Principal, Senior Teacher, Teacher)

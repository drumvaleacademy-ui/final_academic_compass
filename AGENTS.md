# AGENTS.md

## Commands

### Frontend (frontend/)
- **Typecheck**: `npx tsc --noEmit`
- **Build**: `npx vite build`
- **Dev server**: `npx vite` (port 5173)

### Backend (backend/)
- **Typecheck**: `npx tsc -p tsconfig.json --noEmit`
- **Build**: `node ./build.mjs` (esbuild bundle → `dist/index.mjs`, `@nestjs/*` externalized)
- **Dev**: `node --enable-source-maps ./dist/index.mjs` (port 3001)
- **Prisma**: `npx prisma generate`, `npx prisma db push`

### Root (workspace)
- **Dev all**: `pnpm dev` (runs backend + frontend concurrently)
- **Install**: `pnpm install`

## Architecture

- **Backend**: NestJS on Express adapter, esbuild-bundled single file
- **Frontend**: Vite + React + React Router (not Next.js)
- **Database**: PostgreSQL via Prisma (compatible with Supabase)
- **Auth**: JWT tokens + bcrypt; Supabase optional for managed auth

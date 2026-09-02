ALTER TABLE public.students ADD COLUMN IF NOT EXISTS "guardianName" text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS "guardianPhone" text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS "guardianEmail" text;
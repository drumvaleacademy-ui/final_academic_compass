import "./loadEnv";
import { PrismaClient, Role } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const supabaseAdmin =
  process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    : null;

interface SeedAdminInput {
  email: string;
  fullName: string;
  password: string;
}

function parseSeedAdmins(): SeedAdminInput[] {
  const raw = process.env.SEED_ADMINS;
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((a) => ({
        email: String(a.email).trim().toLowerCase(),
        fullName: String(a.fullName).trim(),
        password: String(a.password).trim(),
      }));
    }
  } catch {
    const parts = raw
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean);
    return parts
      .map((p) => {
        const [email, fullName, password] = p.split(/[,|]/).map((x) => x.trim());
        return email && fullName && password
          ? { email: email.toLowerCase(), fullName, password }
          : null;
      })
      .filter(Boolean) as SeedAdminInput[];
  }
  return [];
}

async function seedPlatformAdmins() {
  const admins = parseSeedAdmins();
  if (admins.length === 0) {
    console.log("[seed] No SEED_ADMINS configured — skipping platform admin seeding");
    return;
  }

  let existing = await prisma.user.count({
    where: { roles: { some: { role: { in: [Role.PLATFORM_ADMIN] } } } },
  });

  if (existing > 0) {
    console.log(`[seed] ${existing} platform admin(s) already exist — skipping seeding`);
    return;
  }

  for (const input of admins) {
    const existingUser = await prisma.user.findUnique({ where: { email: input.email } });
    if (existingUser) {
      await prisma.userRole.upsert({
        where: { userId_role: { userId: existingUser.id, role: Role.PLATFORM_ADMIN } },
        update: {},
        create: { userId: existingUser.id, role: Role.PLATFORM_ADMIN },
      });
      console.log(`[seed] Assigned PLATFORM_ADMIN role to existing user: ${input.email}`);
      continue;
    }

    let userId: string;

    if (supabaseAdmin) {
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: input.email,
        password: input.password,
        email_confirm: true,
        user_metadata: { full_name: input.fullName },
      });

      if (authError || !authData.user) {
        console.error(`[seed] Failed to create Supabase user for ${input.email}:`, authError?.message);
        userId = input.email;
      } else {
        userId = authData.user.id;
      }
    } else {
      userId = input.email;
    }

    const passwordHash = await bcrypt.hash(input.password, 10);

    const school = await prisma.school.findFirst();
    if (!school) {
      console.error("[seed] No school found — run bootstrap first");
    }

    await prisma.user.upsert({
      where: { email: input.email },
      update: {
        fullName: input.fullName,
        passwordHash,
        isActive: true,
        activatedAt: new Date(),
        schoolId: school?.id ?? "",
        roles: {
          upsert: [
            {
              where: { userId_role: { userId, role: Role.PLATFORM_ADMIN } },
              update: {},
              create: { role: Role.PLATFORM_ADMIN },
            },
            {
              where: { userId_role: { userId, role: Role.PRINCIPAL } },
              update: {},
              create: { role: Role.PRINCIPAL },
            },
          ],
        },
      },
      create: {
        id: userId,
        email: input.email,
        fullName: input.fullName,
        passwordHash,
        isActive: true,
        activatedAt: new Date(),
        schoolId: school?.id ?? "",
        roles: {
          create: [
            { role: Role.PLATFORM_ADMIN },
            { role: Role.PRINCIPAL },
          ],
        },
      },
    });

    console.log(`[seed] Created platform admin: ${input.email} (${input.fullName})`);
  }
}

seedPlatformAdmins()
  .catch((err) => {
    console.error("[seed] Fatal error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

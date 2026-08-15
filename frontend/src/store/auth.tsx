import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export type AppRole = "PLATFORM_ADMIN" | "PRINCIPAL" | "SENIOR_TEACHER" | "TEACHER" | "PARENT" | "STUDENT" | "HOD";

export interface AuthUser {
  id: string;
  email: string;
  full_name?: string | null;
  department?: string | null;
  approved?: boolean;
}

interface Session {
  user: AuthUser;
  token: string;
}

interface AuthCtx {
  session: Session | null;
  user: AuthUser | null;
  roles: AppRole[];
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  hasRole: (...r: AppRole[]) => boolean;
  refreshRoles: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  isTeacher: boolean;
  isSeniorTeacher: boolean;
  isHod: boolean;
  isPrincipal: boolean;
  isPlatformAdmin: boolean;
  isApproved: boolean;
  isReadOnly: boolean;
  canManageStaff: boolean;
  canManageStudents: boolean;
  canEnterMarks: boolean;
  canEditTimetable: boolean;
}

const Ctx = createContext<AuthCtx | null>(null);

const TOKEN_KEY = "ac_token";
const USER_KEY  = "ac_user";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => {
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      const user  = JSON.parse(localStorage.getItem(USER_KEY) || "null");
      if (token && user) return { token, user };
    } catch (_e) {}
    return null;
  });
  const [roles, setRoles]     = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  const storeSession = (token: string, user: AuthUser) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    setSession({ token, user });
  };

  const updateStoredUser = (patch: Partial<AuthUser>) => {
    setSession((prev) => {
      if (!prev) return prev;
      const nextUser = { ...prev.user, ...patch };
      localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
      return { ...prev, user: nextUser };
    });
  };

  const clearSession = async () => {
    if (supabase) await supabase.auth.signOut();
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setSession(null);
    setRoles([]);
    try {
      // Redirect user to sign-in page after clearing session if not already there
      if (typeof window !== "undefined" && !window.location.pathname.startsWith("/auth")) {
        window.location.replace("/auth");
      }
    } catch (_e) {}
  };

  useEffect(() => {
    if (!session) { setLoading(false); return; }
    api.get<AppRole[]>("/v2/auth/roles")
      .then((updatedRoles) => setRoles(updatedRoles.length ? updatedRoles : (session.user as AuthUser & { roles?: AppRole[] }).roles ?? []))
      .catch(() => setRoles((session.user as AuthUser & { roles?: AppRole[] }).roles ?? []))
      .finally(() => setLoading(false));
  }, [session?.token]);

  // Listen for global unauthorized events emitted by the API client.
  useEffect(() => {
    const onUnauthorized = () => {
      // Clear client-side session and notify user
      clearSession();
      toast.error("Session expired. Please sign in again.", {
        action: {
          label: "Sign out",
          onClick: () => {
            clearSession();
          },
        },
      });
    };
    window.addEventListener("ac:unauthorized", onUnauthorized as EventListener);
    return () => window.removeEventListener("ac:unauthorized", onUnauthorized as EventListener);
  }, []);

  // Inactivity auto-logout
  useEffect(() => {
    const stored = Number(localStorage.getItem("ac_auto_logout_ms") ?? "0");
    const timeoutMs = stored && stored > 0 ? stored : Number(import.meta.env.VITE_AUTO_LOGOUT_MS ?? 30 * 60 * 1000); // default 30 minutes
    if (!timeoutMs || timeoutMs <= 0) return;

    let timer: ReturnType<typeof setTimeout> | null = null;

    const reset = () => {
      if (timer) clearTimeout(timer);
      if (!session) return;
      timer = setTimeout(() => {
        clearSession();
        toast.error("You were logged out due to inactivity.");
      }, timeoutMs);
    };

    const events = ["mousemove", "keydown", "mousedown", "touchstart", "click"];
    for (const e of events) window.addEventListener(e, reset);
    reset();
    return () => {
      if (timer) clearTimeout(timer);
      for (const e of events) window.removeEventListener(e, reset);
    };
  }, [session]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { token, user } = await api.post<{ token: string; user: AuthUser & { fullName?: string; roles?: AppRole[] } }>(
      "/v2/auth/signin", { email, password }
    );
    // Normalize camelCase backend response to snake_case AuthUser
    const normalizedUser: AuthUser = {
      ...user,
      full_name: user.full_name ?? user.fullName ?? null,
    };
    storeSession(token, normalizedUser);
    setRoles(user.roles ?? []);
  }, []);

  const signOut = useCallback(async () => {
    await clearSession();
  }, []);

  const hasRole = useCallback((...r: AppRole[]) => r.some(x => roles.includes(x)), [roles]);

  const refreshRoles = useCallback(async () => {
    if (!session) return;
    try {
      const updatedRoles = await api.get<AppRole[]>("/v2/auth/roles");
      setRoles(updatedRoles);
    } catch (_e) {}
  }, [session]);

  const refreshProfile = useCallback(async () => {
    if (!session) return;
    try {
      const me = await api.get<{ department: string | null; approved: boolean; full_name: string | null }>("/v2/auth/me");
      updateStoredUser({ department: me.department, approved: me.approved, full_name: me.full_name });
    } catch (_e) {}
  }, [session]);

  const isPrincipal = hasRole("PLATFORM_ADMIN", "PRINCIPAL");
  const isPlatformAdmin = hasRole("PLATFORM_ADMIN");
  const isTeacher = hasRole("TEACHER", "SENIOR_TEACHER");
  const isSeniorTeacher = hasRole("SENIOR_TEACHER");
  const isHod = hasRole("HOD");
  const isApproved = isPrincipal || !!session?.user?.approved;
  const isReadOnly = !isApproved && roles.length === 0;
  const canManageStaff = isPrincipal;
  const canManageStudents = isPrincipal || isSeniorTeacher;
  const canEnterMarks = isPrincipal || isSeniorTeacher || isTeacher || isHod;
  const canEditTimetable = isPrincipal || isSeniorTeacher;

  return (
    <Ctx.Provider value={{
      session, user: session?.user ?? null, roles, loading,
      signIn, signOut, hasRole, refreshRoles, refreshProfile,
      isTeacher, isSeniorTeacher, isHod, isPrincipal, isPlatformAdmin, isApproved, isReadOnly,
      canManageStaff, canManageStudents, canEnterMarks, canEditTimetable,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth outside AuthProvider");
  return c;
}

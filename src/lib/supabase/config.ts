export type UserRole = "CASHIER" | "OWNER";

export interface AuthUserProfile {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  authMode: "SUPABASE" | "DEMO_FALLBACK";
}

export const SUPABASE_COOKIE_KEYS = {
  URL: "cb_banong_sb_url",
  KEY: "cb_banong_sb_key",
  DEMO_SESSION: "cb_banong_demo_session",
} as const;

export function getSupabaseEnvConfig(cookieGetter?: (name: string) => string | undefined): {
  url: string;
  key: string;
  isConfigured: boolean;
} {
  const envUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  const envKey = (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    ""
  ).trim();

  if (envUrl && envKey) {
    return { url: envUrl, key: envKey, isConfigured: true };
  }

  if (cookieGetter) {
    const cookieUrl = (cookieGetter(SUPABASE_COOKIE_KEYS.URL) || "").trim();
    const cookieKey = (cookieGetter(SUPABASE_COOKIE_KEYS.KEY) || "").trim();
    if (cookieUrl && cookieKey) {
      return { url: cookieUrl, key: cookieKey, isConfigured: true };
    }
  }

  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem("cb_banong_cloud_config_v1");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.supabaseUrl && parsed.supabaseAnonKey) {
          return {
            url: String(parsed.supabaseUrl).trim(),
            key: String(parsed.supabaseAnonKey).trim(),
            isConfigured: true,
          };
        }
      }
    } catch {
      // Ignore storage error
    }
  }

  return { url: "", key: "", isConfigured: false };
}

export function normalizeRole(rawRole: unknown): UserRole {
  if (typeof rawRole === "string" && rawRole.toUpperCase() === "OWNER") {
    return "OWNER";
  }
  return "CASHIER";
}


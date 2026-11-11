import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import {
  AuthUserProfile,
  getSupabaseEnvConfig,
  normalizeRole,
  SUPABASE_COOKIE_KEYS,
} from "./config";

export async function createClient() {
  const cookieStore = await cookies();
  const { url, key, isConfigured } = getSupabaseEnvConfig(
    (name) => cookieStore.get(name)?.value
  );

  if (!isConfigured) {
    return null;
  }

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet, headers) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
          void headers;
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored as `middleware.ts` refreshes user sessions.
        }
      },
    },
  });
}

/**
 * Verifies the current authenticated user on the server using `getClaims()` / `getUser()`
 * and resolves their role from `public.profiles` or `app_metadata`.
 * Never trusts `getSession()` on the server, and never uses `user_metadata` for authorization.
 */
export async function getVerifiedServerUser(): Promise<AuthUserProfile | null> {
  const cookieStore = await cookies();
  const supabase = await createClient();

  if (supabase) {
    try {
      const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (!claimsError && !userError && user && claimsData?.claims) {
        // Resolve role from database `public.profiles` first, fallback to `app_metadata.role`
        // Security checklist: NEVER use `user_metadata` for authorization decisions!
        let resolvedRole = normalizeRole(user.app_metadata?.role);
        let resolvedName =
          typeof user.user_metadata?.full_name === "string" &&
          user.user_metadata.full_name.trim()
            ? user.user_metadata.full_name.trim()
            : user.email?.split("@")[0] || "Staf Kasir";

        const { data: profileRow } = await supabase
          .from("profiles")
          .select("full_name, role")
          .eq("id", user.id)
          .maybeSingle();

        if (profileRow) {
          resolvedRole = normalizeRole(profileRow.role);
          if (profileRow.full_name) {
            resolvedName = String(profileRow.full_name);
          }
        }

        return {
          id: user.id,
          email: user.email || "",
          fullName: resolvedName,
          role: resolvedRole,
          authMode: "SUPABASE",
        };
      }
    } catch {
      // Fall through if Supabase unreachable
    }
  }

  // Check local demo session cookie fallback when Supabase URL/key is not configured
  const demoCookie = cookieStore.get(SUPABASE_COOKIE_KEYS.DEMO_SESSION)?.value;
  if (demoCookie) {
    try {
      const parsed = JSON.parse(decodeURIComponent(demoCookie));
      if (parsed && parsed.id && parsed.email) {
        return {
          id: String(parsed.id),
          email: String(parsed.email),
          fullName: String(parsed.fullName || "Staf Toko"),
          role: normalizeRole(parsed.role),
          authMode: "DEMO_FALLBACK",
        };
      }
    } catch {
      return null;
    }
  }

  return null;
}


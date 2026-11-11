import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  getSupabaseEnvConfig,
  normalizeRole,
  SUPABASE_COOKIE_KEYS,
  UserRole,
} from "./config";

function copySupabaseCookiesAndHeaders(
  source: NextResponse,
  target: NextResponse
): NextResponse {
  source.cookies.getAll().forEach((cookie) => {
    target.cookies.set(cookie);
  });
  for (const header of ["cache-control", "expires", "pragma"]) {
    const value = source.headers.get(header);
    if (value) target.headers.set(header, value);
  }
  return target;
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const pathname = request.nextUrl.pathname;
  const isLoginRoute = pathname.startsWith("/login");
  const isAuthRoute = pathname.startsWith("/auth");
  const isApiRoute = pathname.startsWith("/api");
  const isOwnerRoute = pathname.startsWith("/owner");

  const { url, key, isConfigured } = getSupabaseEnvConfig(
    (name) => request.cookies.get(name)?.value
  );

  let isAuthenticated = false;
  let userRole: UserRole = "CASHIER";

  if (isConfigured) {
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
          if (headers) {
            Object.entries(headers).forEach(([headerKey, headerValue]) => {
              supabaseResponse.headers.set(headerKey, headerValue);
            });
          }
        },
      },
    });

    // IMPORTANT: Always use `getClaims()` in server middleware to verify JWT signature
    // and refresh expired Auth tokens. Never trust `getSession()` on the server.
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();

    if (!claimsError && claimsData?.claims) {
      isAuthenticated = true;
      const claims = claimsData.claims as Record<string, unknown>;
      const appMeta =
        (claims.app_metadata as Record<string, unknown> | undefined) || {};
      userRole = normalizeRole(appMeta.role);

      // Query `public.profiles` for authoritative role if checking `/owner`
      if (isOwnerRoute && claims.sub) {
        const { data: profileRow } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", String(claims.sub))
          .maybeSingle();

        if (profileRow?.role) {
          userRole = normalizeRole(profileRow.role);
        }
      }
    }
  }

  // Also check local demo session fallback if not authenticated via Supabase
  if (!isAuthenticated) {
    const demoCookie = request.cookies.get(SUPABASE_COOKIE_KEYS.DEMO_SESSION)?.value;
    if (demoCookie) {
      try {
        const parsed = JSON.parse(decodeURIComponent(demoCookie));
        if (parsed && parsed.id && parsed.email) {
          isAuthenticated = true;
          userRole = normalizeRole(parsed.role);
        }
      } catch {
        isAuthenticated = false;
      }
    }
  }

  // Allow `/auth/*` and `/api/*` routes to proceed with refreshed cookies
  if (isAuthRoute || isApiRoute) {
    return supabaseResponse;
  }

  // 1. Unauthenticated users trying to access protected routes (`/`, `/owner`, etc.) -> `/login`
  if (!isAuthenticated && !isLoginRoute) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    if (pathname !== "/") {
      loginUrl.searchParams.set("next", pathname);
    }
    const redirectResponse = NextResponse.redirect(loginUrl);
    return copySupabaseCookiesAndHeaders(supabaseResponse, redirectResponse);
  }

  // 2. Authenticated users visiting `/login` -> redirect to `/` (or `/owner` if requested and authorized)
  if (isAuthenticated && isLoginRoute) {
    const nextParam = request.nextUrl.searchParams.get("next");
    const targetUrl = request.nextUrl.clone();
    if (nextParam && nextParam.startsWith("/owner") && userRole === "OWNER") {
      targetUrl.pathname = "/owner";
    } else {
      targetUrl.pathname = "/";
    }
    targetUrl.search = "";
    const redirectResponse = NextResponse.redirect(targetUrl);
    return copySupabaseCookiesAndHeaders(supabaseResponse, redirectResponse);
  }

  // 3. Role-based guard: `/owner` requires `OWNER` role
  if (isAuthenticated && isOwnerRoute && userRole !== "OWNER") {
    const posUrl = request.nextUrl.clone();
    posUrl.pathname = "/";
    posUrl.searchParams.set("error", "forbidden_owner");
    const redirectResponse = NextResponse.redirect(posUrl);
    return copySupabaseCookiesAndHeaders(supabaseResponse, redirectResponse);
  }

  return supabaseResponse;
}


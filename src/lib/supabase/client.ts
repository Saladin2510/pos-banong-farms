import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseEnvConfig, SUPABASE_COOKIE_KEYS } from "./config";

function getBrowserCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split("=").slice(1).join("=")) : undefined;
}

export function createClient() {
  const { url, key, isConfigured } = getSupabaseEnvConfig(getBrowserCookie);
  if (!isConfigured) {
    return null;
  }
  return createBrowserClient(url, key);
}

export function saveSupabaseRuntimeCookies(url: string, key: string) {
  if (typeof document === "undefined") return;
  const maxAge = 60 * 60 * 24 * 365; // 1 year
  document.cookie = `${SUPABASE_COOKIE_KEYS.URL}=${encodeURIComponent(
    url.trim()
  )}; path=/; max-age=${maxAge}; SameSite=Lax`;
  document.cookie = `${SUPABASE_COOKIE_KEYS.KEY}=${encodeURIComponent(
    key.trim()
  )}; path=/; max-age=${maxAge}; SameSite=Lax`;
}


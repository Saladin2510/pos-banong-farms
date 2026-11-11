import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_COOKIE_KEYS } from "@/lib/supabase/config";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  if (supabase) {
    await supabase.auth.signOut();
  }

  const cookieStore = await cookies();
  cookieStore.delete(SUPABASE_COOKIE_KEYS.DEMO_SESSION);

  return NextResponse.redirect(new URL("/login", request.url), {
    status: 303,
  });
}


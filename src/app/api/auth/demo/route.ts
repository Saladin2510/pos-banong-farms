import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import {
  normalizeRole,
  SUPABASE_COOKIE_KEYS,
  UserRole,
} from "@/lib/supabase/config";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = String(body.email || "").trim().toLowerCase();
    const fullName = String(body.fullName || "Staf CV Banong Farms").trim();
    const role: UserRole = normalizeRole(body.role);

    if (!email) {
      return NextResponse.json(
        { error: "Alamat email wajib diisi." },
        { status: 400 }
      );
    }

    const sessionPayload = {
      id: `demo-${role.toLowerCase()}-${Date.now()}`,
      email,
      fullName,
      role,
    };

    const cookieStore = await cookies();
    cookieStore.set(
      SUPABASE_COOKIE_KEYS.DEMO_SESSION,
      encodeURIComponent(JSON.stringify(sessionPayload)),
      {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        maxAge: 60 * 60 * 12, // 12 hours shift
      }
    );

    return NextResponse.json({ ok: true, user: sessionPayload });
  } catch {
    return NextResponse.json(
      { error: "Gagal membuat sesi staf lokal." },
      { status: 500 }
    );
  }
}


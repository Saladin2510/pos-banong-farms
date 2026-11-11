import { NextResponse } from "next/server";
import { getVerifiedServerUser } from "@/lib/supabase/server";

export async function GET() {
  const user = await getVerifiedServerUser();
  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }
  return NextResponse.json({ user });
}


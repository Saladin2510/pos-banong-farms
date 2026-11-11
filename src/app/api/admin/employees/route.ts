import { NextRequest, NextResponse } from "next/server";
import { getVerifiedServerUser, createClient } from "@/lib/supabase/server";

export interface EmployeeData {
  id: string;
  email: string;
  fullName: string;
  role: "OWNER" | "CASHIER";
  createdAt?: string;
}

const DEFAULT_EMPLOYEES: EmployeeData[] = [
  {
    id: "emp-admin-1",
    email: "admin@banongfarms.id",
    fullName: "Administrator CV Banong",
    role: "OWNER",
    createdAt: new Date().toISOString(),
  },
  {
    id: "emp-kasir-1",
    email: "kasir@gmai.com",
    fullName: "Dilan (Kasir Toko)",
    role: "CASHIER",
    createdAt: new Date().toISOString(),
  },
  {
    id: "emp-kasir-2",
    email: "mira@banongfarms.id",
    fullName: "Mira Workman (Kasir Shift Pagi)",
    role: "CASHIER",
    createdAt: new Date().toISOString(),
  },
];

export async function GET() {
  try {
    const supabase = await createClient();
    if (supabase) {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, full_name, role, created_at")
        .order("created_at", { ascending: false });

      if (!error && data && data.length > 0) {
        const formatted: EmployeeData[] = data.map((row) => ({
          id: row.id,
          email: row.email || "",
          fullName: row.full_name || row.email?.split("@")[0] || "Staf",
          role: row.role === "OWNER" ? "OWNER" : "CASHIER",
          createdAt: row.created_at,
        }));
        return NextResponse.json({ employees: formatted });
      }
    }
  } catch {
    // Fallback to default
  }

  return NextResponse.json({ employees: DEFAULT_EMPLOYEES });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, fullName, role, password } = body;

    if (!email || !fullName) {
      return NextResponse.json(
        { error: "Nama lengkap dan email wajib diisi." },
        { status: 400 }
      );
    }

    const cleanRole = role === "OWNER" ? "OWNER" : "CASHIER";
    const supabase = await createClient();

    if (supabase) {
      // Create user via Supabase Auth if password provided
      if (password && password.length >= 6) {
        const { data: authData, error: authErr } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
          },
        });

        if (authErr) {
          // If user already exists, update their profile
          if (authErr.message.toLowerCase().includes("already registered")) {
            await supabase
              .from("profiles")
              .update({ full_name: fullName, role: cleanRole })
              .eq("email", email);
            return NextResponse.json({ success: true, message: "Profil karyawan diperbarui" });
          }
          return NextResponse.json({ error: authErr.message }, { status: 400 });
        }

        if (authData.user) {
          await supabase.from("profiles").upsert({
            id: authData.user.id,
            email,
            full_name: fullName,
            role: cleanRole,
          });
          return NextResponse.json({
            success: true,
            employee: {
              id: authData.user.id,
              email,
              fullName,
              role: cleanRole,
              createdAt: new Date().toISOString(),
            },
          });
        }
      } else {
        // Direct insert/upsert to profiles
        const newId = `emp-${Date.now()}`;
        const { error: profErr } = await supabase.from("profiles").insert({
          id: newId,
          email,
          full_name: fullName,
          role: cleanRole,
        });

        if (!profErr) {
          return NextResponse.json({
            success: true,
            employee: {
              id: newId,
              email,
              fullName,
              role: cleanRole,
              createdAt: new Date().toISOString(),
            },
          });
        }
      }
    }

    // Fallback response for offline / demo mode
    return NextResponse.json({
      success: true,
      employee: {
        id: `demo-${Date.now()}`,
        email,
        fullName,
        role: cleanRole,
        createdAt: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Gagal menambahkan karyawan." },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, fullName, role } = body;

    if (!id) {
      return NextResponse.json({ error: "ID Karyawan wajib disertakan." }, { status: 400 });
    }

    const cleanRole = role === "OWNER" ? "OWNER" : "CASHIER";
    const supabase = await createClient();

    if (supabase) {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          role: cleanRole,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Gagal memperbarui karyawan." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID Karyawan wajib disertakan." }, { status: 400 });
    }

    const supabase = await createClient();
    if (supabase) {
      const { error } = await supabase.from("profiles").delete().eq("id", id);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Gagal menghapus karyawan." },
      { status: 500 }
    );
  }
}


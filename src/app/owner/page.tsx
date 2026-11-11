import { redirect } from "next/navigation";
import { getVerifiedServerUser } from "@/lib/supabase/server";
import OwnerPageClient from "./OwnerPageClient";

export default async function OwnerProtectedPage() {
  const user = await getVerifiedServerUser();

  if (!user) {
    redirect("/login?next=/owner");
  }

  if (user.role !== "OWNER") {
    redirect("/?error=forbidden_owner");
  }

  return <OwnerPageClient user={user} />;
}


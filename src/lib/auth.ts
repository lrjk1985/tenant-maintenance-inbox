import { redirect } from "next/navigation";

import { getPublicSupabaseConfig } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { StaffUser } from "@/lib/types";

export async function getAuthenticatedStaff() {
  if (!getPublicSupabaseConfig()) {
    return null;
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from("staff_users")
    .select("user_id, full_name, role, email")
    .eq("user_id", user.id)
    .maybeSingle();

  return {
    user_id: user.id,
    full_name:
      profile?.full_name ??
      user.user_metadata?.full_name ??
      user.email?.split("@")[0] ??
      "Staff User",
    role: profile?.role ?? "staff",
    email: profile?.email ?? user.email,
  } satisfies StaffUser;
}

export async function requireAuthenticatedStaff() {
  const staff = await getAuthenticatedStaff();

  if (!staff) {
    redirect("/login");
  }

  return staff;
}

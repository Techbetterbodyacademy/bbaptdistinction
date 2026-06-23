"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { preparePasswordChange } from "@/lib/password-change";

export async function updatePassword(formData: FormData) {
  const input = {
    password: String(formData.get("password") ?? ""),
    confirm: String(formData.get("confirm") ?? "")
  };
  const prepared = preparePasswordChange(input);
  if (!prepared.ok) {
    redirect(`/app/settings/account?error=${encodeURIComponent(prepared.error)}`);
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.auth.updateUser({
    password: prepared.record.password
  });

  if (error) {
    console.error("[account] updateUser password failed", {
      message: error.message,
      status: error.status
    });
    redirect("/app/settings/account?error=save");
  }

  redirect("/app/settings/account?saved=1");
}

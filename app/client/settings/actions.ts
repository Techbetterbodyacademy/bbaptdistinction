"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function updateClientAccount(formData: FormData): Promise<void> {
  const fullName = String(formData.get("full_name") ?? "").trim();
  if (!fullName) redirect("/client/settings?error=name_required");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("user_profile")
    .update({ full_name: fullName })
    .eq("id", user.id);

  if (error) {
    console.error("[client/settings] name update failed", error.message);
    redirect("/client/settings?error=name_update_failed");
  }

  revalidatePath("/client");
  revalidatePath("/client/settings");
  redirect("/client/settings?saved=name");
}

export async function updateClientPassword(formData: FormData): Promise<void> {
  const currentPassword = String(formData.get("current_password") ?? "");
  const newPassword = String(formData.get("new_password") ?? "");
  const confirmPassword = String(formData.get("confirm_password") ?? "");

  if (!currentPassword || !newPassword) {
    redirect("/client/settings?error=password_required");
  }
  if (newPassword.length < 8) {
    redirect("/client/settings?error=password_too_short");
  }
  if (newPassword !== confirmPassword) {
    redirect("/client/settings?error=password_mismatch");
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !user.email) redirect("/login");

  // Verify current password by attempting a sign-in via the service client
  const service = createServiceClient();
  const { error: signInError } = await service.auth.signInWithPassword({
    email: user.email,
    password: currentPassword
  });

  if (signInError) {
    redirect("/client/settings?error=current_password_wrong");
  }

  // Update the password
  const { error: updateError } = await service.auth.admin.updateUserById(user.id, {
    password: newPassword
  });

  if (updateError) {
    console.error("[client/settings] password update failed", updateError.message);
    redirect("/client/settings?error=password_update_failed");
  }

  redirect("/client/settings?saved=password");
}

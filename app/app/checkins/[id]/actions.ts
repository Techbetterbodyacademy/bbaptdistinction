"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function replyToCheckin(formData: FormData) {
  const checkinId = String(formData.get("checkin_id") ?? "");
  const response = String(formData.get("coach_response") ?? "").trim();

  if (!checkinId || !response) {
    redirect(`/app/checkins/${checkinId}?error=missing`);
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("check_in")
    .update({
      coach_response: response,
      coach_responded_at: new Date().toISOString()
    })
    .eq("id", checkinId);

  if (error) {
    console.error("[checkin] reply failed", { message: error.message, code: error.code });
    redirect(`/app/checkins/${checkinId}?error=save`);
  }

  revalidatePath("/app/checkins");
  revalidatePath(`/app/checkins/${checkinId}`);
  redirect(`/app/checkins/${checkinId}?saved=1`);
}

"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function toggleHabitToday(formData: FormData) {
  const assignmentId = String(formData.get("assignment_id") ?? "");
  const completed = String(formData.get("completed") ?? "0") === "1";
  if (!assignmentId) redirect("/client/habits");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: clientProfile } = await supabase
    .from("client_profile")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!clientProfile) redirect("/client");

  const today = new Date().toISOString().slice(0, 10);

  await supabase.from("habit_log").upsert(
    {
      assignment_id: assignmentId,
      client_id: clientProfile.id,
      log_date: today,
      completed
    },
    { onConflict: "assignment_id,log_date" }
  );

  revalidatePath("/client/habits");
  redirect("/client/habits?saved=1");
}

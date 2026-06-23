"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function assignProgram(formData: FormData) {
  const programId = String(formData.get("program_id") ?? "");
  const clientId = String(formData.get("client_id") ?? "");
  const startDate = String(formData.get("start_date") ?? "");

  if (!programId || !clientId || !startDate) {
    redirect(`/app/programs/${programId}/assign?error=missing`);
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { error } = await supabase.from("program_assignment").insert({
    client_id: clientId,
    program_id: programId,
    start_date: startDate,
    status: "active",
    assigned_by: user.id
  });

  if (error) {
    redirect(`/app/programs/${programId}/assign?error=insert`);
  }

  revalidatePath(`/app/programs/${programId}`);
  revalidatePath(`/app/programs/${programId}/assign`);
  redirect(`/app/programs/${programId}/assign?assigned=1`);
}

export async function unassignProgram(formData: FormData) {
  const programId = String(formData.get("program_id") ?? "");
  const assignmentId = String(formData.get("assignment_id") ?? "");

  if (!programId || !assignmentId) {
    redirect(`/app/programs/${programId}/assign?error=missing`);
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("program_assignment")
    .update({ status: "completed" })
    .eq("id", assignmentId);

  if (error) {
    redirect(`/app/programs/${programId}/assign?error=unassign`);
  }

  revalidatePath(`/app/programs/${programId}`);
  revalidatePath(`/app/programs/${programId}/assign`);
  redirect(`/app/programs/${programId}/assign`);
}

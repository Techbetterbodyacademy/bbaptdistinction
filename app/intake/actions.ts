"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function numOrNull(value: FormDataEntryValue | null): number | null {
  if (value == null) return null;
  const n = Number(String(value).trim());
  return Number.isFinite(n) ? n : null;
}

function strOrNull(value: FormDataEntryValue | null): string | null {
  const s = String(value ?? "").trim();
  return s.length ? s : null;
}

export async function submitIntake(formData: FormData) {
  const inviteToken = String(formData.get("invite_token") ?? "").trim();
  if (!inviteToken) {
    redirect("/intake?error=missing");
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: invite } = await supabase
    .from("client_invite")
    .select("id, workspace_id, coach_id, full_name, email, status")
    .eq("token", inviteToken)
    .maybeSingle();

  if (!invite || invite.status !== "pending") {
    redirect("/intake?error=invite");
  }

  if ((invite.email ?? "").toLowerCase() !== (user.email ?? "").toLowerCase()) {
    redirect("/intake?error=mismatch");
  }

  const { data: existingProfile } = await supabase
    .from("user_profile")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (!existingProfile) {
    const { error: profileError } = await supabase.from("user_profile").insert({
      id: user.id,
      workspace_id: invite.workspace_id,
      role: "client",
      full_name: invite.full_name
    });
    if (profileError) {
      redirect("/intake?error=profile");
    }
  }

  const age = numOrNull(formData.get("age"));
  const heightCm = numOrNull(formData.get("height_cm"));
  const currentWeightKg = numOrNull(formData.get("current_weight_kg"));

  const { data: existingClient } = await supabase
    .from("client_profile")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  let clientId = existingClient?.id;
  if (!clientId) {
    const { data: newClient, error: clientError } = await supabase
      .from("client_profile")
      .insert({
        user_id: user.id,
        workspace_id: invite.workspace_id,
        coach_id: invite.coach_id,
        age,
        height_cm: heightCm,
        start_weight_kg: currentWeightKg,
        current_weight_kg: currentWeightKg,
        status: "active"
      })
      .select("id")
      .single();
    if (clientError || !newClient) {
      redirect("/intake?error=client");
    }
    clientId = newClient.id;
  }

  const intakePayload = {
    client_id: clientId,
    submitted_at: new Date().toISOString(),
    primary_goal: strOrNull(formData.get("primary_goal")),
    why_now: strOrNull(formData.get("why_now")),
    past_attempts: strOrNull(formData.get("past_attempts")),
    current_constraints: strOrNull(formData.get("current_constraints")),
    realistic_timeframe: strOrNull(formData.get("realistic_timeframe")),
    health_flags: strOrNull(formData.get("health_flags")),
    raw_responses: Object.fromEntries(formData.entries())
  };

  const { error: intakeError } = await supabase
    .from("intake_response")
    .upsert(intakePayload, { onConflict: "client_id" });

  if (intakeError) {
    redirect("/intake?error=intake");
  }

  await supabase
    .from("client_invite")
    .update({
      status: "accepted",
      accepted_user_id: user.id,
      accepted_at: new Date().toISOString()
    })
    .eq("id", invite.id);

  redirect("/client?welcome=1");
}

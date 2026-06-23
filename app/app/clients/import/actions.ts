"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { parseClientCsv, prepareClientRow, type ClientRecord } from "@/lib/client-csv";

export async function importClientsCsv(formData: FormData) {
  const csv = String(formData.get("csv") ?? "").trim();
  if (!csv) redirect(`/app/clients/import?error=${encodeURIComponent("Paste a CSV first")}`);

  const parsed = parseClientCsv(csv);
  if (!parsed.ok) {
    redirect(`/app/clients/import?error=${encodeURIComponent(parsed.error)}`);
  }
  if (parsed.rows.length === 0) {
    redirect(`/app/clients/import?error=${encodeURIComponent("No data rows found below the header")}`);
  }

  // Validate every row before any DB writes
  const cleaned: ClientRecord[] = [];
  for (let i = 0; i < parsed.rows.length; i++) {
    const row = parsed.rows[i];
    const r = prepareClientRow(row);
    if (!r.ok) {
      redirect(`/app/clients/import?error=${encodeURIComponent(`Row ${i + 2}: ${r.error}`)}`);
    }
    cleaned.push(r.record);
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: workspace } = await supabase
    .from("workspace")
    .select("id")
    .eq("owner_id", user.id)
    .single();

  const service = createServiceClient();

  // Find existing users by email so we can skip duplicates fast
  const emails = cleaned.map((r) => r.email);
  const { data: existingProfiles } = await service
    .from("user_profile")
    .select("id, full_name")
    .in("id", []);
  void existingProfiles;

  // Pull existing client_profiles for this workspace by joining user_profile email
  const { data: existingInWorkspace } = await service
    .from("client_profile")
    .select("user_id, user_profile:user_id(id)")
    .eq("workspace_id", workspace!.id);
  void existingInWorkspace;

  // Check by listing auth.users matching our emails
  const { data: usersResp } = await service.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const existingUserByEmail = new Map<string, string>();
  (usersResp?.users ?? []).forEach((u) => {
    if (u.email) existingUserByEmail.set(u.email.toLowerCase(), u.id);
  });

  let created = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const row of cleaned) {
    let userId = existingUserByEmail.get(row.email);

    if (!userId) {
      // Create auth user via admin (email confirmed, random password)
      const { data: newUser, error: createUserError } = await service.auth.admin.createUser({
        email: row.email,
        email_confirm: true,
        user_metadata: { full_name: row.full_name },
        password: crypto.randomUUID() // placeholder — user resets via /forgot-password later
      });
      if (createUserError || !newUser?.user) {
        errors.push(`${row.email}: ${createUserError?.message ?? "createUser failed"}`);
        continue;
      }
      userId = newUser.user.id;
    }

    // user_profile (idempotent: insert or update)
    const { error: profileError } = await service.from("user_profile").upsert({
      id: userId,
      workspace_id: workspace!.id,
      role: "client",
      full_name: row.full_name
    });
    if (profileError) {
      errors.push(`${row.email}: profile ${profileError.message}`);
      continue;
    }

    // Check if client_profile already exists in this workspace
    const { data: existingClient } = await service
      .from("client_profile")
      .select("id")
      .eq("workspace_id", workspace!.id)
      .eq("user_id", userId)
      .maybeSingle();

    if (existingClient) {
      // Update existing
      await service
        .from("client_profile")
        .update({
          age: row.age,
          height_cm: row.height_cm,
          start_weight_kg: row.current_weight_kg,
          current_weight_kg: row.current_weight_kg,
          lifecycle_stage: row.lifecycle_stage
        })
        .eq("id", existingClient.id);
      skipped++;
      continue;
    }

    const { error: insertError } = await service.from("client_profile").insert({
      user_id: userId,
      workspace_id: workspace!.id,
      coach_id: user.id,
      audience: "men",
      status: "active",
      lifecycle_stage: row.lifecycle_stage,
      stage_entered_at: new Date().toISOString(),
      age: row.age,
      height_cm: row.height_cm,
      start_weight_kg: row.current_weight_kg,
      current_weight_kg: row.current_weight_kg
    });

    if (insertError) {
      errors.push(`${row.email}: ${insertError.message}`);
      continue;
    }
    created++;
  }

  revalidatePath("/app/clients");
  revalidatePath("/app/watches");

  const errMsg = errors.length > 0
    ? `&error=${encodeURIComponent(`Some rows failed: ${errors.slice(0, 3).join(" · ")}`)}`
    : "";
  redirect(`/app/clients/import?ok=1&created=${created}&skipped=${skipped}${errMsg}`);
}

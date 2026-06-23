"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { transformationPhotoPath, uploadTransformationPhoto } from "@/lib/storage";

function numOrNull(value: FormDataEntryValue | null): number | null {
  if (value == null || String(value).trim() === "") return null;
  const n = Number(String(value).trim());
  return Number.isFinite(n) ? n : null;
}

function strOrNull(value: FormDataEntryValue | null): string | null {
  const s = String(value ?? "").trim();
  return s.length ? s : null;
}

function fileOrNull(value: FormDataEntryValue | null): File | null {
  if (!(value instanceof File)) return null;
  if (!value.size) return null;
  return value;
}

function fileExt(file: File): string {
  const name = file.name?.toLowerCase() ?? "";
  const m = name.match(/\.([a-z0-9]+)$/);
  if (m) return m[1];
  const t = file.type;
  if (t === "image/png") return "png";
  if (t === "image/webp") return "webp";
  if (t === "image/heic") return "heic";
  return "jpg";
}

export async function submitTransformationEntry(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: clientProfile } = await supabase
    .from("client_profile")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!clientProfile) {
    redirect("/client");
  }

  const entryDate = strOrNull(formData.get("entry_date")) ?? new Date().toISOString().slice(0, 10);

  const payload = {
    client_id: clientProfile.id,
    entry_date: entryDate,
    weight_kg: numOrNull(formData.get("weight_kg")),
    body_fat_pct: numOrNull(formData.get("body_fat_pct")),
    waist_cm: numOrNull(formData.get("waist_cm")),
    hips_cm: numOrNull(formData.get("hips_cm")),
    chest_cm: numOrNull(formData.get("chest_cm")),
    arm_cm: numOrNull(formData.get("arm_cm")),
    thigh_cm: numOrNull(formData.get("thigh_cm")),
    sleep_hours_avg: numOrNull(formData.get("sleep_hours_avg")),
    stress_rating: numOrNull(formData.get("stress_rating")),
    notes: strOrNull(formData.get("notes"))
  };

  const { data: entry, error: insertError } = await supabase
    .from("transformation_entry")
    .insert(payload)
    .select("id")
    .single();

  if (insertError || !entry) {
    redirect("/client/logbook/new?error=insert");
  }

  if (payload.weight_kg) {
    await supabase
      .from("client_profile")
      .update({ current_weight_kg: payload.weight_kg })
      .eq("id", clientProfile.id);
  }

  const poses: Array<{ field: string; pose: string }> = [
    { field: "photo_front", pose: "front" },
    { field: "photo_side", pose: "side" },
    { field: "photo_back", pose: "back" }
  ];

  for (const { field, pose } of poses) {
    const file = fileOrNull(formData.get(field));
    if (!file) continue;

    const path = transformationPhotoPath({
      clientId: clientProfile.id,
      entryId: entry.id,
      pose,
      ext: fileExt(file)
    });

    const result = await uploadTransformationPhoto(supabase, path, file);
    if ("error" in result) continue;

    await supabase.from("transformation_photo").insert({
      entry_id: entry.id,
      client_id: clientProfile.id,
      pose,
      blob_url: path
    });
  }

  revalidatePath("/client/logbook");
  redirect(`/client/logbook/${entry.id}`);
}

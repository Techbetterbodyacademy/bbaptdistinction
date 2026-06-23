"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { generateJSON } from "@/lib/ai";

type GeneratedPost = {
  hook: string;
  caption: string;
  hashtags: string;
};

const SYSTEM_PROMPT = `You write Better Body Academy transformation posts.

VOICE
- Direct, plainspoken, slightly Aussie. No guru hype. No fluff.
- Specific numbers always. "5-15kg" beats "huge results."
- Short sentences, one idea per line.
- Honest mid-pitch. Acknowledge the messy parts of the journey.
- NEVER use em-dashes or en-dashes. Use periods, commas, colons.

STRUCTURE
- Hook: 1 punchy sentence. Lead with a tension, a specific number, or a contrarian framing.
- Caption: 6-10 short lines. Open with the client's "before" reality. Show one specific moment that changed (from intake or check-ins). Show what they did, concretely. End with the outcome and one line of perspective.
- Hashtags: 5-8, mix of brand (#betterbodyacademy) + niche (#dadbodtransformation, #fatlossover40) + light generic. Comma-separated.

DO NOT
- Invent numbers or events not in the data given.
- Use words like "journey", "amazing", "incredible", "life-changing".
- Promise outcomes.
- Use exclamation marks.

OUTPUT
Respond with JSON only: { "hook": "...", "caption": "...", "hashtags": "..." }`;

export async function generatePost(formData: FormData) {
  const clientId = String(formData.get("client_id") ?? "");
  const workspaceId = String(formData.get("workspace_id") ?? "");
  const sourcePhotoId = String(formData.get("source_photo_id") ?? "") || null;
  const tone = String(formData.get("tone") ?? "direct");
  const angle = String(formData.get("angle") ?? "").trim();

  if (!clientId || !workspaceId) {
    redirect(`/app/clients/${clientId}/posts/new?error=missing`);
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: client }, { data: intake }, { data: sessions }, { data: checkins }, { data: transformations }] = await Promise.all([
    supabase.from("client_profile").select(`age, height_cm, start_weight_kg, current_weight_kg, audience, user_profile:user_id(full_name)`).eq("id", clientId).maybeSingle(),
    supabase.from("intake_response").select("why_now, past_attempts, current_constraints, primary_goal, realistic_timeframe").eq("client_id", clientId).maybeSingle(),
    supabase.from("workout_session").select("performed_at, duration_minutes, overall_rpe, notes").eq("client_id", clientId).order("performed_at", { ascending: false }).limit(20),
    supabase.from("check_in").select("week_number, weight_kg, adherence_pct, wins, struggles").eq("client_id", clientId).order("submitted_at", { ascending: false }).limit(8),
    supabase.from("transformation_entry").select("entry_date, weight_kg, waist_cm, body_fat_pct, notes").eq("client_id", clientId).order("entry_date", { ascending: true }).limit(20)
  ]);

  const profile = Array.isArray(client?.user_profile) ? client?.user_profile[0] : client?.user_profile;

  const context = {
    client: {
      first_name: profile?.full_name?.split(" ")[0] ?? "Client",
      age: client?.age ?? null,
      height_cm: client?.height_cm ?? null,
      start_weight_kg: client?.start_weight_kg ?? null,
      current_weight_kg: client?.current_weight_kg ?? null,
      audience: client?.audience ?? null
    },
    intake: intake ?? null,
    sessions_count: sessions?.length ?? 0,
    recent_session_notes: (sessions ?? []).map((s) => s.notes).filter(Boolean).slice(0, 5),
    checkins: (checkins ?? []).map((c) => ({
      week: c.week_number,
      weight: c.weight_kg,
      adherence: c.adherence_pct,
      wins: c.wins,
      struggles: c.struggles
    })),
    transformation_timeline: (transformations ?? []).map((t) => ({
      date: t.entry_date,
      weight: t.weight_kg,
      waist: t.waist_cm,
      body_fat: t.body_fat_pct,
      notes: t.notes
    }))
  };

  const result = await generateJSON<GeneratedPost>({
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Tone: ${tone}.${angle ? ` Angle: ${angle}.` : ""}\n\nClient data:\n${JSON.stringify(context, null, 2)}\n\nWrite the post.`
      }
    ],
    maxTokens: 900
  });

  if (!result.ok) {
    console.error("[post-gen] AI failed", result.error);
    if (result.error.includes("OPENAI_API_KEY")) {
      redirect(`/app/clients/${clientId}/posts/new?error=key`);
    }
    redirect(`/app/clients/${clientId}/posts/new?error=ai`);
  }

  const { data: created, error } = await supabase
    .from("transformation_post")
    .insert({
      client_id: clientId,
      workspace_id: workspaceId,
      status: "draft",
      hook: result.data.hook,
      caption: result.data.caption,
      hashtags: result.data.hashtags,
      source_photo_id: sourcePhotoId,
      generated_by_model: result.model,
      generated_prompt: { tone, angle, context },
      created_by: user.id
    })
    .select("id")
    .single();

  if (error || !created) {
    console.error("[post-gen] insert failed", { message: error?.message, code: error?.code });
    redirect(`/app/clients/${clientId}/posts/new?error=insert`);
  }

  revalidatePath(`/app/clients/${clientId}/posts`);
  redirect(`/app/clients/${clientId}/posts/${created.id}`);
}

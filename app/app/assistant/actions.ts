"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { generateText } from "@/lib/ai";
import {
  prepareAssistantQuery,
  buildWorkspaceContext,
  buildAssistantPrompt,
  type ClientSummary,
  type ProgramSummary
} from "@/lib/assistant";

export async function askAssistant(formData: FormData) {
  const raw = String(formData.get("question") ?? "");
  const prepared = prepareAssistantQuery(raw);
  if (!prepared.ok) {
    redirect(`/app/assistant?error=${encodeURIComponent(prepared.error)}`);
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: workspace } = await supabase
    .from("workspace")
    .select("id, name")
    .eq("owner_id", user.id)
    .single();

  if (!workspace) redirect("/app");

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

  const [clientsRes, programsRes, workoutsRes, overdueRes] = await Promise.all([
    supabase
      .from("client_profile")
      .select("status, last_checkin_at, user_profile:user_id(full_name)")
      .eq("workspace_id", workspace.id),
    supabase
      .from("program")
      .select("name, weeks")
      .eq("workspace_id", workspace.id)
      .eq("status", "active"),
    supabase
      .from("workout_log")
      .select("id", { count: "exact", head: true })
      .gte("performed_at", sevenDaysAgo),
    supabase
      .from("client_profile")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspace.id)
      .eq("status", "active")
      .or(`last_checkin_at.is.null,last_checkin_at.lt.${threeDaysAgo}`)
  ]);

  const clients: ClientSummary[] = (clientsRes.data ?? []).map((c) => {
    const profile = Array.isArray(c.user_profile) ? c.user_profile[0] : c.user_profile;
    return {
      full_name: profile?.full_name ?? "Unnamed",
      status: (c.status as "active" | "paused" | "completed") ?? "active",
      last_checkin_at: c.last_checkin_at ?? null
    };
  });

  const programs: ProgramSummary[] = (programsRes.data ?? []).map((p) => ({
    name: p.name,
    weeks: p.weeks
  }));

  const context = buildWorkspaceContext({
    workspaceName: workspace.name,
    clients,
    programs,
    recentWorkouts: workoutsRes.count ?? 0,
    overdueCheckins: overdueRes.count ?? 0
  });

  const messages = buildAssistantPrompt({ question: prepared.question, context });

  const result = await generateText({
    messages,
    maxTokens: 700,
    model: "gpt-4.1"
  });

  if (!result.ok) {
    console.error("[assistant] AI failed", result.error);
    if (result.error.includes("OPENAI_API_KEY")) {
      redirect("/app/assistant?error=key");
    }
    redirect(`/app/assistant?q=${encodeURIComponent(prepared.question)}&error=ai`);
  }

  redirect(`/app/assistant?q=${encodeURIComponent(prepared.question)}&a=${encodeURIComponent(result.text)}`);
}

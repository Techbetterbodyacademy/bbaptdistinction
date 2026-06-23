import type { Plan, MemberIntake } from "./schema";

type SupabaseLike = {
  from: (table: string) => unknown;
};

export type MealPlanRow = {
  id: string;
  workspace_id: string;
  client_id: string;
  coach_id: string;
  intake_json: MemberIntake;
  plan_json: Plan | Record<string, never>;
  model: string;
  status: "streaming" | "ready" | "failed";
  error: string | null;
  created_at: string;
};

export async function createStreamingPlan(
  supabase: SupabaseLike,
  args: { workspace_id: string; client_id: string; coach_id: string; intake_json: MemberIntake }
): Promise<{ id: string }> {
  const { data, error } = await (supabase.from("meal_plan") as never as {
    insert: (row: unknown) => { select: () => { single: () => Promise<{ data: { id: string } | null; error: { message: string } | null }> } };
  }).insert({ ...args, plan_json: {}, status: "streaming" }).select().single();

  if (error || !data) throw new Error(error?.message ?? "createStreamingPlan: no row returned");
  return { id: data.id };
}

export async function markPlanReady(supabase: SupabaseLike, id: string, planJson: Plan): Promise<void> {
  const { error } = await (supabase.from("meal_plan") as never as {
    update: (patch: unknown) => { eq: (col: string, val: string) => Promise<{ error: { message: string } | null }> };
  }).update({ plan_json: planJson, status: "ready", error: null }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function markPlanFailed(supabase: SupabaseLike, id: string, errorMsg: string): Promise<void> {
  const { error } = await (supabase.from("meal_plan") as never as {
    update: (patch: unknown) => { eq: (col: string, val: string) => Promise<{ error: { message: string } | null }> };
  }).update({ status: "failed", error: errorMsg }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function listPlansForClient(supabase: SupabaseLike, clientId: string): Promise<MealPlanRow[]> {
  const { data, error } = await (supabase.from("meal_plan") as never as {
    select: (cols: string) => { eq: (c: string, v: string) => { eq: (c: string, v: string) => { order: (c: string, opts: unknown) => Promise<{ data: MealPlanRow[] | null; error: { message: string } | null }> } } };
  }).select("*").eq("client_id", clientId).eq("status", "ready").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listPlansForCoach(
  supabase: SupabaseLike,
  clientId: string,
  opts: { includeFailed?: boolean } = {}
): Promise<MealPlanRow[]> {
  if (opts.includeFailed) {
    const { data, error } = await (supabase.from("meal_plan") as never as {
      select: (cols: string) => { eq: (c: string, v: string) => { order: (c: string, opts: unknown) => Promise<{ data: MealPlanRow[] | null; error: { message: string } | null }> } };
    }).select("*").eq("client_id", clientId).order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  }
  const { data, error } = await (supabase.from("meal_plan") as never as {
    select: (cols: string) => { eq: (c: string, v: string) => { neq: (c: string, v: string) => { order: (c: string, opts: unknown) => Promise<{ data: MealPlanRow[] | null; error: { message: string } | null }> } } };
  }).select("*").eq("client_id", clientId).neq("status", "failed").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getPlan(supabase: SupabaseLike, id: string): Promise<MealPlanRow | null> {
  const { data, error } = await (supabase.from("meal_plan") as never as {
    select: (cols: string) => { eq: (c: string, v: string) => { maybeSingle: () => Promise<{ data: MealPlanRow | null; error: { message: string } | null }> } };
  }).select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function countTodayPlansForWorkspace(supabase: SupabaseLike, workspaceId: string): Promise<number> {
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);
  const { count, error } = await (supabase.from("meal_plan") as never as {
    select: (cols: string, opts: unknown) => { eq: (c: string, v: string) => { gte: (c: string, v: string) => Promise<{ count: number | null; error: { message: string } | null }> } };
  }).select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).gte("created_at", startOfDay.toISOString());
  if (error) throw new Error(error.message);
  return count ?? 0;
}

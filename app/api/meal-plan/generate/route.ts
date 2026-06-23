import { createClient } from "@/lib/supabase/server";
import { MemberIntake, Plan } from "@/lib/meal-plan/schema";
import { buildSystemPrompt, buildUserPrompt } from "@/lib/meal-plan/prompt";
import {
  createStreamingPlan,
  markPlanReady,
  markPlanFailed,
  countTodayPlansForWorkspace
} from "@/lib/meal-plan/storage";
import { streamObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 60;

const BodySchema = z.object({
  clientId: z.string().min(1),
  intake: MemberIntake
});

const DAILY_CAP = Number(process.env.MEAL_PLAN_MAX_PER_DAY_PER_WORKSPACE ?? 50);

export async function POST(req: Request): Promise<Response> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return Response.json({ error: "invalid_body", details: parsed.error.flatten() }, { status: 400 });
  }
  const { clientId, intake } = parsed.data;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "unauthenticated" }, { status: 401 });

  const { data: workspace } = await supabase
    .from("workspace")
    .select("id, owner_id")
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!workspace) return Response.json({ error: "no_workspace" }, { status: 403 });

  const used = await countTodayPlansForWorkspace(supabase as never, workspace.id);
  if (used >= DAILY_CAP) {
    return Response.json({ error: "daily_cap_exceeded" }, { status: 429 });
  }

  const { id: planId } = await createStreamingPlan(supabase as never, {
    workspace_id: workspace.id,
    client_id: clientId,
    coach_id: user.id,
    intake_json: intake
  });

  const result = streamObject({
    model: openai("gpt-4o"),
    schema: Plan,
    system: buildSystemPrompt(),
    prompt: buildUserPrompt(intake),
    onFinish: async ({ object, error }) => {
      try {
        if (object && !error) {
          await markPlanReady(supabase as never, planId, object);
        } else {
          await markPlanFailed(supabase as never, planId, error ? String(error) : "no_object_emitted");
        }
      } catch (writeErr) {
        await markPlanFailed(supabase as never, planId, writeErr instanceof Error ? writeErr.message : "post_stream_write_failed").catch(() => {});
      }
    }
  });

  const upstream = result.toTextStreamResponse();
  return new Response(upstream.body, {
    status: upstream.status,
    headers: new Headers([...upstream.headers, ["X-Plan-Id", planId]])
  });
}

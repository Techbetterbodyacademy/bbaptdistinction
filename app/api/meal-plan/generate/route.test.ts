import { describe, test, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn()
}));
vi.mock("@/lib/meal-plan/storage", () => ({
  createStreamingPlan: vi.fn(),
  markPlanReady: vi.fn(),
  markPlanFailed: vi.fn(),
  countTodayPlansForWorkspace: vi.fn()
}));
vi.mock("ai", () => ({
  streamObject: vi.fn()
}));
vi.mock("@ai-sdk/openai", () => ({
  openai: vi.fn(() => ({ id: "gpt-4o-mock" }))
}));

import { POST } from "./route";
import { createClient } from "@/lib/supabase/server";
import { createStreamingPlan, countTodayPlansForWorkspace } from "@/lib/meal-plan/storage";
import { streamObject } from "ai";

const VALID_CLIENT_ID = "123e4567-e89b-12d3-a456-426614174000";

const validBody = {
  clientId: VALID_CLIENT_ID,
  intake: {
    age: 40, heightCm: 180, weightKg: 90, sex: "male",
    activity: "moderate", goal: "maintain",
    calories: 2800, proteinG: 144,
    mealsPerDay: 4, fastBreakfast: false,
    cuisines: ["italian"], allergies: "",
    dietStyle: "omnivore", trainingDays: 4
  }
};

function mockSupabaseAuth(user: { id: string } | null, clientWorkspaceId: string | null = "w-1") {
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }) },
    from: vi.fn((table: string) => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue(
        table === "workspace"
          ? { data: { id: "w-1", owner_id: user?.id ?? "" }, error: null }
          : { data: clientWorkspaceId == null ? null : { id: VALID_CLIENT_ID, workspace_id: clientWorkspaceId }, error: null }
      )
    }))
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/meal-plan/generate", () => {
  test("400 on invalid JSON", async () => {
    vi.mocked(createClient).mockResolvedValue(mockSupabaseAuth({ id: "u-1" }) as never);
    const req = new Request("http://x/api/meal-plan/generate", { method: "POST", body: "{not-json" });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  test("401 when no user", async () => {
    vi.mocked(createClient).mockResolvedValue(mockSupabaseAuth(null) as never);
    const req = new Request("http://x/api/meal-plan/generate", { method: "POST", body: JSON.stringify(validBody) });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  test("400 on intake validation failure", async () => {
    vi.mocked(createClient).mockResolvedValue(mockSupabaseAuth({ id: "u-1" }) as never);
    const bad = { clientId: VALID_CLIENT_ID, intake: { ...validBody.intake, mealsPerDay: 99 } };
    const req = new Request("http://x/api/meal-plan/generate", { method: "POST", body: JSON.stringify(bad) });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  test("422 with NEEDS_BIOMETRICS code when biometrics missing", async () => {
    vi.mocked(createClient).mockResolvedValue(mockSupabaseAuth({ id: "u-1" }) as never);
    const bad = { clientId: VALID_CLIENT_ID, intake: { ...validBody.intake, age: 0, heightCm: 0, weightKg: 0 } };
    const req = new Request("http://x/api/meal-plan/generate", { method: "POST", body: JSON.stringify(bad) });
    const res = await POST(req);
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.code).toBe("NEEDS_BIOMETRICS");
  });

  test("429 when daily cap exceeded", async () => {
    vi.mocked(createClient).mockResolvedValue(mockSupabaseAuth({ id: "u-1" }) as never);
    vi.mocked(countTodayPlansForWorkspace).mockResolvedValue(50);
    const req = new Request("http://x/api/meal-plan/generate", { method: "POST", body: JSON.stringify(validBody) });
    const res = await POST(req);
    expect(res.status).toBe(429);
  });

  test("403 when client belongs to a different workspace", async () => {
    vi.mocked(createClient).mockResolvedValue(mockSupabaseAuth({ id: "u-1" }, "other-workspace") as never);
    vi.mocked(countTodayPlansForWorkspace).mockResolvedValue(0);
    const req = new Request("http://x/api/meal-plan/generate", { method: "POST", body: JSON.stringify(validBody) });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  test("happy path: creates streaming row, returns X-Plan-Id, streams body", async () => {
    vi.mocked(createClient).mockResolvedValue(mockSupabaseAuth({ id: "u-1" }) as never);
    vi.mocked(countTodayPlansForWorkspace).mockResolvedValue(0);
    vi.mocked(createStreamingPlan).mockResolvedValue({ id: "plan-9" });
    vi.mocked(streamObject).mockReturnValue({
      toTextStreamResponse: () => new Response("{streamed}", { status: 200 }),
      object: Promise.resolve({ coachNote: "ok", days: [], shoppingList: {} } as never)
    } as never);

    const req = new Request("http://x/api/meal-plan/generate", { method: "POST", body: JSON.stringify(validBody) });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("X-Plan-Id")).toBe("plan-9");
  });
});

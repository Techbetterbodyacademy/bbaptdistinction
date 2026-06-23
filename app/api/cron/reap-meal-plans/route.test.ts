import { describe, test, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: vi.fn()
}));

import { GET } from "./route";
import { createServiceClient } from "@/lib/supabase/service";

describe("GET /api/cron/reap-meal-plans", () => {
  beforeEach(() => {
    process.env.NODE_ENV = "test";
  });

  test("returns { reaped: N } for the orphaned rows", async () => {
    const select = vi.fn().mockResolvedValue({ data: [{ id: "a" }, { id: "b" }, { id: "c" }], error: null });
    const lt = vi.fn().mockReturnValue({ select });
    const eq = vi.fn().mockReturnValue({ lt });
    const update = vi.fn().mockReturnValue({ eq });

    const sb = {
      from: vi.fn(() => ({ update }))
    };
    vi.mocked(createServiceClient).mockReturnValue(sb as never);

    const req = new Request("http://x/api/cron/reap-meal-plans", { headers: { "x-vercel-cron": "1" } });
    const res = await GET(req);
    const body = await res.json();
    expect(body).toEqual({ reaped: 3 });
  });

  test("403 when not invoked by Vercel cron", async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    try {
      const req = new Request("http://x/api/cron/reap-meal-plans");
      const res = await GET(req);
      expect(res.status).toBe(403);
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });
});

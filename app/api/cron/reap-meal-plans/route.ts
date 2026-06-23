import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

export async function GET(req: Request): Promise<Response> {
  if (!req.headers.get("x-vercel-cron") && process.env.NODE_ENV !== "test") {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  const supabase = createServiceClient();
  const cutoff = new Date(Date.now() - 10 * 60 * 1000).toISOString();

  const { data, error } = await (supabase
    .from("meal_plan") as never as {
      update: (patch: unknown) => {
        eq: (c: string, v: string) => {
          lt: (c: string, v: string) => {
            select: (cols: string) => Promise<{ data: { id: string }[] | null; error: { message: string } | null }>;
          };
        };
      };
    })
    .update({ status: "failed", error: "orphaned_stream" })
    .eq("status", "streaming")
    .lt("created_at", cutoff)
    .select("id");

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ reaped: data?.length ?? 0 });
}

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return NextResponse.json({ error: "stripe not configured" }, { status: 500 });
  }

  const body = await request.json();

  if (body.type !== "checkout.session.completed") {
    return NextResponse.json({ ok: true, skipped: body.type });
  }

  const session = body.data?.object;
  if (!session?.id) {
    return NextResponse.json({ error: "no session id" }, { status: 400 });
  }

  const supabase = createServiceClient();
  await supabase
    .from("checkout_session")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      buyer_email: session.customer_details?.email ?? null,
      buyer_name: session.customer_details?.name ?? null
    })
    .eq("stripe_session_id", session.id);

  return NextResponse.json({ ok: true });
}

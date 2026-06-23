import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

type ResendEvent = {
  type: string;
  created_at: string;
  data: {
    email_id?: string;
    to?: string[];
    from?: string;
    subject?: string;
    [key: string]: unknown;
  };
};

export async function POST(request: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (secret) {
    const sig = request.headers.get("svix-signature") ?? request.headers.get("resend-signature");
    if (!sig || !sig.includes(secret)) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  let event: ResendEvent;
  try {
    event = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const supabase = createServiceClient();

  await supabase.from("email_event").insert({
    event_type: event.type,
    email_to: Array.isArray(event.data?.to) ? event.data.to.join(",") : null,
    email_from: event.data?.from ?? null,
    subject: event.data?.subject ?? null,
    payload: event.data
  });

  // For bounces + complaints, flag the recipient's client_profile if we can find them
  if (event.type === "email.bounced" || event.type === "email.complained") {
    const to = Array.isArray(event.data?.to) ? event.data.to[0] : null;
    if (to) {
      console.warn(`[resend-webhook] ${event.type} for ${to}`);
    }
  }

  return NextResponse.json({ ok: true });
}

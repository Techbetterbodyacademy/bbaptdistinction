import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sendEmail } from "@/lib/resend";

const DAYS_SINCE_LAST_CHECKIN = 7;
const DAYS_SINCE_LAST_REMINDER = 6;
const MS_PER_DAY = 1000 * 60 * 60 * 24;

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  const expected = process.env.CRON_SECRET;
  if (!expected || auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const now = new Date();
  const reminderCutoff = new Date(now.getTime() - DAYS_SINCE_LAST_REMINDER * MS_PER_DAY).toISOString();

  const { data: candidates, error: candidatesError } = await supabase
    .from("client_profile")
    .select("id, user_id, workspace_id, created_at, last_checkin_reminded_at")
    .eq("status", "active");

  if (candidatesError) {
    return NextResponse.json({ error: candidatesError.message }, { status: 500 });
  }

  let sent = 0;
  let skipped = 0;
  const failures: Array<{ clientId: string; reason: string }> = [];

  for (const client of candidates ?? []) {
    if (client.last_checkin_reminded_at && client.last_checkin_reminded_at > reminderCutoff) {
      skipped++;
      continue;
    }

    const { data: latestCheckin } = await supabase
      .from("check_in")
      .select("submitted_at")
      .eq("client_id", client.id)
      .order("submitted_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const lastCheckinTime = latestCheckin?.submitted_at
      ? new Date(latestCheckin.submitted_at).getTime()
      : new Date(client.created_at).getTime();

    const daysSince = (now.getTime() - lastCheckinTime) / MS_PER_DAY;
    if (daysSince < DAYS_SINCE_LAST_CHECKIN) {
      skipped++;
      continue;
    }

    const { data: authUser } = await supabase.auth.admin.getUserById(client.user_id);
    const email = authUser?.user?.email;
    if (!email) {
      failures.push({ clientId: client.id, reason: "no email" });
      continue;
    }

    const { data: workspace } = await supabase
      .from("workspace")
      .select("name, coach_name, primary_color")
      .eq("id", client.workspace_id)
      .maybeSingle();

    const { data: profile } = await supabase
      .from("user_profile")
      .select("full_name")
      .eq("id", client.user_id)
      .maybeSingle();

    const firstName = profile?.full_name?.split(" ")[0] ?? "there";
    const coachName = workspace?.coach_name ?? "your coach";
    const workspaceName = workspace?.name ?? "Better Body Academy";
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://app-src-indol.vercel.app";

    const html = `<!DOCTYPE html>
<html><body style="font-family:-apple-system,Segoe UI,sans-serif;background:#0a0e1a;color:#ffffff;margin:0;padding:32px;">
  <div style="max-width:540px;margin:0 auto;background:#0f1626;border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:32px;">
    <div style="font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:rgba(255,255,255,0.5);font-weight:700;margin-bottom:12px;">${workspaceName}</div>
    <h1 style="margin:0 0 16px;font-size:22px;font-weight:800;">Hey ${firstName} — your weekly check-in.</h1>
    <p style="color:rgba(255,255,255,0.7);line-height:1.55;margin:0 0 16px;">
      It&rsquo;s been more than a week. ${coachName} is waiting to read how it went.
    </p>
    <p style="color:rgba(255,255,255,0.7);line-height:1.55;margin:0 0 24px;">
      Wins, struggles, the honest score. Takes 3 minutes.
    </p>
    <a href="${siteUrl}/client/checkins/new" style="display:inline-block;background:#00aeef;color:#000;padding:12px 22px;border-radius:12px;font-weight:700;text-decoration:none;">
      Submit this week&rsquo;s check-in
    </a>
    <div style="margin-top:32px;padding-top:24px;border-top:1px solid rgba(255,255,255,0.1);font-size:12px;color:rgba(255,255,255,0.4);">
      You&rsquo;re getting this because you&rsquo;re coaching with ${workspaceName}.
    </div>
  </div>
</body></html>`;

    const result = await sendEmail({
      to: email,
      subject: `${firstName}, your ${workspaceName} check-in`,
      html
    });

    if (!result.ok) {
      failures.push({ clientId: client.id, reason: result.error });
      continue;
    }

    await supabase
      .from("client_profile")
      .update({ last_checkin_reminded_at: now.toISOString() })
      .eq("id", client.id);

    sent++;
  }

  return NextResponse.json({
    sent,
    skipped,
    failures,
    candidates: candidates?.length ?? 0
  });
}

"use server";

import { redirect } from "next/navigation";
import { createHash } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sendEmail } from "@/lib/resend";
import { generateOtpCode, normalizeEmail } from "@/lib/email-otp";

function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

function buildOtpHtml(code: string): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #ffffff; color: #0A0A0A;">
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="display: inline-block; background: #0A0A0A; color: #ffffff; padding: 6px 14px; border-radius: 999px; font-size: 11px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase;">
          Better Body Academy
        </div>
      </div>
      <h1 style="font-size: 22px; font-weight: 800; letter-spacing: -0.02em; margin: 0 0 12px 0;">
        Your sign-in code
      </h1>
      <p style="font-size: 14px; line-height: 1.6; color: #404040; margin: 0 0 20px 0;">
        Enter this code on the BBA Coaching login page. It expires in 10 minutes.
      </p>
      <div style="text-align: center; margin: 28px 0;">
        <div style="display: inline-block; background: #f5f5f5; color: #0A0A0A; padding: 18px 28px; border-radius: 12px; font-size: 32px; font-weight: 800; letter-spacing: 8px; font-family: 'Courier New', monospace;">
          ${code}
        </div>
      </div>
      <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 28px 0;" />
      <p style="font-size: 12px; line-height: 1.6; color: #737373; margin: 0;">
        Someone tried to sign in to your account with your email and password. If that wasn&apos;t you, change your password immediately.
      </p>
    </div>
  `;
}

// Called by signInWithPassword to issue the first 2FA code, AND by /login/2fa "resend" link.
export async function issue2faCode(email: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const normalized = normalizeEmail(email);
  if (!normalized) return { ok: false, error: "email required" };

  const supabase = createServiceClient();

  const code = generateOtpCode();
  const code_hash = hashCode(code);

  const { error: insertError } = await supabase.from("email_otp").insert({
    email: normalized,
    code_hash,
    issued_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString()
  });
  if (insertError) {
    console.error("[2fa] insert failed", insertError.message);
    return { ok: false, error: "could not store code" };
  }

  const result = await sendEmail({
    to: normalized,
    subject: `Your sign-in code: ${code}`,
    html: buildOtpHtml(code)
  });
  if (!result.ok) {
    console.error("[2fa] Resend send failed", result.error);
    return { ok: false, error: "could not send code" };
  }

  return { ok: true };
}

export async function resend2faCode() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !user.email) redirect("/login");

  const result = await issue2faCode(user.email);
  if (!result.ok) redirect("/login/2fa?error=resend");
  redirect("/login/2fa?resent=1");
}

export async function verify2faCode(formData: FormData) {
  const code = String(formData.get("code") ?? "").trim();
  if (!code) redirect("/login/2fa?error=missing");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !user.email) redirect("/login");

  const email = normalizeEmail(user.email);
  const service = createServiceClient();

  const { data: row, error: lookupError } = await service
    .from("email_otp")
    .select("id, code_hash, attempts, used_at, expires_at")
    .eq("email", email)
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("issued_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lookupError || !row) {
    redirect("/login/2fa?error=invalid");
  }

  if ((row.attempts ?? 0) >= 5) {
    redirect("/login/2fa?error=attempts");
  }

  if (hashCode(code) !== row.code_hash) {
    await service.from("email_otp").update({ attempts: (row.attempts ?? 0) + 1 }).eq("id", row.id);
    redirect("/login/2fa?error=invalid");
  }

  // Mark code used so it can't be replayed
  await service.from("email_otp").update({ used_at: new Date().toISOString() }).eq("id", row.id);

  // Clear the pending_2fa flag on the user
  const { error: updateError } = await service.auth.admin.updateUserById(user.id, {
    user_metadata: { ...(user.user_metadata ?? {}), pending_2fa: false }
  });
  if (updateError) {
    console.error("[2fa] clear pending failed", updateError.message);
    redirect("/login/2fa?error=session");
  }

  redirect("/");
}

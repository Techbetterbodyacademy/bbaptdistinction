"use server";

import { redirect } from "next/navigation";
import { createHash } from "node:crypto";
import { createServiceClient } from "@/lib/supabase/service";
import { sendEmail } from "@/lib/resend";
import { generateOtpCode, normalizeEmail } from "@/lib/email-otp";

function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

export async function requestOtp(formData: FormData) {
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  if (!email) redirect("/login/otp?error=missing");

  const supabase = createServiceClient();

  // Confirm the user exists. We don't want OTP to create accounts (that's signup's job).
  const { data: users, error: lookupError } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 200
  });
  if (lookupError) {
    console.error("[otp] admin.listUsers failed", lookupError.message);
    redirect("/login/otp?error=send");
  }
  const userExists = (users?.users ?? []).some((u) => u.email?.toLowerCase() === email);
  if (!userExists) {
    redirect("/login/otp?error=nouser");
  }

  const code = generateOtpCode();
  const code_hash = hashCode(code);

  const { error: insertError } = await supabase.from("email_otp").insert({
    email,
    code_hash,
    issued_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString()
  });
  if (insertError) {
    console.error("[otp] insert failed", insertError.message);
    redirect("/login/otp?error=send");
  }

  const subject = `Your sign-in code: ${code}`;
  const html = `
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
        If you didn't request this, ignore the email. Someone may have typed your address by mistake.
      </p>
    </div>
  `;

  const result = await sendEmail({ to: email, subject, html });
  if (!result.ok) {
    console.error("[otp] Resend send failed", result.error);
    redirect("/login/otp?error=resend");
  }

  redirect(`/login/otp?sent=1&email=${encodeURIComponent(email)}`);
}

export async function verifyOtp(formData: FormData) {
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const code = String(formData.get("code") ?? "").trim();
  if (!email || !code) redirect(`/login/otp?error=missing&email=${encodeURIComponent(email)}`);

  const supabase = createServiceClient();

  const { data: row, error: lookupError } = await supabase
    .from("email_otp")
    .select("id, code_hash, attempts, used_at, expires_at")
    .eq("email", email)
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("issued_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lookupError || !row) {
    redirect(`/login/otp?error=invalid&email=${encodeURIComponent(email)}`);
  }

  if ((row.attempts ?? 0) >= 5) {
    redirect(`/login/otp?error=attempts&email=${encodeURIComponent(email)}`);
  }

  if (hashCode(code) !== row.code_hash) {
    await supabase.from("email_otp").update({ attempts: (row.attempts ?? 0) + 1 }).eq("id", row.id);
    redirect(`/login/otp?sent=1&email=${encodeURIComponent(email)}&error=invalid`);
  }

  // Mark used so it can't be replayed
  await supabase.from("email_otp").update({ used_at: new Date().toISOString() }).eq("id", row.id);

  // Generate a magic-link via admin API. We don't email it; we follow it server-side
  // to mint a session for the user.
  const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email
  });

  if (linkError || !linkData?.properties?.action_link) {
    console.error("[otp] generateLink failed", linkError?.message);
    redirect(`/login/otp?error=session&email=${encodeURIComponent(email)}`);
  }

  // The action_link contains a `token_hash` query param. Redirect the browser to it
  // so the verify endpoint sets the auth cookie on this domain.
  const url = new URL(linkData.properties.action_link);
  const tokenHash = url.searchParams.get("token_hash") ?? url.searchParams.get("token");
  if (!tokenHash) {
    console.error("[otp] action_link missing token_hash", linkData.properties.action_link);
    redirect(`/login/otp?error=session&email=${encodeURIComponent(email)}`);
  }

  redirect(`/auth/confirm?token_hash=${encodeURIComponent(tokenHash)}&type=magiclink&next=/`);
}

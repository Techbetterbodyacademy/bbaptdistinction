"use server";

import { redirect } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import { sendEmail } from "@/lib/resend";
import { generateOtpCode, normalizeEmail } from "@/lib/email-otp";
import { preparePasswordChange } from "@/lib/password-change";
import { hashOtpCode, buildResetEmail } from "@/lib/reset-email";

export async function requestPasswordReset(formData: FormData) {
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  if (!email) redirect("/forgot-password?error=missing");

  const supabase = createServiceClient();

  // Confirm the user exists. Don't auto-create — this is a reset, not signup.
  const { data: users, error: lookupError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (lookupError) {
    console.error("[forgot] listUsers failed", lookupError.message);
    redirect("/forgot-password?error=send");
  }
  const userExists = (users?.users ?? []).some((u) => u.email?.toLowerCase() === email);
  if (!userExists) {
    redirect("/forgot-password?error=nouser");
  }

  const code = generateOtpCode();
  const code_hash = hashOtpCode(code);
  const built = buildResetEmail(code);

  const { error: insertError } = await supabase.from("email_otp").insert({
    email,
    code_hash,
    issued_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString()
  });
  if (insertError) {
    console.error("[forgot] insert failed", insertError.message);
    redirect("/forgot-password?error=send");
  }

  const result = await sendEmail({ to: email, subject: built.subject, html: built.html });
  if (!result.ok) {
    console.error("[forgot] Resend send failed", result.error);
    redirect("/forgot-password?error=resend");
  }

  redirect(`/forgot-password?sent=1&email=${encodeURIComponent(email)}`);
}

export async function resendResetCode(formData: FormData) {
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  if (!email) redirect("/forgot-password?error=missing");

  const supabase = createServiceClient();
  const code = generateOtpCode();
  const code_hash = hashOtpCode(code);
  const built = buildResetEmail(code);

  await supabase.from("email_otp").insert({
    email,
    code_hash,
    issued_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString()
  });

  const result = await sendEmail({ to: email, subject: built.subject, html: built.html });
  if (!result.ok) {
    console.error("[forgot] Resend resend failed", result.error);
    redirect(`/forgot-password?sent=1&email=${encodeURIComponent(email)}&error=resend`);
  }

  redirect(`/forgot-password?sent=1&email=${encodeURIComponent(email)}&resent=1`);
}

export async function resetPassword(formData: FormData) {
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const code = String(formData.get("code") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!email || !code) {
    redirect(`/forgot-password?sent=1&email=${encodeURIComponent(email)}&error=missing`);
  }

  const prepared = preparePasswordChange({ password, confirm });
  if (!prepared.ok) {
    redirect(`/forgot-password?sent=1&email=${encodeURIComponent(email)}&error=${encodeURIComponent(prepared.error)}`);
  }

  const service = createServiceClient();

  // Verify the OTP code
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
    redirect(`/forgot-password?sent=1&email=${encodeURIComponent(email)}&error=invalid`);
  }

  if ((row.attempts ?? 0) >= 5) {
    redirect(`/forgot-password?sent=1&email=${encodeURIComponent(email)}&error=attempts`);
  }

  if (hashOtpCode(code) !== row.code_hash) {
    await service.from("email_otp").update({ attempts: (row.attempts ?? 0) + 1 }).eq("id", row.id);
    redirect(`/forgot-password?sent=1&email=${encodeURIComponent(email)}&error=invalid`);
  }

  // Mark the code used immediately so it can't be replayed
  await service.from("email_otp").update({ used_at: new Date().toISOString() }).eq("id", row.id);

  // Find the user and set the new password
  const { data: users } = await service.auth.admin.listUsers({ page: 1, perPage: 200 });
  const user = (users?.users ?? []).find((u) => u.email?.toLowerCase() === email);
  if (!user) {
    redirect(`/forgot-password?sent=1&email=${encodeURIComponent(email)}&error=nouser`);
  }

  const { error: updateError } = await service.auth.admin.updateUserById(user.id, {
    password: prepared.record.password,
    user_metadata: { ...(user.user_metadata ?? {}), pending_2fa: false }
  });
  if (updateError) {
    console.error("[forgot] updateUser failed", updateError.message);
    redirect(`/forgot-password?sent=1&email=${encodeURIComponent(email)}&error=save`);
  }

  // Issue a magic link to sign them into the session right away — no extra step
  const { data: linkData, error: linkError } = await service.auth.admin.generateLink({
    type: "magiclink",
    email
  });
  if (linkError || !linkData?.properties?.action_link) {
    console.error("[forgot] generateLink failed", linkError?.message);
    redirect(`/login?reset=1`);
  }

  const url = new URL(linkData.properties.action_link);
  const tokenHash = url.searchParams.get("token_hash") ?? url.searchParams.get("token");
  if (!tokenHash) {
    redirect(`/login?reset=1`);
  }

  redirect(`/auth/confirm?token_hash=${encodeURIComponent(tokenHash)}&type=magiclink&next=/`);
}

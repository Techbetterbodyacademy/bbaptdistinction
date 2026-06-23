"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { sendWelcomeEmail } from "@/lib/welcome-email";

export async function signUpCoach(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const name = String(formData.get("name") ?? "").trim();
  const workspace = String(formData.get("workspace") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !name || !workspace || !password) {
    redirect("/signup?error=missing");
  }

  if (password.length < 8) {
    redirect("/signup?error=weakpass");
  }

  const supabase = await createClient();
  const hdrs = await headers();
  const origin = hdrs.get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  // Password-based signup. Magic-link path removed; Google OAuth is the no-password alternative.
  {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${origin}/auth/callback`,
        data: {
          full_name: name,
          pending_workspace_name: workspace
        }
      }
    });

    if (error) {
      console.error("[signup] password signUp failed", {
        message: error.message,
        status: error.status,
        name: error.name
      });
      if (error.message?.toLowerCase().includes("already")) {
        redirect("/signup?error=exists");
      }
      if (error.status === 429 || error.message?.toLowerCase().includes("rate")) {
        redirect("/signup?error=rate");
      }
      if (error.message?.toLowerCase().includes("sending confirmation email")) {
        // Supabase has email confirmation ON but its SMTP is broken.
        // We can't fix it here; tell the user precisely what's wrong.
        redirect("/signup?error=smtp");
      }
      redirect("/signup?error=send");
    }

    // If email confirmation is OFF in Supabase, session is live immediately.
    // Send our OWN welcome email via Resend, then head to onboarding.
    if (data.session) {
      // Fire and don't block — if email fails, user still gets onboarded.
      const welcome = await sendWelcomeEmail({
        to: email,
        name,
        workspaceName: workspace,
        loginUrl: `${origin}/app`
      });
      if (!welcome.ok) {
        console.error("[signup] welcome email failed", welcome.error);
      }
      redirect("/onboarding");
    }
    // Otherwise Supabase wants confirmation — show "check your inbox"
    redirect("/signup?sent=1");
  }
}

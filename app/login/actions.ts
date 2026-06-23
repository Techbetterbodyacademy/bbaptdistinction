"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export async function signInWithMagicLink(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!email) {
    redirect("/login?error=missing");
  }

  const supabase = await createClient();
  const hdrs = await headers();
  const origin = hdrs.get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
      shouldCreateUser: false
    }
  });

  if (error) {
    console.error("[login] signInWithOtp failed", {
      message: error.message,
      status: error.status,
      name: error.name
    });
    if (error.status === 429) {
      redirect("/login?error=rate");
    }
    if (error.message?.toLowerCase().includes("sending magic link")) {
      redirect("/login?error=smtp");
    }
    if (error.message?.toLowerCase().includes("user not found") || error.message?.toLowerCase().includes("signups not allowed")) {
      redirect("/login?error=nouser");
    }
    redirect("/login?error=send");
  }

  redirect("/login?sent=1");
}

export async function signInWithPassword(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirect("/login?error=missing");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    console.error("[login] signInWithPassword failed", {
      message: error.message,
      status: error.status,
      name: error.name
    });
    if (error.message?.toLowerCase().includes("invalid")) {
      redirect("/login?error=credentials");
    }
    redirect("/login?error=send");
  }

  if (!data.session) {
    redirect("/login?error=session");
  }

  redirect("/");
}

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import type { EmailOtpType } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = (searchParams.get("type") ?? "magiclink") as EmailOtpType;
  const next = searchParams.get("next") ?? "/";

  if (!token_hash) {
    return NextResponse.redirect(`${origin}/login?error=callback`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash });

  if (error) {
    console.error("[auth/confirm] verifyOtp failed", error.message);
    return NextResponse.redirect(`${origin}/login?error=callback`);
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(`${origin}/login?error=callback`);
  }

  // The user just proved possession of the email by entering a fresh OTP code.
  // That IS their 2FA, so clear any pending_2fa flag that may have been set by a previous
  // (possibly broken) Google sign-in attempt.
  if (user.user_metadata?.pending_2fa === true) {
    const service = createServiceClient();
    await service.auth.admin.updateUserById(user.id, {
      user_metadata: { ...(user.user_metadata ?? {}), pending_2fa: false }
    });
  }

  // Route based on profile + workspace, same logic as /auth/callback
  const { data: profile } = await supabase
    .from("user_profile")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role === "client") {
    return NextResponse.redirect(`${origin}/client`);
  }

  const { data: existingWorkspace } = await supabase
    .from("workspace")
    .select("id")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (existingWorkspace) {
    return NextResponse.redirect(`${origin}/app`);
  }

  if (next && next !== "/") {
    return NextResponse.redirect(`${origin}${next}`);
  }

  return NextResponse.redirect(`${origin}/onboarding`);
}

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { issue2faCode } from "@/app/login/2fa-actions";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const explicitNext = searchParams.get("next");

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=callback`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=callback`);
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(`${origin}/login?error=callback`);
  }

  // Detect Google (or any OAuth) sign-in and require 2FA before granting access.
  // Email/password sign-ins don't pass through this route, so we treat any session here
  // as OAuth-originated.
  const isOAuth = (user.identities ?? []).some((i) => i.provider !== "email");
  if (isOAuth && user.email) {
    // Send the code FIRST. Only set pending_2fa if it actually went out, so a broken
    // email service can't leave the account permanently gated.
    const issued = await issue2faCode(user.email);
    if (!issued.ok) {
      console.error("[auth/callback] issue2faCode failed — skipping 2FA gate", issued.error);
      // Fall through to normal routing below. User gets in without 2FA when email is down,
      // which is the right trade-off vs being locked out.
    } else {
      const service = createServiceClient();
      await service.auth.admin.updateUserById(user.id, {
        user_metadata: { ...(user.user_metadata ?? {}), pending_2fa: true }
      });
      return NextResponse.redirect(`${origin}/login/2fa`);
    }
  }

  if (explicitNext) {
    return NextResponse.redirect(`${origin}${explicitNext}`);
  }

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

  const { data: pendingInvite } = await supabase
    .from("client_invite")
    .select("id, token")
    .eq("status", "pending")
    .ilike("email", user.email ?? "")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (pendingInvite) {
    return NextResponse.redirect(`${origin}/intake?invite=${pendingInvite.token}`);
  }

  return NextResponse.redirect(`${origin}/onboarding`);
}

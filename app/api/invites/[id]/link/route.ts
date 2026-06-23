import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: inviteId } = await params;
  if (!inviteId) {
    return NextResponse.json({ error: "missing invite id" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Verify caller is the coach who owns this invite
  const { data: invite } = await supabase
    .from("client_invite")
    .select("id, email, workspace_id, status, full_name")
    .eq("id", inviteId)
    .maybeSingle();

  if (!invite) {
    return NextResponse.json({ error: "invite not found" }, { status: 404 });
  }

  const { data: workspace } = await supabase
    .from("workspace")
    .select("id")
    .eq("owner_id", user.id)
    .eq("id", invite.workspace_id)
    .maybeSingle();

  if (!workspace) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // Use the service-role client to mint a magic link without sending email
  const admin = createServiceClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://app-src-indol.vercel.app";

  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: invite.email,
    options: {
      redirectTo: `${siteUrl}/auth/callback`
    }
  });

  if (error || !data?.properties?.action_link) {
    console.error("[invite-link] generateLink failed", error?.message);
    // If the user doesn't exist in auth yet, generate a signup link instead
    const { data: signupData, error: signupError } = await admin.auth.admin.generateLink({
      type: "signup",
      email: invite.email,
      password: crypto.randomUUID(),
      options: {
        data: { full_name: invite.full_name, invited_as_client: true, invited_to_workspace: invite.workspace_id },
        redirectTo: `${siteUrl}/auth/callback`
      }
    });

    if (signupError || !signupData?.properties?.action_link) {
      console.error("[invite-link] signup generateLink also failed", signupError?.message);
      return NextResponse.json({ error: signupError?.message ?? error?.message ?? "failed" }, { status: 500 });
    }

    return NextResponse.json({ link: signupData.properties.action_link });
  }

  return NextResponse.json({ link: data.properties.action_link });
}

"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sendEmail } from "@/lib/resend";

function inviteEmailHtml(opts: { coachName: string; clientName: string; magicLink: string; workspaceName: string }) {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 520px; margin: 0 auto; padding: 32px; background: #ffffff; color: #0A0A0A;">
      <div style="text-align: center; margin-bottom: 28px;">
        <div style="display: inline-block; background: #0A0A0A; color: #ffffff; padding: 6px 14px; border-radius: 999px; font-size: 11px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase;">
          ${opts.workspaceName}
        </div>
      </div>
      <h1 style="font-size: 24px; font-weight: 800; letter-spacing: -0.02em; margin: 0 0 12px 0;">
        ${opts.clientName}, you are in.
      </h1>
      <p style="font-size: 15px; line-height: 1.6; color: #404040; margin: 0 0 20px 0;">
        ${opts.coachName} invited you to start coaching. Click the button below to sign in and fill out a short intake. Takes about 5 minutes.
      </p>
      <div style="text-align: center; margin: 28px 0;">
        <a href="${opts.magicLink}" style="display: inline-block; background: #00AEEF; color: #ffffff; text-decoration: none; padding: 14px 30px; border-radius: 12px; font-weight: 700; font-size: 15px;">
          Start your intake &rarr;
        </a>
      </div>
      <p style="font-size: 13px; line-height: 1.6; color: #737373; margin: 0;">
        The link signs you in automatically. No password required. If the button does not work, paste this link into your browser:<br />
        <span style="color: #404040; word-break: break-all;">${opts.magicLink}</span>
      </p>
    </div>
  `;
}

export async function inviteClient(formData: FormData) {
  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!fullName || !email) {
    redirect("/app/clients/new?error=missing");
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: workspace } = await supabase
    .from("workspace")
    .select("id, name, coach_name")
    .eq("owner_id", user.id)
    .single();

  if (!workspace) {
    redirect("/onboarding");
  }

  // Use service role for the invite read/write so we sidestep any RLS quirks
  // (e.g. stale policies that reference auth.users). We've already authorized
  // the coach above via supabase.auth.getUser() + workspace ownership.
  const service = createServiceClient();

  const { data: existingInvite } = await service
    .from("client_invite")
    .select("id, status")
    .eq("workspace_id", workspace.id)
    .ilike("email", email)
    .in("status", ["pending", "accepted"])
    .maybeSingle();

  if (existingInvite) {
    redirect("/app/clients/new?error=duplicate");
  }

  // Insert + capture the id immediately so we can always link to the share page
  const { data: created, error: insertError } = await service
    .from("client_invite")
    .insert({
      workspace_id: workspace.id,
      coach_id: user.id,
      email,
      full_name: fullName
    })
    .select("id")
    .single();

  if (insertError || !created) {
    console.error("[invite] client_invite insert failed", {
      message: insertError?.message,
      details: insertError?.details,
      code: insertError?.code
    });
    redirect("/app/clients/new?error=insert");
  }

  // Generate a magic link via service-role admin (does NOT send an email).
  // We send the email ourselves via Resend so Supabase's broken SMTP can't block us.
  const hdrs = await headers();
  const origin = hdrs.get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "https://bbapt.vercel.app";

  const { data: linkData, error: linkError } = await service.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: {
      redirectTo: `${origin}/auth/callback`,
      data: {
        full_name: fullName,
        invited_as_client: true,
        invited_to_workspace: workspace.id
      }
    }
  });

  if (linkError || !linkData?.properties?.action_link) {
    console.error("[invite] generateLink failed", linkError?.message);
    // Coach can still copy a token-based share link
    redirect(`/app/clients/invite/${created.id}?emailFailed=1`);
  }

  const magicLink = linkData.properties.action_link;

  const result = await sendEmail({
    to: email,
    subject: `${workspace.coach_name ?? "Your coach"} just invited you to coaching`,
    html: inviteEmailHtml({
      coachName: workspace.coach_name ?? "Your coach",
      clientName: fullName.split(" ")[0] ?? fullName,
      magicLink,
      workspaceName: workspace.name
    })
  });

  if (!result.ok) {
    console.error("[invite] Resend send failed", result.error);
    // Email send failed — coach can still copy the magic link manually
    redirect(`/app/clients/invite/${created.id}?emailFailed=1`);
  }

  redirect(`/app/clients/invite/${created.id}?emailSent=1`);
}

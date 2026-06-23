"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function cancelInvite(inviteId: string): Promise<void> {
  if (!inviteId) {
    redirect("/app/clients?error=cancel_no_id");
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  // Verify the caller owns the workspace this invite belongs to.
  const { data: invite } = await supabase
    .from("client_invite")
    .select("id, workspace_id, email")
    .eq("id", inviteId)
    .maybeSingle();

  if (!invite) {
    redirect("/app/clients?error=invite_not_found");
  }

  const { data: workspace } = await supabase
    .from("workspace")
    .select("id")
    .eq("owner_id", user.id)
    .eq("id", invite.workspace_id)
    .maybeSingle();

  if (!workspace) {
    redirect("/app/clients?error=forbidden");
  }

  // Hard delete the invite row. The coach explicitly removed it; no audit need.
  // Note: any auth.users row created during the signup flow may remain orphaned but
  // is harmless (no workspace, no role, lands on /onboarding if the user ever signs in).
  const service = createServiceClient();
  const { error: deleteError } = await service
    .from("client_invite")
    .delete()
    .eq("id", inviteId);

  if (deleteError) {
    console.error("[cancelInvite] delete failed", deleteError.message);
    redirect(`/app/clients/invite/${inviteId}?error=delete_failed`);
  }

  redirect("/app/clients?cancelled=1");
}

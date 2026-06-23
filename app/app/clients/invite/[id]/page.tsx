import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ShareLinkButton } from "./share-link-button";
import { CancelInviteButton } from "./cancel-invite-button";

export default async function InviteShareLinkPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ emailSent?: string; emailFailed?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: workspace } = await supabase
    .from("workspace")
    .select("id")
    .eq("owner_id", user!.id)
    .single();

  const { data: invite } = await supabase
    .from("client_invite")
    .select("id, full_name, email, status, created_at")
    .eq("id", id)
    .eq("workspace_id", workspace!.id)
    .maybeSingle();

  if (!invite) {
    notFound();
  }

  return (
    <main className="px-10 py-10 max-w-2xl">
      <Link href="/app/clients" className="text-sm text-[var(--color-muted)] hover:text-[var(--color-blue)]">
        &larr; Back to clients
      </Link>

      <header className="mt-4 mb-8">
        <div className="text-[11px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold mb-2">
          Invite created
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">{invite.full_name}</h1>
        <p className="text-[var(--color-muted)] mt-2">
          {invite.email}
        </p>
      </header>

      {sp.emailSent === "1" ? (
        <div className="mb-6 bg-[rgba(34,197,94,0.08)] border border-[rgba(34,197,94,0.3)] rounded-xl p-4 text-sm">
          Email sent. They&rsquo;ll get a magic link in their inbox.
        </div>
      ) : null}

      {sp.emailFailed === "1" ? (
        <div className="mb-6 bg-[rgba(245,158,11,0.08)] border border-[rgba(245,158,11,0.3)] rounded-xl p-4 text-sm">
          Email couldn&rsquo;t be sent (rate limit or Resend sandbox). Use the share link below instead.
        </div>
      ) : null}

      <section className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-6 mb-6">
        <h2 className="text-sm uppercase tracking-[1.5px] font-bold text-[var(--color-subtle)] mb-2">
          Share link
        </h2>
        <p className="text-sm text-[var(--color-muted)] mb-5">
          One-click sign-in link for <strong>{invite.full_name}</strong>. Copy and send via WhatsApp, SMS, or any channel you trust. Single-use, expires after they open it.
        </p>

        <ShareLinkButton inviteId={invite.id} />
      </section>

      <div className="flex items-center gap-3 flex-wrap">
        <Link href="/app/clients" className="btn btn-ghost">Back to roster</Link>
        <CancelInviteButton inviteId={invite.id} fullName={invite.full_name} />
        <Link href="/app/clients/new" className="btn btn-primary ml-auto">Invite another</Link>
      </div>
    </main>
  );
}

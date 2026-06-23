import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TRAINER_ROLES } from "@/lib/trainer-access";
import { inviteTrainer, removeTrainer, updateTrainerRole } from "./actions";

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  trainer: "Trainer",
  assistant: "Assistant"
};

const ROLE_DESCRIPTIONS: Record<string, string> = {
  owner: "Full access to billing, settings, and team",
  trainer: "Can manage clients, programs, and content",
  assistant: "View-only access to clients"
};

export default async function TeamPage({
  searchParams
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const sp = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: workspace } = await supabase
    .from("workspace")
    .select("id, owner_id")
    .eq("owner_id", user!.id)
    .single();

  const { data: trainers } = await supabase
    .from("workspace_trainer")
    .select("id, invite_email, full_name, role, status, invited_at, accepted_at, user_id")
    .eq("workspace_id", workspace!.id)
    .order("invited_at", { ascending: false });

  return (
    <main className="px-10 py-10 max-w-3xl">
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold mb-2">
            Multi-coach
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">Team access</h1>
          <p className="text-[var(--color-muted)] mt-2">Invite other trainers and assistants to your workspace.</p>
        </div>
        <Link href="/app/team/workload" className="btn btn-ghost text-sm shrink-0">View workload &rarr;</Link>
      </header>

      {sp.saved === "1" ? <div className="mb-6 bg-[rgba(34,197,94,0.08)] border border-[rgba(34,197,94,0.3)] rounded-xl p-4 text-sm">Saved.</div> : null}
      {sp.error ? <div className="mb-6 bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.3)] rounded-xl p-4 text-sm">{sp.error}</div> : null}

      <form action={inviteTrainer} className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-6 mb-8 space-y-4">
        <h2 className="text-sm uppercase tracking-[1.5px] font-bold text-[var(--color-subtle)]">Invite a trainer</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" name="email" type="email" required placeholder="coach@example.com" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="full_name">Name (optional)</label>
            <input id="full_name" name="full_name" placeholder="Jane Coach" className="input" />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="role">Role</label>
          <select id="role" name="role" defaultValue="trainer" className="input">
            {TRAINER_ROLES.filter((r) => r !== "owner").map((r) => (
              <option key={r} value={r}>{ROLE_LABELS[r]} — {ROLE_DESCRIPTIONS[r]}</option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn btn-primary">Send invite</button>
      </form>

      <h2 className="text-sm uppercase tracking-[1.5px] font-bold text-[var(--color-subtle)] mb-3">
        Team ({(trainers?.length ?? 0) + 1})
      </h2>

      <div className="space-y-3">
        <div className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-5">
          <div className="flex items-baseline justify-between gap-3">
            <div>
              <div className="font-bold">{user!.email} <span className="text-xs text-[var(--color-blue-glow)] ml-2">You</span></div>
              <div className="text-xs text-[var(--color-muted)] mt-1">Workspace owner</div>
            </div>
            <div className="text-[10px] uppercase tracking-[1.5px] text-[var(--color-blue-glow)] font-bold">Owner</div>
          </div>
        </div>

        {(trainers ?? []).map((t) => (
          <div key={t.id} className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-5">
            <div className="flex items-baseline justify-between gap-3 mb-3">
              <div>
                <div className="font-bold">{t.full_name ?? t.invite_email}</div>
                <div className="text-xs text-[var(--color-muted)] mt-1">{t.invite_email}</div>
              </div>
              <div className={`text-[10px] uppercase tracking-[1.5px] font-bold ${t.status === "accepted" ? "text-[var(--color-blue-glow)]" : "text-[var(--color-warn)]"}`}>
                {t.status}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <form action={updateTrainerRole}>
                <input type="hidden" name="id" value={t.id} />
                <select name="role" defaultValue={t.role} className="input text-xs py-1 px-2">
                  {TRAINER_ROLES.filter((r) => r !== "owner").map((r) => (
                    <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                  ))}
                </select>
                <button type="submit" className="btn btn-ghost text-xs ml-2">Save role</button>
              </form>
              <form action={removeTrainer}>
                <input type="hidden" name="id" value={t.id} />
                <button type="submit" className="text-xs text-[var(--color-muted)] hover:text-[var(--color-danger)] px-2">Remove</button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

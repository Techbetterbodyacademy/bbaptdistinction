import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createGroup } from "./actions";

export default async function GroupsPage({
  searchParams
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const sp = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: workspace } = await supabase
    .from("workspace")
    .select("id")
    .eq("owner_id", user!.id)
    .single();

  const { data: groups } = await supabase
    .from("client_group")
    .select(`id, name, description, created_at, client_group_member(count)`)
    .eq("workspace_id", workspace!.id)
    .order("created_at", { ascending: false });

  return (
    <main className="px-10 py-10 max-w-5xl">
      <header className="mb-8">
        <div className="text-[11px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold mb-2">
          Cohort coaching
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">Groups</h1>
        <p className="text-[var(--color-muted)] mt-2">
          Bundle clients into cohorts (Monday morning crew, summer challenge, mastermind).
        </p>
      </header>

      {sp.saved === "1" ? (
        <div className="mb-6 bg-[rgba(34,197,94,0.08)] border border-[rgba(34,197,94,0.3)] rounded-xl p-4 text-sm">Group created.</div>
      ) : null}
      {sp.error ? (
        <div className="mb-6 bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.3)] rounded-xl p-4 text-sm">
          {sp.error === "name" ? "Name required" : "Could not save group."}
        </div>
      ) : null}

      <form action={createGroup} className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-6 mb-8 space-y-4">
        <h2 className="text-sm uppercase tracking-[1.5px] font-bold text-[var(--color-subtle)]">New group</h2>
        <div>
          <label className="label" htmlFor="name">Name</label>
          <input id="name" name="name" required placeholder="Monday morning crew" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="description">Description (optional)</label>
          <input id="description" name="description" placeholder="3-month cohort starting March" className="input" />
        </div>
        <button type="submit" className="btn btn-primary">Create group</button>
      </form>

      <h2 className="text-sm uppercase tracking-[1.5px] font-bold text-[var(--color-subtle)] mb-3">
        Existing groups ({groups?.length ?? 0})
      </h2>
      {(!groups || groups.length === 0) ? (
        <div className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-xl p-6 text-sm text-[var(--color-muted)]">
          No groups yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {groups.map((g) => {
            const memberCount = Array.isArray(g.client_group_member) ? g.client_group_member[0]?.count ?? 0 : 0;
            return (
              <Link
                key={g.id}
                href={`/app/groups/${g.id}`}
                className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-5 hover:border-[var(--color-blue)] transition-colors block"
              >
                <div className="font-bold mb-1">{g.name}</div>
                {g.description ? (
                  <div className="text-sm text-[var(--color-muted)] mb-2">{g.description}</div>
                ) : null}
                <div className="text-xs text-[var(--color-subtle)]">{memberCount} member{memberCount === 1 ? "" : "s"}</div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}

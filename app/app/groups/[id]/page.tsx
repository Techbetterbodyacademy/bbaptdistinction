import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { computeGroupRoster, type GroupMemberRow } from "@/lib/groups";
import { addMember, removeMember, deleteGroup } from "./actions";

export default async function GroupDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: workspace } = await supabase
    .from("workspace")
    .select("id")
    .eq("owner_id", user!.id)
    .single();

  const { data: group } = await supabase
    .from("client_group")
    .select("id, name, description, created_at")
    .eq("id", id)
    .eq("workspace_id", workspace!.id)
    .maybeSingle();

  if (!group) notFound();

  const [{ data: members }, { data: allClients }] = await Promise.all([
    supabase
      .from("client_group_member")
      .select("id, client_id, client:client_id(status, user_profile:user_id(full_name))")
      .eq("group_id", group.id),
    supabase
      .from("client_profile")
      .select("id, status, user_profile:user_id(full_name)")
      .eq("workspace_id", workspace!.id)
      .eq("status", "active")
  ]);

  const memberRows: GroupMemberRow[] = (members ?? []).map((m) => {
    const c = Array.isArray(m.client) ? m.client[0] : m.client;
    const profile = c ? (Array.isArray(c.user_profile) ? c.user_profile[0] : c.user_profile) : null;
    return {
      client_id: m.client_id,
      full_name: profile?.full_name ?? null,
      status: (c?.status as "active" | "paused" | "completed") ?? "active"
    };
  });

  const roster = computeGroupRoster(memberRows);

  const memberIds = new Set(memberRows.map((m) => m.client_id));
  const available = (allClients ?? []).filter((c) => !memberIds.has(c.id));

  return (
    <main className="px-10 py-10 max-w-3xl">
      <Link href="/app/groups" className="text-sm text-[var(--color-muted)] hover:text-[var(--color-blue)]">
        &larr; All groups
      </Link>

      <header className="mt-4 mb-8">
        <div className="text-[11px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold mb-2">
          Group
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">{group.name}</h1>
        {group.description ? (
          <p className="text-[var(--color-muted)] mt-2">{group.description}</p>
        ) : null}
      </header>

      <section className="grid grid-cols-3 gap-3 mb-8">
        <Stat label="Total" value={roster.total} />
        <Stat label="Active" value={roster.active} />
        <Stat label="Paused" value={roster.paused} />
      </section>

      <section className="mb-8">
        <h2 className="text-sm uppercase tracking-[1.5px] font-bold text-[var(--color-subtle)] mb-3">
          Members ({roster.total})
        </h2>
        {roster.members.length === 0 ? (
          <div className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-xl p-6 text-sm text-[var(--color-muted)]">
            No members yet. Add from the list below.
          </div>
        ) : (
          <div className="space-y-2">
            {roster.members.map((m) => {
              const member = members?.find((mm) => mm.client_id === m.client_id);
              return (
                <form key={m.client_id} action={removeMember} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)]">
                  <input type="hidden" name="group_id" value={group.id} />
                  <input type="hidden" name="member_id" value={member?.id ?? ""} />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{m.full_name ?? "Unnamed"}</div>
                    <div className="text-xs text-[var(--color-muted)] capitalize">{m.status}</div>
                  </div>
                  <button type="submit" className="text-xs text-[var(--color-muted)] hover:text-[var(--color-danger)]">
                    Remove
                  </button>
                </form>
              );
            })}
          </div>
        )}
      </section>

      {available.length > 0 ? (
        <section className="mb-8">
          <h2 className="text-sm uppercase tracking-[1.5px] font-bold text-[var(--color-subtle)] mb-3">
            Add a member
          </h2>
          <form action={addMember} className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-5 space-y-3">
            <input type="hidden" name="group_id" value={group.id} />
            <select name="client_id" required className="input">
              {available.map((c) => {
                const profile = Array.isArray(c.user_profile) ? c.user_profile[0] : c.user_profile;
                return (
                  <option key={c.id} value={c.id}>
                    {profile?.full_name ?? "Unnamed"}
                  </option>
                );
              })}
            </select>
            <button type="submit" className="btn btn-primary">Add to group</button>
          </form>
        </section>
      ) : null}

      <form action={deleteGroup} className="bg-[var(--color-surface)] border border-[rgba(239,68,68,0.2)] rounded-2xl p-5">
        <input type="hidden" name="group_id" value={group.id} />
        <div className="flex items-center justify-between gap-4">
          <div className="text-sm text-[var(--color-muted)]">Delete this group (members keep their client profiles).</div>
          <button type="submit" className="btn btn-ghost border-[rgba(239,68,68,0.4)] text-[var(--color-danger)]">
            Delete
          </button>
        </div>
      </form>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-xl p-4">
      <div className="text-[10px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold mb-1">{label}</div>
      <div className="text-2xl font-extrabold">{value}</div>
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { assignHabit, unassignHabit } from "./actions";

export default async function ClientHabitsPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const { id: clientId } = await params;
  const sp = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: workspace } = await supabase
    .from("workspace")
    .select("id")
    .eq("owner_id", user!.id)
    .single();

  const { data: client } = await supabase
    .from("client_profile")
    .select("id, user_profile:user_id(full_name)")
    .eq("id", clientId)
    .eq("workspace_id", workspace!.id)
    .maybeSingle();

  if (!client) notFound();

  const [{ data: assignments }, { data: library }] = await Promise.all([
    supabase
      .from("habit_assignment")
      .select("id, frequency, target_value, target_unit, status, assigned_at, habit:habit_id(id, name, category, description)")
      .eq("client_id", client.id)
      .order("assigned_at", { ascending: false }),
    supabase
      .from("habit")
      .select("id, name, category, default_frequency, default_target_value, default_target_unit")
      .eq("workspace_id", workspace!.id)
      .order("name")
  ]);

  const assignedHabitIds = new Set((assignments ?? []).map((a) => {
    const h = Array.isArray(a.habit) ? a.habit[0] : a.habit;
    return h?.id;
  }).filter(Boolean));
  const available = (library ?? []).filter((h) => !assignedHabitIds.has(h.id));

  const profile = Array.isArray(client.user_profile) ? client.user_profile[0] : client.user_profile;
  const name = profile?.full_name ?? "Client";

  return (
    <main className="px-10 py-10 max-w-4xl">
      <Link href={`/app/clients/${clientId}`} className="text-sm text-[var(--color-muted)] hover:text-[var(--color-blue)]">
        &larr; {name}
      </Link>
      <header className="mt-4 mb-8">
        <div className="text-[11px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold mb-2">
          Habits
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">{name}&rsquo;s habits</h1>
      </header>

      {sp.saved === "1" ? (
        <div className="mb-6 bg-[rgba(34,197,94,0.08)] border border-[rgba(34,197,94,0.3)] rounded-xl p-4 text-sm">Saved.</div>
      ) : null}

      <section className="mb-10">
        <h2 className="text-sm uppercase tracking-[1.5px] font-bold text-[var(--color-subtle)] mb-3">
          Currently assigned ({assignments?.length ?? 0})
        </h2>
        {(!assignments || assignments.length === 0) ? (
          <div className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-xl p-6 text-sm text-[var(--color-muted)]">
            No habits assigned yet.
          </div>
        ) : (
          <div className="space-y-2">
            {assignments.map((a) => {
              const h = Array.isArray(a.habit) ? a.habit[0] : a.habit;
              return (
                <form key={a.id} action={unassignHabit} className="flex items-center justify-between gap-4 p-4 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)]">
                  <input type="hidden" name="client_id" value={clientId} />
                  <input type="hidden" name="assignment_id" value={a.id} />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold">{h?.name}</div>
                    <div className="text-xs text-[var(--color-muted)] mt-0.5">
                      <span className="capitalize">{a.frequency}</span>
                      {a.target_value && a.target_unit ? ` · ${a.target_value} ${a.target_unit}` : ""}
                      {h?.category ? ` · ${h.category}` : ""}
                    </div>
                  </div>
                  <button type="submit" className="btn btn-ghost text-sm">Unassign</button>
                </form>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-sm uppercase tracking-[1.5px] font-bold text-[var(--color-subtle)] mb-3">
          Assign from library
        </h2>
        {available.length === 0 ? (
          <div className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-xl p-6 text-sm">
            {(library?.length ?? 0) === 0 ? (
              <>Your habit library is empty. <Link href="/app/habits/new" className="text-[var(--color-blue-glow)] font-semibold">Create one</Link> first.</>
            ) : (
              <>All library habits are already assigned to this client.</>
            )}
          </div>
        ) : (
          <form action={assignHabit} className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-6 space-y-4">
            <input type="hidden" name="client_id" value={clientId} />
            <div>
              <label className="label" htmlFor="habit_id">Habit</label>
              <select id="habit_id" name="habit_id" required className="input">
                {available.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}{h.category ? ` · ${h.category}` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="label" htmlFor="frequency">Frequency</label>
                <select id="frequency" name="frequency" defaultValue="daily" className="input">
                  <option value="daily">Daily</option>
                  <option value="weekdays">Weekdays only</option>
                  <option value="weekly">Weekly</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              <div>
                <label className="label" htmlFor="target_value">Target value (optional)</label>
                <input id="target_value" name="target_value" type="number" step="0.1" className="input" />
              </div>
              <div>
                <label className="label" htmlFor="target_unit">Unit</label>
                <input id="target_unit" name="target_unit" type="text" className="input" />
              </div>
            </div>
            <button type="submit" className="btn btn-primary">Assign</button>
          </form>
        )}
      </section>
    </main>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { assignProgram, unassignProgram } from "./actions";

export default async function AssignProgramPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ assigned?: string; error?: string }>;
}) {
  const { id: programId } = await params;
  const sp = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: workspace } = await supabase
    .from("workspace")
    .select("id")
    .eq("owner_id", user!.id)
    .single();

  const { data: program } = await supabase
    .from("program")
    .select("id, name, status, weeks")
    .eq("id", programId)
    .eq("workspace_id", workspace!.id)
    .maybeSingle();

  if (!program) {
    notFound();
  }

  const [{ data: clients }, { data: assignments }] = await Promise.all([
    supabase
      .from("client_profile")
      .select("id, status, user_profile:user_id(full_name)")
      .eq("workspace_id", workspace!.id)
      .eq("status", "active")
      .order("created_at", { ascending: false }),
    supabase
      .from("program_assignment")
      .select("id, client_id, start_date, status, client:client_id(id, user_profile:user_id(full_name))")
      .eq("program_id", program.id)
      .eq("status", "active")
  ]);

  const assignedClientIds = new Set((assignments ?? []).map((a) => a.client_id));
  const unassignedClients = (clients ?? []).filter((c) => !assignedClientIds.has(c.id));

  return (
    <main className="px-10 py-10 max-w-3xl">
      <Link href={`/app/programs/${programId}`} className="text-sm text-[var(--color-muted)] hover:text-[var(--color-blue)]">
        &larr; Back to {program.name}
      </Link>

      <header className="mt-4 mb-8">
        <div className="text-[11px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold mb-2">
          Assign program
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">{program.name}</h1>
        <p className="text-[var(--color-muted)] mt-2">
          {program.weeks} weeks · {program.status}
        </p>
      </header>

      {sp.assigned === "1" ? (
        <div className="mb-6 bg-[rgba(34,197,94,0.08)] border border-[rgba(34,197,94,0.3)] rounded-xl p-4 text-sm">
          Assigned. Your client can see the program now.
        </div>
      ) : null}

      <section className="mb-10">
        <h2 className="text-sm uppercase tracking-[1.5px] font-bold text-[var(--color-subtle)] mb-4">
          Currently assigned ({assignments?.length ?? 0})
        </h2>
        {(!assignments || assignments.length === 0) ? (
          <div className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-xl p-6 text-sm text-[var(--color-muted)]">
            Not assigned to anyone yet.
          </div>
        ) : (
          <div className="space-y-2">
            {assignments.map((a) => {
              const client = Array.isArray(a.client) ? a.client[0] : a.client;
              const profile = Array.isArray(client?.user_profile) ? client?.user_profile[0] : client?.user_profile;
              return (
                <form
                  key={a.id}
                  action={unassignProgram}
                  className="flex items-center justify-between gap-4 p-4 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)]"
                >
                  <input type="hidden" name="program_id" value={programId} />
                  <input type="hidden" name="assignment_id" value={a.id} />
                  <div>
                    <div className="font-semibold">{profile?.full_name ?? "Unnamed"}</div>
                    <div className="text-xs text-[var(--color-muted)] mt-0.5">
                      Started {new Date(a.start_date).toLocaleDateString()}
                    </div>
                  </div>
                  <button type="submit" className="btn btn-ghost text-sm">
                    Unassign
                  </button>
                </form>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-sm uppercase tracking-[1.5px] font-bold text-[var(--color-subtle)] mb-4">
          Assign to a client
        </h2>
        {unassignedClients.length === 0 ? (
          <div className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-xl p-6 text-sm text-[var(--color-muted)]">
            Every active client already has this program.
          </div>
        ) : (
          <form action={assignProgram} className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-6 space-y-4">
            <input type="hidden" name="program_id" value={programId} />
            <div>
              <label className="label" htmlFor="client_id">Client</label>
              <select id="client_id" name="client_id" required className="input">
                {unassignedClients.map((c) => {
                  const profile = Array.isArray(c.user_profile) ? c.user_profile[0] : c.user_profile;
                  return (
                    <option key={c.id} value={c.id}>
                      {profile?.full_name ?? "Unnamed"}
                    </option>
                  );
                })}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="start_date">Start date</label>
              <input
                id="start_date"
                name="start_date"
                type="date"
                defaultValue={new Date().toISOString().slice(0, 10)}
                required
                className="input"
              />
            </div>
            {sp.error ? <div className="text-sm text-[var(--color-danger)]">Could not assign. Try again.</div> : null}
            <button type="submit" className="btn btn-primary">Assign program</button>
          </form>
        )}
      </section>
    </main>
  );
}

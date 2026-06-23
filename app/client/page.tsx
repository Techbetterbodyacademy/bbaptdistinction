import { createClient } from "@/lib/supabase/server";

export default async function ClientHomePage({
  searchParams
}: {
  searchParams: Promise<{ welcome?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("user_profile")
    .select("workspace_id, full_name")
    .eq("id", user!.id)
    .single();

  if (!profile) {
    return null;
  }

  const { data: workspace } = await supabase
    .from("workspace")
    .select("coach_name")
    .eq("id", profile.workspace_id)
    .single();

  const { data: client } = await supabase
    .from("client_profile")
    .select("id, status, current_weight_kg, start_weight_kg")
    .eq("user_id", user!.id)
    .maybeSingle();

  return (
    <main className="max-w-3xl mx-auto px-6 py-12">
      {params.welcome === "1" ? (
        <div className="mb-8 bg-[rgba(0,174,239,0.08)] border border-[var(--color-blue)] rounded-xl p-5">
          <div className="font-bold mb-1">You&rsquo;re in.</div>
          <p className="text-sm text-[var(--color-muted)]">
            {workspace?.coach_name ?? "Your coach"} just got your intake. They&rsquo;ll reach out within 48 hours with a starter plan.
          </p>
        </div>
      ) : null}

      <header className="mb-10">
        <div className="text-[11px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold mb-2">
          Your coaching home
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">
          Welcome to coaching, <span className="text-[var(--color-blue-glow)]">{profile.full_name?.split(" ")[0] ?? "friend"}</span>.
        </h1>
        <p className="text-[var(--color-muted)] mt-3 max-w-xl">
          Your workouts, check-ins, and progress will land here. Your coach is reviewing your intake now.
        </p>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-10">
        <StatCard
          label="Status"
          value={client?.status ?? "Pending"}
          capitalize
        />
        <StatCard
          label="Start weight"
          value={client?.start_weight_kg ? `${client.start_weight_kg} kg` : "—"}
        />
        <StatCard
          label="Coach"
          value={workspace?.coach_name ?? "—"}
        />
      </section>

      <section className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-7">
        <h2 className="text-lg font-bold mb-2">What happens next</h2>
        <ol className="space-y-3 text-sm text-[var(--color-muted)]">
          <li className="flex gap-3">
            <span className="shrink-0 w-7 h-7 rounded-full bg-[rgba(0,174,239,0.15)] text-[var(--color-blue-glow)] font-extrabold flex items-center justify-center text-xs">
              1
            </span>
            <span>Your coach reads your intake and builds your first program. You&rsquo;ll get a notification when it&rsquo;s ready.</span>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 w-7 h-7 rounded-full bg-[rgba(0,174,239,0.15)] text-[var(--color-blue-glow)] font-extrabold flex items-center justify-center text-xs">
              2
            </span>
            <span>You start logging workouts and weekly check-ins right here.</span>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 w-7 h-7 rounded-full bg-[rgba(0,174,239,0.15)] text-[var(--color-blue-glow)] font-extrabold flex items-center justify-center text-xs">
              3
            </span>
            <span>Coach reviews check-ins, adjusts the program, repeats every week.</span>
          </li>
        </ol>
      </section>
    </main>
  );
}

function StatCard({
  label,
  value,
  capitalize
}: {
  label: string;
  value: string;
  capitalize?: boolean;
}) {
  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-xl p-5">
      <div className="text-[10px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold mb-1">
        {label}
      </div>
      <div className={`text-xl font-extrabold ${capitalize ? "capitalize" : ""}`}>{value}</div>
    </div>
  );
}

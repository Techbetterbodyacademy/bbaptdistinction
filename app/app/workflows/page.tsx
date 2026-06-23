import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createWorkflow, toggleWorkflow, deleteWorkflow } from "./actions";
import { WORKFLOW_TRIGGERS, WORKFLOW_ACTIONS } from "@/lib/workflows";

const TRIGGER_LABELS: Record<string, string> = {
  client_added: "New client joins",
  client_paused: "Client paused",
  client_completed: "Client completed program",
  checkin_overdue: "Check-in overdue",
  workout_missed: "Workout missed",
  habit_streak_broken: "Habit streak broken"
};

const ACTION_LABELS: Record<string, string> = {
  send_message: "Send message",
  notify_coach: "Notify me",
  create_task: "Create task"
};

export default async function WorkflowsPage({
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

  const { data: workflows } = await supabase
    .from("workflow")
    .select("id, name, trigger, action, template, enabled, created_at")
    .eq("workspace_id", workspace!.id)
    .order("created_at", { ascending: false });

  return (
    <main className="px-10 py-10 max-w-4xl">
      <header className="mb-8">
        <div className="text-[11px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold mb-2">
          Automation
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">Workflows</h1>
        <p className="text-[var(--color-muted)] mt-2">
          When this happens, do that. Available tokens in templates: {`{{client_name}}, {{workspace_name}}, {{coach_name}}`}.
        </p>
      </header>

      {sp.saved === "1" ? (
        <div className="mb-6 bg-[rgba(34,197,94,0.08)] border border-[rgba(34,197,94,0.3)] rounded-xl p-4 text-sm">Saved.</div>
      ) : null}
      {sp.error ? (
        <div className="mb-6 bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.3)] rounded-xl p-4 text-sm">{sp.error}</div>
      ) : null}

      <form action={createWorkflow} className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-6 mb-8 space-y-4">
        <h2 className="text-sm uppercase tracking-[1.5px] font-bold text-[var(--color-subtle)]">New workflow</h2>
        <div>
          <label className="label" htmlFor="name">Name</label>
          <input id="name" name="name" required placeholder="Welcome new clients" className="input" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="trigger">When</label>
            <select id="trigger" name="trigger" className="input">
              {WORKFLOW_TRIGGERS.map((t) => (
                <option key={t} value={t}>{TRIGGER_LABELS[t]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="action">Do</label>
            <select id="action" name="action" className="input">
              {WORKFLOW_ACTIONS.map((a) => (
                <option key={a} value={a}>{ACTION_LABELS[a]}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="label" htmlFor="template">Template</label>
          <textarea
            id="template"
            name="template"
            rows={3}
            required
            placeholder="Hi {{client_name}}, welcome to {{workspace_name}}. Glad to have you on board."
            className="input resize-y"
          />
        </div>
        <button type="submit" className="btn btn-primary">Create workflow</button>
      </form>

      <h2 className="text-sm uppercase tracking-[1.5px] font-bold text-[var(--color-subtle)] mb-3">
        Existing workflows ({workflows?.length ?? 0})
      </h2>
      {(!workflows || workflows.length === 0) ? (
        <div className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-xl p-6 text-sm text-[var(--color-muted)]">
          None yet.
        </div>
      ) : (
        <div className="space-y-3">
          {workflows.map((w) => (
            <div key={w.id} className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-5">
              <div className="flex items-baseline justify-between gap-3 mb-2">
                <div className="font-semibold">{w.name}</div>
                <div className={`text-[10px] uppercase tracking-[1.5px] font-bold ${w.enabled ? "text-[var(--color-blue-glow)]" : "text-[var(--color-subtle)]"}`}>
                  {w.enabled ? "Enabled" : "Disabled"}
                </div>
              </div>
              <div className="text-sm text-[var(--color-muted)] mb-2">
                When <strong className="text-[var(--color-ink)]">{TRIGGER_LABELS[w.trigger]}</strong>, {ACTION_LABELS[w.action].toLowerCase()}:
              </div>
              <div className="text-sm bg-[rgba(255,255,255,0.03)] rounded-lg p-3 mb-3 whitespace-pre-wrap">{w.template}</div>
              <div className="flex items-center gap-2">
                <form action={toggleWorkflow}>
                  <input type="hidden" name="id" value={w.id} />
                  <input type="hidden" name="enabled" value={w.enabled ? "false" : "true"} />
                  <button type="submit" className="btn btn-ghost text-xs">
                    {w.enabled ? "Disable" : "Enable"}
                  </button>
                </form>
                <form action={deleteWorkflow}>
                  <input type="hidden" name="id" value={w.id} />
                  <button type="submit" className="text-xs text-[var(--color-muted)] hover:text-[var(--color-danger)] px-3 py-2">
                    Delete
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}

      <Link href="/app" className="text-sm text-[var(--color-muted)] hover:text-[var(--color-blue)] mt-8 inline-block">
        &larr; Back to dashboard
      </Link>
    </main>
  );
}

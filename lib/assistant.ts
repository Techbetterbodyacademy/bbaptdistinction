export type PrepareResult =
  | { ok: true; question: string }
  | { ok: false; error: string };

const MAX_QUESTION = 1000;

export function prepareAssistantQuery(raw: string): PrepareResult {
  const q = raw.trim();
  if (!q) return { ok: false, error: "question required" };
  if (q.length > MAX_QUESTION) return { ok: false, error: "question too long" };
  return { ok: true, question: q };
}

export type ClientSummary = {
  full_name: string;
  status: "active" | "paused" | "completed";
  last_checkin_at: string | null;
};

export type ProgramSummary = {
  name: string;
  weeks: number;
};

export type WorkspaceSnapshot = {
  workspaceName: string;
  clients: ClientSummary[];
  programs: ProgramSummary[];
  recentWorkouts: number;
  overdueCheckins: number;
};

const MAX_CONTEXT = 4000;

export function buildWorkspaceContext(snapshot: WorkspaceSnapshot): string {
  const lines: string[] = [];
  lines.push(`Workspace: ${snapshot.workspaceName}`);
  lines.push(
    `${snapshot.clients.length} client${snapshot.clients.length === 1 ? "" : "s"}, ` +
    `${snapshot.programs.length} program${snapshot.programs.length === 1 ? "" : "s"}, ` +
    `${snapshot.recentWorkouts} workouts logged in the last 7 days, ` +
    `${snapshot.overdueCheckins} overdue check-in${snapshot.overdueCheckins === 1 ? "" : "s"}.`
  );

  if (snapshot.clients.length > 0) {
    lines.push("");
    lines.push("Clients:");
    for (const c of snapshot.clients) {
      const lastCheckin = c.last_checkin_at ? new Date(c.last_checkin_at).toISOString().slice(0, 10) : "never";
      lines.push(`- ${c.full_name} (${c.status}, last check-in ${lastCheckin})`);
    }
  }

  if (snapshot.programs.length > 0) {
    lines.push("");
    lines.push("Programs:");
    for (const p of snapshot.programs) {
      lines.push(`- ${p.name} (${p.weeks} weeks)`);
    }
  }

  let context = lines.join("\n");
  if (context.length > MAX_CONTEXT) {
    context = context.slice(0, MAX_CONTEXT - 30) + "\n[truncated due to size]";
  }
  return context;
}

const SYSTEM_PROMPT = `You are the BBA Coaching assistant for a Better Body Academy coach.

VOICE
- Direct, plainspoken, slightly Aussie. No fluff.
- NEVER use em-dashes or en-dashes. Use periods, commas, or colons.
- Keep answers to 1-3 short paragraphs unless a list is requested.

ANSWER STYLE
- Reference specific clients, programs, or numbers from the context when available.
- If the context lacks the answer, say so plainly. Do not invent data.
- Suggest one concrete next action when relevant.`;

export type AssistantMessage = { role: "system" | "user"; content: string };

export function buildAssistantPrompt(input: { question: string; context: string }): AssistantMessage[] {
  const user = `WORKSPACE CONTEXT:\n${input.context}\n\nQUESTION:\n${input.question}`;
  return [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: user }
  ];
}

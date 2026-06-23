export const WORKFLOW_TRIGGERS = [
  "client_added",
  "client_paused",
  "client_completed",
  "checkin_overdue",
  "workout_missed",
  "habit_streak_broken"
] as const;
export type WorkflowTrigger = typeof WORKFLOW_TRIGGERS[number];

export const WORKFLOW_ACTIONS = ["send_message", "notify_coach", "create_task"] as const;
export type WorkflowAction = typeof WORKFLOW_ACTIONS[number];

export type WorkflowInput = {
  name: string;
  trigger: WorkflowTrigger;
  action: WorkflowAction;
  template: string;
};

export type WorkflowRecord = WorkflowInput;

export type WorkflowDef = WorkflowInput & { enabled: boolean };

export type WorkflowEvent = {
  type: WorkflowTrigger;
  data: Record<string, string>;
};

export type PrepareResult =
  | { ok: true; record: WorkflowRecord }
  | { ok: false; error: string };

export function prepareWorkflowInput(input: WorkflowInput): PrepareResult {
  const name = input.name.trim();
  if (!name) return { ok: false, error: "name required" };
  if (!WORKFLOW_TRIGGERS.includes(input.trigger)) {
    return { ok: false, error: "trigger invalid" };
  }
  if (!WORKFLOW_ACTIONS.includes(input.action)) {
    return { ok: false, error: "action invalid" };
  }
  const template = input.template.trim();
  if (!template) return { ok: false, error: "template required" };
  return {
    ok: true,
    record: { name, trigger: input.trigger, action: input.action, template }
  };
}

export type EvaluateResult =
  | { matched: true; action: WorkflowAction; rendered: string }
  | { matched: false };

export function evaluateWorkflow(def: WorkflowDef, event: WorkflowEvent): EvaluateResult {
  if (!def.enabled) return { matched: false };
  if (def.trigger !== event.type) return { matched: false };
  const rendered = renderTemplate(def.template, event.data);
  return { matched: true, action: def.action, rendered };
}

export function renderTemplate(template: string, data: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
    return key in data ? data[key] : match;
  });
}

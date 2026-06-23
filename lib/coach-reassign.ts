export type CoachReassignInput = {
  client_id: string;
  coach_id: string;
  workspace_owner_id: string;
  accepted_trainer_ids: string[];
};

export type PrepareResult =
  | { ok: true }
  | { ok: false; error: string };

export function prepareCoachReassign(input: CoachReassignInput): PrepareResult {
  if (!input.client_id) return { ok: false, error: "client_id required" };
  if (!input.coach_id) return { ok: false, error: "coach_id required" };

  const isOwner = input.coach_id === input.workspace_owner_id;
  const isAcceptedTrainer = input.accepted_trainer_ids.includes(input.coach_id);

  if (!isOwner && !isAcceptedTrainer) {
    return { ok: false, error: "coach_id is not a valid coach in this workspace" };
  }

  return { ok: true };
}

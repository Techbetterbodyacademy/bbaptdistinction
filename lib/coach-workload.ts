import type { LifecycleStage } from "./jase-watches";
import type { RiskLevel } from "./at-risk";

export type Coach = {
  user_id: string;
  name: string;
};

export type CoachAssignment = {
  coach_id: string | null;
  lifecycle_stage: LifecycleStage;
  risk_level: RiskLevel;
};

export type WorkloadRow = {
  coach_id: string | null;
  name: string;
  total: number;
  active: number;
  offboarded: number;
  atRiskMedium: number;
  atRiskHigh: number;
  atRiskTotal: number;
};

const UNASSIGNED: string = "__unassigned__";

export function computeCoachWorkload(coaches: Coach[], clients: CoachAssignment[]): WorkloadRow[] {
  if (coaches.length === 0 && clients.length === 0) return [];

  const buckets = new Map<string, WorkloadRow>();
  for (const c of coaches) {
    buckets.set(c.user_id, {
      coach_id: c.user_id,
      name: c.name,
      total: 0,
      active: 0,
      offboarded: 0,
      atRiskMedium: 0,
      atRiskHigh: 0,
      atRiskTotal: 0
    });
  }

  for (const cl of clients) {
    const key = cl.coach_id ?? UNASSIGNED;
    let row = buckets.get(key);
    if (!row) {
      row = {
        coach_id: cl.coach_id,
        name: cl.coach_id ? `Coach ${cl.coach_id.slice(0, 6)}` : "Unassigned",
        total: 0,
        active: 0,
        offboarded: 0,
        atRiskMedium: 0,
        atRiskHigh: 0,
        atRiskTotal: 0
      };
      buckets.set(key, row);
    }
    row.total++;
    if (cl.lifecycle_stage === "offboarded") row.offboarded++;
    else row.active++;
    if (cl.risk_level === "medium") {
      row.atRiskMedium++;
      row.atRiskTotal++;
    } else if (cl.risk_level === "high") {
      row.atRiskHigh++;
      row.atRiskTotal++;
    }
  }

  return Array.from(buckets.values()).sort((a, b) => b.active - a.active);
}

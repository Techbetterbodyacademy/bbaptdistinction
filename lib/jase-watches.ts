export type LifecycleStage =
  | "onboarding"
  | "kickoff"
  | "momentum"
  | "celebration"
  | "challenge_upgrade"
  | "catchup_call"
  | "retreat"
  | "offboarded"
  | "renewed";

export type ClientStageRow = {
  lifecycle_stage: LifecycleStage;
};

export type JaseWatches = {
  total: number;
  churnedCount: number;
  retainedCount: number;
  renewedCount: number;
  pastOnboardingCount: number;
  churnRate: number; // percentage 0-100 with 1 decimal
  retentionRate: number;
  renewalRate: number;
  offboardingTotal: number;
};

const CHURNED_STAGES = new Set<LifecycleStage>(["offboarded"]);

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function computeJaseWatches(rows: ClientStageRow[]): JaseWatches {
  const total = rows.length;
  if (total === 0) {
    return {
      total: 0,
      churnedCount: 0,
      retainedCount: 0,
      renewedCount: 0,
      pastOnboardingCount: 0,
      churnRate: 0,
      retentionRate: 0,
      renewalRate: 0,
      offboardingTotal: 0
    };
  }

  let churnedCount = 0;
  let renewedCount = 0;
  let onboardingCount = 0;
  for (const r of rows) {
    if (CHURNED_STAGES.has(r.lifecycle_stage)) churnedCount++;
    if (r.lifecycle_stage === "renewed") renewedCount++;
    if (r.lifecycle_stage === "onboarding") onboardingCount++;
  }
  const retainedCount = total - churnedCount;
  const pastOnboardingCount = total - onboardingCount;

  return {
    total,
    churnedCount,
    retainedCount,
    renewedCount,
    pastOnboardingCount,
    churnRate: round1((churnedCount / total) * 100),
    retentionRate: round1((retainedCount / total) * 100),
    renewalRate: pastOnboardingCount === 0 ? 0 : round1((renewedCount / pastOnboardingCount) * 100),
    offboardingTotal: churnedCount
  };
}

export function formatPercent(value: number): string {
  if (value === 0) return "0%";
  if (value === 100) return "100%";
  return `${round1(value)}%`;
}

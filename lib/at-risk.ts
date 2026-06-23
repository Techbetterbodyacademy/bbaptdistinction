import type { LifecycleStage } from "./jase-watches";

export type RiskInput = {
  lifecycle_stage: LifecycleStage;
  days_since_checkin: number;
  days_since_session: number;
  sessions_last_7d: number;
  expected_weekly_sessions: number;
  days_since_client_message: number;
};

export type RiskLevel = "low" | "medium" | "high";

export type RiskResult = {
  score: number;
  level: RiskLevel;
  reasons: string[];
};

// Stages where churn risk doesn't apply
const TERMINAL: LifecycleStage[] = ["offboarded"];

// Onboarding clients are still finding their groove. Soften the score.
const SOFT_STAGES: LifecycleStage[] = ["onboarding"];

export function computeRiskScore(input: RiskInput): RiskResult {
  if (TERMINAL.includes(input.lifecycle_stage)) {
    return { score: 0, level: "low", reasons: [] };
  }

  let score = 0;
  const reasons: string[] = [];

  if (input.days_since_checkin >= 14) {
    score += 50;
    reasons.push(`No check-in in ${input.days_since_checkin} days`);
  } else if (input.days_since_checkin >= 7) {
    score += 30;
    reasons.push(`No check-in in ${input.days_since_checkin} days`);
  }

  if (input.expected_weekly_sessions > 0) {
    if (input.sessions_last_7d === 0) {
      score += 30;
      reasons.push(`0 workouts logged this week (expected ${input.expected_weekly_sessions})`);
    } else if (input.sessions_last_7d < input.expected_weekly_sessions / 2) {
      score += 15;
      reasons.push(`Only ${input.sessions_last_7d}/${input.expected_weekly_sessions} workouts this week`);
    }
  }

  if (input.days_since_client_message >= 14) {
    score += 20;
    reasons.push(`Silent for ${input.days_since_client_message} days`);
  }

  // Soften for onboarding clients
  if (SOFT_STAGES.includes(input.lifecycle_stage)) {
    score = Math.round(score * 0.6);
  }

  const level: RiskLevel = score >= 60 ? "high" : score >= 30 ? "medium" : "low";

  return { score, level, reasons };
}

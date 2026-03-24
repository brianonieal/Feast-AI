// @version 0.8.0 - Shield: @GUARDIAN agent types + cost monitoring

export type AgentName =
  | "@SAGE"
  | "@COORDINATOR"
  | "@COMMUNICATOR"
  | "@ANALYST"
  | "@STRATEGIST"
  | "@GUARDIAN";

export type ModelName =
  | "claude-opus-4-6"
  | "claude-sonnet-4-6"
  | "claude-haiku-4-5";

// Cost per 1K tokens in USD (as of March 2026)
export const MODEL_COSTS: Record<ModelName, { input: number; output: number }> =
  {
    "claude-opus-4-6": { input: 0.015, output: 0.075 },
    "claude-sonnet-4-6": { input: 0.003, output: 0.015 },
    "claude-haiku-4-5": { input: 0.00025, output: 0.00125 },
  };

export function estimateCost(
  model: ModelName,
  inputTokens: number,
  outputTokens: number
): number {
  const costs = MODEL_COSTS[model];
  const result =
    (inputTokens / 1000) * costs.input +
    (outputTokens / 1000) * costs.output;
  // Round to 8 decimal places to avoid floating point precision issues
  return Math.round(result * 1e8) / 1e8;
}

export interface SpendRecord {
  agent: AgentName;
  model: ModelName;
  action: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  durationMs: number;
  success: boolean;
  error?: string;
  correlationId?: string;
}

export interface DailySpendSummary {
  date: string; // YYYY-MM-DD
  totalCostUsd: number;
  byAgent: Record<string, number>;
  callCount: number;
  limitUsd: number;
  percentUsed: number;
  status: "normal" | "warning" | "critical" | "downgraded";
}

export const SPEND_LIMITS = {
  development: 5.0,
  production: 25.0,
  warningPct: 0.8, // 80% — send alert
  downgradePct: 0.9, // 90% — auto-downgrade to Haiku
} as const;

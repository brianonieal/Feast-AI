// @version 0.8.0 - Shield
// @GUARDIAN — cost monitoring, anomaly detection, system health

import { db } from "../../lib/db";
import { getTodaySpend, setModelOverride } from "../../lib/costTracker";
import { SPEND_LIMITS } from "@feast-ai/shared";
import type { DailySpendSummary } from "@feast-ai/shared";

const ENV = (process.env.NODE_ENV ?? "development") as
  | "development"
  | "production";
const DAILY_LIMIT: number =
  ENV === "production" ? SPEND_LIMITS.production : SPEND_LIMITS.development;

export async function getDailySpendSummary(): Promise<DailySpendSummary> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  today.setMinutes(0, 0, 0); // ensure exactly midnight
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const logs = await db.agentSpendLog.findMany({
    where: {
      createdAt: { gte: today, lt: tomorrow },
      environment: ENV,
    },
    select: { agent: true, costUsd: true },
  });

  const byAgent: Record<string, number> = {};
  let totalCostUsd = 0;

  for (const log of logs) {
    byAgent[log.agent] = (byAgent[log.agent] ?? 0) + log.costUsd;
    totalCostUsd += log.costUsd;
  }

  const percentUsed = totalCostUsd / DAILY_LIMIT;

  // Status cascade:
  // >= 90% (downgradePct) → 'downgraded'
  // >= 80% (warningPct)   → 'critical'
  // >= 50%                → 'warning'
  // else                  → 'normal'
  const status =
    percentUsed >= SPEND_LIMITS.downgradePct
      ? "downgraded"
      : percentUsed >= SPEND_LIMITS.warningPct
        ? "critical"
        : percentUsed >= 0.5
          ? "warning"
          : "normal";

  return {
    date: today.toISOString().split("T")[0] ?? "",
    totalCostUsd,
    byAgent,
    callCount: logs.length,
    limitUsd: DAILY_LIMIT,
    percentUsed,
    status,
  };
}

export async function runDailyReport(): Promise<DailySpendSummary> {
  const summary = await getDailySpendSummary();

  // Save to DailySpendReport table
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setMinutes(0, 0, 0);

  await db.dailySpendReport.upsert({
    where: { date },
    update: {
      totalCostUsd: summary.totalCostUsd,
      byAgent: summary.byAgent,
      callCount: summary.callCount,
      limitUsd: summary.limitUsd,
      percentUsed: summary.percentUsed,
    },
    create: {
      date,
      totalCostUsd: summary.totalCostUsd,
      byAgent: summary.byAgent,
      callCount: summary.callCount,
      limitUsd: summary.limitUsd,
      percentUsed: summary.percentUsed,
    },
  });

  console.log(
    `[@GUARDIAN] Daily report: $${summary.totalCostUsd.toFixed(4)} / $${DAILY_LIMIT} (${(summary.percentUsed * 100).toFixed(1)}%)`
  );
  console.log(`[@GUARDIAN] By agent:`, summary.byAgent);

  return summary;
}

export async function downgradeAllAgents(reason: string): Promise<void> {
  console.warn(`[@GUARDIAN] Downgrading all agents. Reason: ${reason}`);
  setModelOverride("claude-haiku-4-5");

  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setMinutes(0, 0, 0);

  // Single call to getTodaySpend to avoid double DB hit
  const currentSpend = await getTodaySpend();

  await db.dailySpendReport.upsert({
    where: { date },
    update: { downgradedAt: new Date() },
    create: {
      date,
      totalCostUsd: currentSpend,
      byAgent: {},
      callCount: 0,
      limitUsd: DAILY_LIMIT,
      percentUsed: currentSpend / DAILY_LIMIT,
      downgradedAt: new Date(),
    },
  });
}

export async function restoreAgentModels(): Promise<void> {
  console.log(
    "[@GUARDIAN] Restoring agent models to configured defaults."
  );
  setModelOverride(null);
}

// @version 0.8.0 - Shield
// Wraps Anthropic API calls with automatic cost logging
// Use this instead of calling client.messages.create() directly

import Anthropic from "@anthropic-ai/sdk";
import { db } from "./db";
import { estimateCost, SPEND_LIMITS } from "@feast-ai/shared";
import type { AgentName, ModelName, SpendRecord } from "@feast-ai/shared";

const client = new Anthropic();

const ENV = (process.env.NODE_ENV ?? "development") as
  | "development"
  | "production";
const DAILY_LIMIT: number =
  ENV === "production" ? SPEND_LIMITS.production : SPEND_LIMITS.development;

// NOTE: Module-level state. In serverless environments,
// this resets between cold starts. Acceptable for v0.8.0 --
// a persistent override mechanism can be added via Redis in v0.9.0.
let modelOverride: ModelName | null = null;

// Spend cache — avoids DB query on every AI call (60s TTL)
let cachedSpend = 0;
let cacheExpiry = 0;
const CACHE_TTL_MS = 60_000;

export function setModelOverride(model: ModelName | null) {
  modelOverride = model;
  if (model) {
    console.warn(
      `[@GUARDIAN] Model override active: all agents using ${model}`
    );
  } else {
    console.log(
      "[@GUARDIAN] Model override cleared -- agents using configured models"
    );
  }
}

export function getEffectiveModel(requestedModel: ModelName): ModelName {
  return modelOverride ?? requestedModel;
}

interface TrackedCallParams {
  agent: AgentName;
  model: ModelName;
  action: string;
  correlationId?: string;
  messages: Anthropic.MessageParam[];
  system?: string;
  maxTokens?: number;
  tools?: Anthropic.Tool[];
}

export async function trackedCall(
  params: TrackedCallParams
): Promise<Anthropic.Message> {
  const effectiveModel = getEffectiveModel(params.model);
  const start = Date.now();
  let success = true;
  let error: string | undefined;
  let response: Anthropic.Message | undefined;

  try {
    // Check if today's spend is already at limit before making the call
    const todaySpend = await getTodaySpend();
    if (todaySpend >= DAILY_LIMIT) {
      throw new Error(
        `[@GUARDIAN] Daily spend limit of $${DAILY_LIMIT} reached. ` +
          `Current spend: $${todaySpend.toFixed(4)}. Call blocked.`
      );
    }

    response = await client.messages.create({
      model: effectiveModel,
      max_tokens: params.maxTokens ?? 1024,
      system: params.system,
      messages: params.messages,
      tools: params.tools,
    });

    return response;
  } catch (err) {
    success = false;
    error = err instanceof Error ? err.message : String(err);
    throw err;
  } finally {
    const durationMs = Date.now() - start;
    const inputTokens = response?.usage?.input_tokens ?? 0;
    const outputTokens = response?.usage?.output_tokens ?? 0;
    const costUsd = estimateCost(effectiveModel, inputTokens, outputTokens);

    // Log spend asynchronously -- don't await, don't block the response
    logSpend({
      agent: params.agent,
      model: effectiveModel,
      action: params.action,
      inputTokens,
      outputTokens,
      costUsd,
      durationMs,
      success,
      error,
      correlationId: params.correlationId,
    }).catch((err) =>
      console.error("[@GUARDIAN] Failed to log spend:", err)
    );
  }
}

async function logSpend(record: SpendRecord): Promise<void> {
  await db.agentSpendLog.create({
    data: {
      agent: record.agent,
      model: record.model,
      action: record.action,
      inputTokens: record.inputTokens,
      outputTokens: record.outputTokens,
      costUsd: record.costUsd,
      durationMs: record.durationMs,
      success: record.success,
      error: record.error,
      correlationId: record.correlationId,
      environment: ENV,
    },
  });

  // Invalidate cache after new spend logged
  cacheExpiry = 0;

  // Check thresholds after logging
  const todaySpend = await getTodaySpend();
  const pct = todaySpend / DAILY_LIMIT;

  if (pct >= SPEND_LIMITS.downgradePct && !modelOverride) {
    console.warn(
      `[@GUARDIAN] Spend at ${(pct * 100).toFixed(1)}% of limit. ` +
        `Auto-downgrading all agents to claude-haiku-4-5.`
    );
    setModelOverride("claude-haiku-4-5");
  } else if (pct >= SPEND_LIMITS.warningPct) {
    console.warn(
      `[@GUARDIAN] Spend warning: $${todaySpend.toFixed(4)} / $${DAILY_LIMIT} ` +
        `(${(pct * 100).toFixed(1)}%)`
    );
  }
}

export async function getTodaySpend(): Promise<number> {
  const now = Date.now();
  if (now < cacheExpiry) {
    return cachedSpend;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const result = await db.agentSpendLog.aggregate({
    where: {
      createdAt: { gte: today, lt: tomorrow },
      environment: ENV,
    },
    _sum: { costUsd: true },
  });

  cachedSpend = result._sum.costUsd ?? 0;
  cacheExpiry = now + CACHE_TTL_MS;
  return cachedSpend;
}

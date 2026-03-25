// @version 0.9.0 - Lens: admin agent status + spend page
// @version 1.3.0 - Nexus: added Growth Strategy section
// founding_table only — client-side guard
"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/stores/useUserStore";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { AdminDataTable } from "@/components/admin/AdminDataTable";
import { SpendMeter } from "@/components/admin/SpendMeter";
import { LoadingState } from "@/components/ui/LoadingState";

interface DailySpendSummary {
  date: string;
  totalCostUsd: number;
  byAgent: Record<string, number>;
  callCount: number;
  limitUsd: number;
  percentUsed: number;
  status: "normal" | "warning" | "critical" | "downgraded";
}

interface SpendLog {
  id: string;
  agent: string;
  model: string;
  action: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  durationMs: number;
  success: boolean;
  error: string | null;
  createdAt: string;
}

// Default models per agent from COUNCIL_AGENTS.md
const AGENT_DEFAULT_MODELS: Record<string, string> = {
  "@SAGE": "claude-sonnet-4-6",
  "@COORDINATOR": "claude-sonnet-4-6",
  "@COMMUNICATOR": "claude-sonnet-4-6",
  "@ANALYST": "claude-sonnet-4-6",
  "@STRATEGIST": "claude-opus-4-6",
  "@GUARDIAN": "claude-haiku-4-5",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function AdminAgentsPage() {
  const router = useRouter();
  const user = useUserStore((s) => s.user);
  const isLoading = useUserStore((s) => s.isLoading);

  const [summary, setSummary] = useState<DailySpendSummary | null>(null);
  const [recentLogs, setRecentLogs] = useState<SpendLog[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [strategy, setStrategy] = useState<{
    topOpportunities: Array<{
      city: string;
      currentInterest: number;
      recommendedAction: string;
      suggestedCadence: string;
      priorityScore: number;
    }>;
    globalInsights: string[];
    nextActions: string[];
  } | null>(null);
  const [strategyLoading, setStrategyLoading] = useState(false);

  // founding_table guard
  useEffect(() => {
    if (!isLoading && user?.tier !== "founding_table") {
      router.replace("/admin/events");
    }
  }, [isLoading, user, router]);

  // Fetch both endpoints in parallel
  useEffect(() => {
    if (isLoading || user?.tier !== "founding_table") return;

    Promise.all([
      fetch("/api/guardian/spend").then((r) => r.json()),
      fetch("/api/admin/system/agents").then((r) => r.json()),
    ])
      .then(([spendRes, agentsRes]) => {
        setSummary(
          (spendRes as { summary: DailySpendSummary }).summary ?? null
        );
        setRecentLogs(
          (agentsRes as { data: { recentLogs: SpendLog[] } }).data
            ?.recentLogs ?? []
        );
        setDataLoading(false);
      })
      .catch(() => setDataLoading(false));
  }, [isLoading, user]);

  // Hooks must be called unconditionally — before early returns
  const topAgent = useMemo(() => {
    if (!summary) return "—";
    const entries = Object.entries(summary.byAgent);
    if (entries.length === 0) return "—";
    entries.sort((a, b) => b[1] - a[1]);
    return entries[0]?.[0] ?? "—";
  }, [summary]);

  const agentRows = useMemo(() => {
    if (!summary) return [];
    return Object.entries(summary.byAgent)
      .sort((a, b) => b[1] - a[1])
      .map(([agent, cost]) => [
        <span key="agent" className="font-sans text-sm font-medium text-ink">
          {agent}
        </span>,
        <span key="cost" className="font-sans text-xs text-ink-mid">
          ${cost.toFixed(4)}
        </span>,
        <span key="pct" className="font-sans text-xs text-ink-light">
          {summary.totalCostUsd > 0
            ? ((cost / summary.totalCostUsd) * 100).toFixed(1)
            : "0.0"}
          %
        </span>,
        <span key="model" className="font-sans text-[10px] text-ink-light font-mono">
          {summary.status === "downgraded"
            ? "claude-haiku-4-5"
            : AGENT_DEFAULT_MODELS[agent] ?? "claude-sonnet-4-6"}
        </span>,
      ]);
  }, [summary]);

  if (isLoading || user?.tier !== "founding_table") return <LoadingState />;
  if (dataLoading || !summary) return <LoadingState />;

  // Recent activity rows
  const logRows = recentLogs.map((log) => [
    <span key="time" className="font-sans text-xs text-ink-light">
      {timeAgo(log.createdAt)}
    </span>,
    <span key="agent" className="font-sans text-xs font-medium text-ink">
      {log.agent}
    </span>,
    <span key="action" className="font-sans text-xs text-ink-mid truncate max-w-[120px] inline-block">
      {log.action}
    </span>,
    <span key="model" className="font-sans text-[10px] text-ink-light font-mono">
      {log.model}
    </span>,
    <span key="in" className="font-sans text-xs text-ink-light">
      {log.inputTokens.toLocaleString()}
    </span>,
    <span key="out" className="font-sans text-xs text-ink-light">
      {log.outputTokens.toLocaleString()}
    </span>,
    <span key="cost" className="font-sans text-xs text-ink-mid">
      ${log.costUsd.toFixed(4)}
    </span>,
    log.success ? (
      <span
        key="status"
        className="inline-block font-sans text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-teal-soft text-teal"
      >
        OK
      </span>
    ) : (
      <span
        key="status"
        className="inline-block font-sans text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-coral-soft text-coral"
      >
        Failed
      </span>
    ),
  ]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="font-sans text-[10px] font-medium tracking-[0.09em] uppercase text-mustard mb-1">
          System
        </p>
        <div className="flex items-center gap-3">
          <h1 className="font-display italic font-light text-2xl text-navy leading-tight">
            Agent Status
          </h1>
          <span className="font-sans text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-navy text-white">
            Founding Table
          </span>
        </div>
      </div>

      {/* Spend meter */}
      <SpendMeter
        spent={summary.totalCostUsd}
        limit={summary.limitUsd}
        status={summary.status}
      />

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-3">
        <AdminStatCard
          label="Today's Spend"
          value={`$${summary.totalCostUsd.toFixed(4)}`}
          color="navy"
        />
        <AdminStatCard
          label="Call Count"
          value={summary.callCount}
          color="teal"
        />
        <AdminStatCard label="Top Agent" value={topAgent} color="mustard" />
        <AdminStatCard
          label="Status"
          value={summary.status.charAt(0).toUpperCase() + summary.status.slice(1)}
          color={summary.status === "normal" ? "teal" : "coral"}
        />
      </div>

      {/* Model override banner — only when downgraded */}
      {summary.status === "downgraded" && (
        <div className="bg-coral-soft border border-coral rounded-md p-4 border-l-[3px] border-l-coral">
          <p className="font-sans text-[10px] font-medium tracking-[0.09em] uppercase text-coral mb-1">
            Downgrade Active
          </p>
          <p className="font-display italic font-light text-[15px] text-navy">
            All agents currently using claude-haiku-4-5
          </p>
          <p className="font-sans text-xs text-ink-mid mt-1">
            Limit approached. Models will restore at midnight.
          </p>
        </div>
      )}

      {/* Agent breakdown table */}
      <div>
        <h2 className="font-display italic font-light text-xl text-navy mb-3">
          Agent Breakdown
        </h2>
        <AdminDataTable
          headers={["Agent", "Cost Today", "% of Total", "Model"]}
          rows={agentRows}
          emptyMessage="No agent activity today"
        />
      </div>

      {/* Recent activity table */}
      <div>
        <h2 className="font-display italic font-light text-xl text-navy mb-3">
          Recent Activity
        </h2>
        <AdminDataTable
          headers={[
            "Time",
            "Agent",
            "Action",
            "Model",
            "Tokens In",
            "Tokens Out",
            "Cost",
            "Status",
          ]}
          rows={logRows}
          emptyMessage="No recent activity"
        />
      </div>

      {/* ─── Growth Strategy (v1.3.0 Nexus) ─── */}
      <div className="border-t border-border pt-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="font-sans text-[10px] font-medium tracking-[0.09em] uppercase text-mustard mb-1">
              Regional Strategy
            </p>
            <h2 className="font-display italic font-light text-xl text-navy">
              Growth Recommendations
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-sans text-[10px] text-ink-light">
              Uses Claude Opus — cached 10 min
            </span>
            <button
              type="button"
              onClick={async () => {
                setStrategyLoading(true);
                try {
                  const res = await fetch("/api/strategist/growth");
                  const data = await res.json();
                  if (data.strategy) setStrategy(data.strategy);
                } catch {
                  // silent
                } finally {
                  setStrategyLoading(false);
                }
              }}
              disabled={strategyLoading}
              className="font-sans text-xs font-medium text-white bg-mustard rounded-full px-4 py-2 hover:bg-mustard/90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {strategyLoading ? "Consulting @STRATEGIST..." : "Generate Strategy"}
            </button>
          </div>
        </div>

        {strategyLoading && (
          <p className="font-display italic text-ink-light text-center py-8 animate-pulse">
            Consulting @STRATEGIST...
          </p>
        )}

        {strategy && !strategyLoading && (
          <div className="space-y-3">
            {strategy.topOpportunities.map((opp, i) => {
              const scoreColor =
                opp.priorityScore >= 8
                  ? "bg-teal-soft text-teal"
                  : opp.priorityScore >= 5
                    ? "bg-mustard-soft text-mustard"
                    : "bg-coral-soft text-coral";

              return (
                <div
                  key={`opp-${i}`}
                  className="bg-card border border-border rounded-lg p-4 border-l-[3px] border-l-teal"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-display italic text-[15px] text-navy">
                      {opp.city}
                    </span>
                    <span
                      className={`font-sans text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${scoreColor}`}
                    >
                      {opp.priorityScore}/10
                    </span>
                  </div>
                  <p className="font-sans text-sm text-ink">
                    {opp.recommendedAction}
                  </p>
                  <p className="font-sans text-xs text-ink-light mt-1 capitalize">
                    Suggested: {opp.suggestedCadence}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

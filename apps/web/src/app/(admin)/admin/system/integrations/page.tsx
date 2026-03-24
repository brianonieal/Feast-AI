// @version 0.9.0 - Lens: admin integration health page
// founding_table only — auto-refreshes every 30 seconds
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/stores/useUserStore";
import { LoadingState } from "@/components/ui/LoadingState";

interface IntegrationResult {
  service: string;
  connected: boolean;
  latencyMs: number;
  error?: string;
}

type IntegrationStatus = "connected" | "failed" | "not_configured";

function getStatus(i: IntegrationResult): IntegrationStatus {
  if (i.error === "Not configured") return "not_configured";
  if (i.connected) return "connected";
  return "failed";
}

const STATUS_BADGE: Record<
  IntegrationStatus,
  { bg: string; text: string; label: string }
> = {
  connected: { bg: "bg-teal-soft", text: "text-teal", label: "CONNECTED" },
  failed: { bg: "bg-coral-soft", text: "text-coral", label: "FAILED" },
  not_configured: {
    bg: "bg-[var(--bg-surface)]",
    text: "text-ink-light",
    label: "NOT CONFIGURED",
  },
};

const BORDER_COLOR: Record<IntegrationStatus, string> = {
  connected: "border-l-teal",
  failed: "border-l-coral",
  not_configured: "border-l-border",
};

function timeAgoSeconds(date: Date): string {
  const secs = Math.floor((Date.now() - date.getTime()) / 1000);
  if (secs < 5) return "just now";
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  return `${mins}m ago`;
}

export default function AdminIntegrationsPage() {
  const router = useRouter();
  const user = useUserStore((s) => s.user);
  const isLoading = useUserStore((s) => s.isLoading);

  const [integrations, setIntegrations] = useState<IntegrationResult[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [, setTick] = useState(0); // force re-render for relative time

  // founding_table guard
  useEffect(() => {
    if (!isLoading && user?.tier !== "founding_table") {
      router.replace("/admin/events");
    }
  }, [isLoading, user, router]);

  const fetchIntegrations = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/system/integrations");
      const d = (await res.json()) as { data: IntegrationResult[] };
      setIntegrations(d.data ?? []);
      setLastRefreshed(new Date());
      setDataLoading(false);
    } catch {
      setDataLoading(false);
    }
  }, []);

  // Initial fetch + 30s auto-refresh
  useEffect(() => {
    if (isLoading || user?.tier !== "founding_table") return;

    fetchIntegrations();
    const interval = setInterval(fetchIntegrations, 30_000);
    return () => clearInterval(interval);
  }, [isLoading, user, fetchIntegrations]);

  // Tick every 5s to update "last refreshed" relative time
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 5000);
    return () => clearInterval(t);
  }, []);

  if (isLoading || user?.tier !== "founding_table") return <LoadingState />;
  if (dataLoading) return <LoadingState />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="font-sans text-[10px] font-medium tracking-[0.09em] uppercase text-mustard mb-1">
            System
          </p>
          <div className="flex items-center gap-3">
            <h1 className="font-display italic font-light text-2xl text-navy leading-tight">
              Integrations
            </h1>
            <span className="font-sans text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-navy text-white">
              Founding Table
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {lastRefreshed && (
            <span className="font-sans text-xs text-ink-light">
              Updated {timeAgoSeconds(lastRefreshed)}
            </span>
          )}
          <button
            type="button"
            onClick={fetchIntegrations}
            className="font-sans text-xs font-medium text-mustard border border-mustard/30 rounded-full px-4 py-1.5 hover:bg-mustard-soft transition-colors"
          >
            Refresh All
          </button>
        </div>
      </div>

      {/* Integration cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {integrations.map((integration) => {
          const status = getStatus(integration);
          const badge = STATUS_BADGE[status];
          const borderColor = BORDER_COLOR[status];

          return (
            <div
              key={integration.service}
              className={`bg-card border border-border rounded-lg p-4 border-l-[3px] ${borderColor}`}
            >
              {/* Top row: service name + status badge */}
              <div className="flex items-center justify-between mb-2">
                <p className="font-display italic font-light text-[15px] text-navy">
                  {integration.service}
                </p>
                <span
                  className={`font-sans text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${badge.bg} ${badge.text}`}
                >
                  {badge.label}
                </span>
              </div>

              {/* Latency (connected only) */}
              {status === "connected" && (
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal inline-block" />
                  <span className="font-sans text-sm text-ink-mid">
                    {integration.latencyMs}ms
                  </span>
                </div>
              )}

              {/* Error (failed only) */}
              {status === "failed" && integration.error && (
                <p className="font-sans text-xs text-coral truncate mb-1">
                  {integration.error}
                </p>
              )}

              {/* Last checked */}
              {lastRefreshed && (
                <p className="font-sans text-xs text-ink-light">
                  Last checked {timeAgoSeconds(lastRefreshed)}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
